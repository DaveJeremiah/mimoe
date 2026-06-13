import { useCallback, useEffect, useRef, useState } from "react";

export type PTTStatus = "idle" | "listening" | "denied" | "unsupported";

interface Options {
  lang?: string;
  onResult: (text: string) => void;
}

// iOS / PWA holds the AVAudioSession after <audio> playback for up to ~1.5s.
// During that window SpeechRecognition either:
//   a) throws synchronously from rec.start(), OR
//   b) fires onerror("audio-capture" | "aborted") → then onend with no text.
// We handle both cases with an isHolding-gated retry loop (up to MAX_RETRIES).
//
// iOS also doesn't honour continuous:true — recognition always stops after
// one utterance (silence timeout). So we restart automatically if the user
// is still holding after a successful delivery.
const _isIOS = typeof navigator !== "undefined" && (
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
  (typeof window !== "undefined" && (
    (window.navigator as any).standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches
  ))
);

const MAX_RETRIES = 8; // enough for the full AVAudioSession drain cycle

export function usePushToTalkMic({ lang = "fr-FR", onResult }: Options) {
  const [status, setStatus] = useState<PTTStatus>("idle");

  const recRef       = useRef<any>(null);
  const latestRef    = useRef("");
  const isHoldingRef = useRef(false); // true while user holds the button
  const onResultRef  = useRef(onResult);
  const langRef      = useRef(lang);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { langRef.current = lang; }, [lang]);

  /**
   * Internal: create + start one SpeechRecognition attempt.
   * `attempt` 0 = first try (from user gesture), 1+ = retries.
   */
  const doStart = useCallback((attempt: number) => {
    if (!isHoldingRef.current) return; // user already released

    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) { setStatus("unsupported"); return; }

    latestRef.current = "";

    const rec = new SR();
    rec.lang            = langRef.current;
    // iOS ignores continuous:true — set false explicitly so behaviour is
    // consistent; we manually restart while isHoldingRef remains true.
    rec.continuous      = !_isIOS;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      if (isHoldingRef.current) setStatus("listening");
    };

    rec.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      latestRef.current = text.trim();
    };

    let permissionDenied = false;

    rec.onerror = (event: any) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        permissionDenied = true;
        setStatus("denied");
        isHoldingRef.current = false;
        recRef.current = null;
        latestRef.current = "";
        return;
      }
      // "audio-capture" / "aborted" / "network" etc. — let onend handle retry.
    };

    rec.onend = () => {
      if (recRef.current === rec) recRef.current = null;
      if (permissionDenied) { latestRef.current = ""; return; }

      const text = latestRef.current.trim();
      latestRef.current = "";

      if (text) {
        // Delivered a real result.
        setStatus("idle");
        onResultRef.current(text);

        // iOS stops after one utterance even with continuous:true.
        // Restart silently so the user can keep speaking while still holding.
        if (_isIOS && isHoldingRef.current) {
          setTimeout(() => {
            if (isHoldingRef.current) doStart(0);
          }, 120); // short gap — no audio-session conflict here
        }
      } else if (isHoldingRef.current && attempt < MAX_RETRIES) {
        // Empty result while user is still holding — audio-session conflict.
        // Retry with back-off: longer first gap, then steady.
        setStatus("idle");
        const delay = attempt === 0 ? 1200 : attempt < 3 ? 800 : 600;
        setTimeout(() => {
          if (isHoldingRef.current) doStart(attempt + 1);
        }, delay);
      } else {
        setStatus("idle");
      }
    };

    recRef.current = rec;

    try {
      rec.start();
    } catch {
      // Synchronous throw — iOS audio-session not yet released.
      recRef.current = null;
      if (isHoldingRef.current && attempt < MAX_RETRIES) {
        const delay = attempt === 0 ? 1200 : attempt < 3 ? 800 : 600;
        setTimeout(() => {
          if (isHoldingRef.current) doStart(attempt + 1);
        }, delay);
      } else {
        setStatus("idle");
      }
    }
  }, []); // deps: none — all mutable values via refs

  /** Call from onPointerDown — must be inside a user gesture. */
  const start = useCallback(() => {
    if (recRef.current) return;
    isHoldingRef.current = true;
    doStart(0);
  }, [doStart]);

  /** Call from onPointerUp / onPointerLeave — delivers the result. */
  const stop = useCallback(() => {
    isHoldingRef.current = false; // block any pending retries
    const rec = recRef.current;
    if (!rec) return;
    try {
      rec.stop(); // triggers onend → delivers transcript
    } catch {
      recRef.current = null;
      setStatus("idle");
    }
  }, []);

  /** Call from onPointerCancel — discards the result. */
  const cancel = useCallback(() => {
    isHoldingRef.current = false; // block any pending retries
    const rec = recRef.current;
    if (!rec) return;
    recRef.current    = null;
    latestRef.current = "";
    try { rec.abort(); } catch { /* ignore */ }
    setStatus("idle");
  }, []);

  // Abort on unmount
  useEffect(() => {
    return () => {
      isHoldingRef.current = false;
      const rec = recRef.current;
      if (rec) {
        recRef.current = null;
        try { rec.abort(); } catch { /* ignore */ }
      }
    };
  }, []);

  return { status, start, stop, cancel };
}
