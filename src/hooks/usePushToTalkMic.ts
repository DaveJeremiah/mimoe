import { useCallback, useEffect, useRef, useState } from "react";

export type PTTStatus = "idle" | "listening" | "denied" | "unsupported";

interface Options {
  lang?: string;
  onResult: (text: string) => void;
}

// iOS (including PWA) holds the audio session after <audio> playback for
// ~500-700ms.  If the user taps the PTT button during that window,
// rec.start() throws synchronously.  Since permission is already granted,
// the retry doesn't need to happen inside the original gesture — a
// setTimeout retry is sufficient.
const _isIOS = typeof navigator !== "undefined" && (
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
  (typeof window !== "undefined" && (
    (window.navigator as any).standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches
  ))
);
// PWA mode needs a slightly longer delay than plain Safari.
const IOS_RETRY_MS = _isIOS ? 750 : 0;

/**
 * Push-to-talk speech recognition hook.
 *
 * Call `start()` on pointer-down and `stop()` on pointer-up / pointer-leave.
 * The recognition result is delivered via `onResult` once the recognition
 * session ends (i.e. after `stop()` triggers the final `onend` event).
 */
export function usePushToTalkMic({ lang = "fr-FR", onResult }: Options) {
  const [status, setStatus] = useState<PTTStatus>("idle");

  const recRef      = useRef<any>(null);
  const latestRef   = useRef("");
  const onResultRef = useRef(onResult);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  /** Begin recording — must be called from a user gesture (pointer/touch event). */
  const start = useCallback(() => {
    if (recRef.current) return; // already recording

    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) { setStatus("unsupported"); return; }

    latestRef.current = "";

    const rec = new SR();
    rec.lang            = lang;
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => setStatus("listening");

    rec.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      latestRef.current = text.trim();
    };

    rec.onerror = (event: any) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setStatus("denied");
      } else {
        setStatus("idle");
      }
      recRef.current    = null;
      latestRef.current = "";
    };

    // `onend` fires after `rec.stop()` finishes processing — deliver result here.
    rec.onend = () => {
      recRef.current = null;
      setStatus("idle");
      const text = latestRef.current.trim();
      latestRef.current = "";
      if (text) onResultRef.current(text);
    };

    // Assign BEFORE calling start so that stop/cancel can abort the iOS retry.
    recRef.current = rec;

    const tryStart = () => {
      // If the user released before the retry fired, bail out.
      if (recRef.current !== rec) return;
      try {
        rec.start();
      } catch {
        // Initial attempt failed (iOS audio-session still held by TTS).
        // Retry once after iOS_RETRY_MS — permission is already granted so
        // the retry doesn't need to happen inside the original gesture.
        if (IOS_RETRY_MS > 0 && recRef.current === rec) {
          setTimeout(() => {
            if (recRef.current !== rec) return; // user released — abort
            try {
              rec.start();
            } catch {
              recRef.current = null;
              setStatus("idle");
            }
          }, IOS_RETRY_MS);
        } else {
          recRef.current = null;
          setStatus("idle");
        }
      }
    };

    tryStart();
  }, [lang]);

  /** Stop recording gracefully — triggers `onend` which delivers the result. */
  const stop = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      // rec.stop() throws if recognition hasn't started yet (e.g. still in
      // the iOS retry window).  Clear the ref so the retry knows to abort.
      recRef.current = null;
      setStatus("idle");
    }
  }, []);

  /** Abort without delivering a result (e.g. pointer cancelled mid-press). */
  const cancel = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    recRef.current    = null; // clear first so retry aborts
    latestRef.current = "";
    try { rec.abort(); } catch { /* ignore */ }
    setStatus("idle");
  }, []);

  // Abort on unmount
  useEffect(() => {
    return () => {
      const rec = recRef.current;
      if (rec) {
        recRef.current = null;
        try { rec.abort(); } catch { /* ignore */ }
      }
    };
  }, []);

  return { status, start, stop, cancel };
}
