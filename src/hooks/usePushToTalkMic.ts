import { useCallback, useEffect, useRef, useState } from "react";

export type PTTStatus = "idle" | "listening" | "denied" | "unsupported";

interface Options {
  lang?: string;
  onResult: (text: string) => void;
}

// iOS / PWA holds the AVAudioSession after <audio> playback for up to ~800ms.
// During that window SpeechRecognition either:
//   a) throws synchronously from rec.start(), OR
//   b) fires onerror("audio-capture" | "aborted") → then onend with no text.
// We handle both cases with an isHolding-gated retry loop (max 3 attempts).
const _isIOS = typeof navigator !== "undefined" && (
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
  (typeof window !== "undefined" && (
    (window.navigator as any).standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches
  ))
);

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
   * `attempt` 0 = first try (from user gesture), 1-3 = iOS retries.
   * Delay between retries: 800ms (attempt 0→1), 400ms (1→2), 400ms (2→3).
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
    rec.continuous      = true;
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

    // Track whether a permission-fatal error occurred.
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
      // "audio-capture" / "aborted" / "network" etc. — onend will fire next;
      // we handle the retry there so we only need one code path.
    };

    rec.onend = () => {
      if (recRef.current === rec) recRef.current = null;
      if (permissionDenied) { latestRef.current = ""; return; }

      const text = latestRef.current.trim();
      latestRef.current = "";

      if (text) {
        // Got a real result — deliver it.
        setStatus("idle");
        onResultRef.current(text);
      } else if (_isIOS && isHoldingRef.current && attempt < 3) {
        // iOS ended without a transcript and user is still holding.
        // This is the audio-session conflict case — retry after a delay.
        setStatus("idle");
        const delay = attempt === 0 ? 800 : 400;
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
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
      // Synchronous throw — also an iOS audio-session conflict.
      recRef.current = null;
      if (_isIOS && isHoldingRef.current && attempt < 3) {
        const delay = attempt === 0 ? 800 : 400;
        setTimeout(() => {
          if (isHoldingRef.current) doStart(attempt + 1);
        }, delay);
      } else {
        setStatus("idle");
      }
    }
  }, []); // deps: none — all mutable values accessed via refs

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
      // rec.stop() throws if recognition hasn't started yet (mid-retry gap).
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
