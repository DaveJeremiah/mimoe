import { useCallback, useEffect, useRef, useState } from "react";

type MicStatus = "idle" | "listening" | "denied" | "unsupported" | "paused";

interface UseContinuousMicOptions {
  lang?: string;
  /** Called for each interim/final transcript */
  onTranscript: (text: string, isFinal: boolean) => void;
}

/**
 * A persistent SpeechRecognition session that survives across multiple cards.
 * Auto-restarts on `onend` while `enabled` is true. Caller must invoke `start()`
 * once from a user gesture (button click) — afterwards the mic stays open.
 */
export function useContinuousMic({ lang = "fr-FR", onTranscript }: UseContinuousMicOptions) {
  const [status, setStatus] = useState<MicStatus>("idle");
  const recognitionRef = useRef<any>(null);
  const enabledRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const pausedRef = useRef(false);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const createRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 5;

    rec.onresult = (event: any) => {
      if (pausedRef.current) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript?.trim() ?? "";
        if (transcript) {
          onTranscriptRef.current(transcript, result.isFinal);
        }
      }
    };

    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        enabledRef.current = false;
        setStatus("denied");
      } else if (e.error === "no-speech" || e.error === "aborted") {
        // benign, will restart in onend
      }
    };

    rec.onend = () => {
      if (enabledRef.current) {
        // Auto-restart to keep session continuous
        try {
          rec.start();
          setStatus(pausedRef.current ? "paused" : "listening");
        } catch {
          // already started or transient — try once more shortly
          setTimeout(() => {
            if (enabledRef.current) {
              try { rec.start(); } catch { }
            }
          }, 150);
        }
      } else {
        setStatus("idle");
      }
    };

    return rec;
  }, [lang]);

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setStatus("unsupported");
      return;
    }
    if (recognitionRef.current && enabledRef.current) return;

    const rec = recognitionRef.current ?? createRecognition();
    if (!rec) return;
    recognitionRef.current = rec;
    enabledRef.current = true;
    pausedRef.current = false;

    try {
      rec.start();
      setStatus("listening");
    } catch {
      // Already running — fine
      setStatus("listening");
    }
  }, [createRecognition]);

  const stop = useCallback(() => {
    enabledRef.current = false;
    pausedRef.current = false;
    try { recognitionRef.current?.stop(); } catch { }
    recognitionRef.current = null;
    setStatus("idle");
  }, []);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    if (enabledRef.current) setStatus("listening");
  }, []);

  useEffect(() => {
    return () => {
      enabledRef.current = false;
      try { recognitionRef.current?.stop(); } catch { }
      recognitionRef.current = null;
    };
  }, []);

  return { status, start, stop, pause, resume };
}
