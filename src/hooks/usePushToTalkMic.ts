import { useCallback, useEffect, useRef, useState } from "react";

export type PTTStatus = "idle" | "listening" | "denied" | "unsupported";

interface Options {
  lang?: string;
  onResult: (text: string) => void;
}

/**
 * Push-to-talk speech recognition hook.
 *
 * Call `start()` on pointer-down and `stop()` on pointer-up / pointer-leave.
 * The recognition result is delivered via `onResult` once the recognition
 * session ends (i.e. after `stop()` triggers the final `onend` event).
 *
 * Because every `start()` is a direct response to a user gesture, iOS Safari
 * grants mic access reliably — no retry loops or audio-session juggling needed.
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
      // Accumulate all result segments into one transcript
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

    // `onend` fires after `rec.stop()` finishes processing — this is where
    // we deliver the final transcript.
    rec.onend = () => {
      recRef.current = null;
      setStatus("idle");
      const text = latestRef.current.trim();
      latestRef.current = "";
      if (text) onResultRef.current(text);
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setStatus("idle");
    }
  }, [lang]);

  /** Stop recording gracefully — triggers `onend` which delivers the result. */
  const stop = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      recRef.current = null;
      setStatus("idle");
    }
  }, []);

  /** Abort without delivering a result (e.g. pointer cancelled mid-press). */
  const cancel = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    recRef.current    = null;
    latestRef.current = "";
    try { rec.abort(); } catch { /* ignore */ }
    setStatus("idle");
  }, []);

  // Abort on unmount so we don't fire stale results
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
