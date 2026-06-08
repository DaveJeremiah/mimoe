import { useCallback, useEffect, useRef, useState } from "react";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

export type MicStatus = "idle" | "listening" | "denied" | "unsupported" | "paused";

interface UseContinuousMicOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  sttLang?: string;
}

// ── Azure helpers (kept as fallback for non-Chrome browsers) ─────────────────

async function fetchAzureToken(): Promise<{ token: string; region: string } | null> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.functions.invoke("azure-speech-token", { method: "POST" });
    if (error || !data?.token) return null;
    return data as { token: string; region: string };
  } catch {
    return null;
  }
}

export function useContinuousMic({ onTranscript, sttLang = "fr-FR" }: UseContinuousMicOptions) {
  const [status, setStatus] = useState<MicStatus>("idle");

  const recognizerRef   = useRef<SpeechSDK.SpeechRecognizer | null>(null);
  const browserRecRef   = useRef<any>(null);
  const onTranscriptRef = useRef(onTranscript);
  const enabledRef      = useRef(false);
  const sttLangRef      = useRef(sttLang);
  const generationRef   = useRef(0);
  const startingRef     = useRef(false);
  const startBrowserRef = useRef<(generation: number, attempt?: number) => boolean>();

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  // ── Browser Web Speech API (primary — no network, instant start) ──────────

  const startBrowserSTT = useCallback((generation: number, attempt = 0) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return false; // signal caller to try Azure

    const rec = new SR();
    rec.lang            = sttLangRef.current;
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;

    // Only the recognizer currently held in the ref may emit/restart — prevents
    // a stale instance from firing alongside a freshly recreated one.
    const isCurrent = () =>
      enabledRef.current && generationRef.current === generation && browserRecRef.current === rec;

    rec.onstart = () => { if (isCurrent()) setStatus("listening"); };

    rec.onresult = (event: any) => {
      if (!isCurrent()) return;
      const result = event.results[event.results.length - 1];
      const text   = result[0].transcript.trim();
      if (text) onTranscriptRef.current(text, result.isFinal);
    };

    rec.onerror = (event: any) => {
      if (!isCurrent()) return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setStatus("denied");
        enabledRef.current  = false;
        browserRecRef.current = null;
      }
      // "no-speech" / "aborted" — onend recreates a fresh recognizer below
    };

    // Browser stops after silence (and Android often won't reliably resume the
    // SAME instance). Recreate a FRESH recognizer to keep listening reliably.
    rec.onend = () => {
      if (browserRecRef.current === rec) browserRecRef.current = null;
      if (enabledRef.current && generationRef.current === generation) {
        setTimeout(() => {
          if (enabledRef.current && generationRef.current === generation && !browserRecRef.current) {
            startBrowserRef.current?.(generation);
          }
        }, 150);
      }
    };

    browserRecRef.current = rec;
    try {
      rec.start();
      return true;
    } catch {
      // iOS frequently rejects start() right after audio playback (the audio
      // session hasn't freed yet). Retry a few times with a growing delay before
      // giving up — this is what brings the mic back after TTS on iPhone.
      if (browserRecRef.current === rec) browserRecRef.current = null;
      if (attempt < 4) {
        setTimeout(() => {
          if (enabledRef.current && generationRef.current === generation && !browserRecRef.current) {
            startBrowserRef.current?.(generation, attempt + 1);
          }
        }, 350 + attempt * 250);
        return true; // handled via retry — don't fall back to Azure
      }
      return false;
    }
  }, []);

  // Keep a ref to the latest startBrowserSTT so onend/retry can recreate one.
  useEffect(() => { startBrowserRef.current = startBrowserSTT; }, [startBrowserSTT]);

  // ── Azure STT (fallback for browsers without native SpeechRecognition) ────

  const closeRecognizer = useCallback((rec: SpeechSDK.SpeechRecognizer | null) =>
    new Promise<void>((resolve) => {
      if (!rec) { resolve(); return; }
      rec.recognizing = () => {};
      rec.recognized  = () => {};
      rec.canceled    = () => {};
      rec.sessionStopped = () => {};
      rec.stopContinuousRecognitionAsync(
        () => { rec.close(); resolve(); },
        () => { rec.close(); resolve(); }
      );
    }), []);

  const startAzureSTT = useCallback(async (generation: number) => {
    const auth = await fetchAzureToken();
    if (generationRef.current !== generation || !enabledRef.current) return;
    if (!auth) { setStatus("unsupported"); enabledRef.current = false; return; }

    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(auth.token, auth.region);
    speechConfig.speechRecognitionLanguage = sttLangRef.current;
    speechConfig.outputFormat = SpeechSDK.OutputFormat.Detailed;

    const rec = new SpeechSDK.SpeechRecognizer(
      speechConfig,
      SpeechSDK.AudioConfig.fromDefaultMicrophoneInput()
    );

    const isCurrent = () =>
      enabledRef.current && generationRef.current === generation && recognizerRef.current === rec;

    rec.recognizing = (_s, e) => {
      if (!isCurrent()) return;
      const t = e.result.text?.trim();
      if (t) onTranscriptRef.current(t, false);
    };
    rec.recognized = (_s, e) => {
      if (!isCurrent()) return;
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        const t = e.result.text?.trim();
        if (t) onTranscriptRef.current(t, true);
      }
    };
    rec.canceled = (_s, e) => {
      if (!isCurrent()) return;
      if (e.reason === SpeechSDK.CancellationReason.Error &&
          (e.errorDetails?.includes("1006") || e.errorDetails?.includes("auth"))) {
        setStatus("denied");
        enabledRef.current = false;
      }
    };
    rec.sessionStopped = () => {
      if (isCurrent()) {
        setTimeout(() => {
          if (isCurrent()) {
            try { rec.startContinuousRecognitionAsync(); setStatus("listening"); } catch { /* ignore */ }
          }
        }, 300);
      }
    };

    recognizerRef.current = rec;
    rec.startContinuousRecognitionAsync(
      () => { if (generationRef.current === generation) setStatus("listening"); },
      (err) => {
        console.error("Azure STT start error:", err);
        recognizerRef.current = null;
        enabledRef.current    = false;
        setStatus("unsupported");
      }
    );
  }, [closeRecognizer]);

  // ── stop ─────────────────────────────────────────────────────────────────

  const stop = useCallback(async () => {
    startingRef.current  = false;
    enabledRef.current   = false;
    generationRef.current += 1;

    if (browserRecRef.current) {
      try { browserRecRef.current.stop(); } catch { /* ignore */ }
      browserRecRef.current = null;
    }

    const rec = recognizerRef.current;
    recognizerRef.current = null;
    await closeRecognizer(rec);
    setStatus("idle");
  }, [closeRecognizer]);

  // ── start ─────────────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    if (enabledRef.current || recognizerRef.current || browserRecRef.current || startingRef.current) return;

    const generation = generationRef.current + 1;
    generationRef.current = generation;
    startingRef.current   = true;
    enabledRef.current    = true; // claim slot immediately to block concurrent calls

    // 1. Try browser Web Speech API first (instant, no network)
    const browserStarted = startBrowserSTT(generation);
    if (browserStarted) {
      startingRef.current = false;
      return;
    }

    // 2. Browser STT not available — fall back to Azure (requires edge function + credentials)
    startingRef.current = false;
    await startAzureSTT(generation);
  }, [startBrowserSTT, startAzureSTT]);

  // ── reset (fresh listen window — start a brand-new session each card) ──────

  const reset = useCallback(async () => {
    await stop();
    await start();
  }, [start, stop]);

  // Restart when STT language changes
  useEffect(() => {
    const prev = sttLangRef.current;
    sttLangRef.current = sttLang;
    if (prev !== sttLang && enabledRef.current) void reset();
  }, [sttLang, reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      startingRef.current  = false;
      enabledRef.current   = false;
      generationRef.current += 1;
      if (browserRecRef.current) {
        try { browserRecRef.current.stop(); } catch { /* ignore */ }
        browserRecRef.current = null;
      }
      const rec = recognizerRef.current;
      recognizerRef.current = null;
      void closeRecognizer(rec);
    };
  }, [closeRecognizer]);

  return { status, start, stop, reset };
}
