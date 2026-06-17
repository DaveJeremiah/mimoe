import { useCallback, useEffect, useRef, useState } from "react";

export type PTTStatus = "idle" | "listening" | "denied" | "unsupported";

interface Options {
  lang?: string;
  onResult: (text: string) => void;
}

// ── Platform detection ────────────────────────────────────────────────────────

const _isIOS = typeof navigator !== "undefined" && (
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  // iPad in "Request Desktop Website" mode: MacIntel UA + touch points
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
  // iOS Safari PWA (window.navigator.standalone is iOS-only — Android doesn't have it)
  (window as any).navigator?.standalone === true
  // NOTE: display-mode: standalone intentionally excluded — Android PWAs match it too
);

// ── iOS: getUserMedia + MediaRecorder + Whisper ───────────────────────────────
//
// Root cause of "button does nothing after TTS plays":
//   webkitSpeechRecognition requests exclusive AVAudioSession ".record" mode.
//   After <audio> TTS finishes, iOS holds ".playback" for ~1.5 s during teardown.
//   The two modes conflict → recognition silently fails.
//
// Fix:
//   Keep a getUserMedia stream open at all times → iOS stays in ".playAndRecord"
//   mode → TTS audio and mic recording coexist with no conflict window.
//   We record with MediaRecorder and transcribe via Whisper on button release.

function mimeToFilename(mimeType: string): string {
  if (mimeType.includes("webm")) return "audio.webm";
  if (mimeType.includes("ogg"))  return "audio.ogg";
  // audio/mp4, video/mp4, audio/m4a, audio/x-m4a → all work as m4a for Whisper
  return "audio.m4a";
}

// Same project that hosts azure-tts — hardcoded like speechUtils.ts does it.
const WHISPER_URL = "https://zwjydluacxsbfdxhanol.supabase.co/functions/v1/whisper-stt";
const WHISPER_KEY = "sb_publishable_qW88wOpvd4NT1OIiIaFFCA_0eD52E7q";

async function transcribeViaWhisper(blob: Blob, langCode: string): Promise<string | null> {
  try {
    const lang = langCode.split("-")[0];
    console.log("[PTT] transcribeViaWhisper blob size=", blob.size, "type=", blob.type, "lang=", lang);

    const form = new FormData();
    form.append("file", blob, mimeToFilename(blob.type));
    form.append("model", "whisper-1");
    form.append("language", lang);

    const res = await fetch(WHISPER_URL, {
      method: "POST",
      headers: { apikey: WHISPER_KEY },
      body: form,
    });

    console.log("[PTT] whisper response status=", res.status);
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[PTT] whisper error body=", errText);
      return null;
    }
    const json = await res.json() as { text?: string };
    console.log("[PTT] whisper result=", json.text);
    return json.text?.trim() || null;
  } catch (err) {
    console.error("[PTT] transcribeViaWhisper exception:", err);
    return null;
  }
}

// ── Non-iOS: Web Speech API ───────────────────────────────────────────────────

const MAX_RETRIES = 8;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePushToTalkMic({ lang = "fr-FR", onResult }: Options) {
  const [status, setStatus] = useState<PTTStatus>("idle");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { console.log("[PTT] mounted, _isIOS=", _isIOS, "lang=", lang); }, []);

  const onResultRef = useRef(onResult);
  const langRef     = useRef(lang);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { langRef.current = lang; }, [lang]);

  // ── iOS refs ─────────────────────────────────────────────────────────────
  const iosStreamRef   = useRef<MediaStream | null>(null);
  const iosRecorderRef = useRef<MediaRecorder | null>(null);
  const iosChunksRef   = useRef<Blob[]>([]);
  // Incremented on cancel so any in-flight async stop/transcription is discarded.
  const iosGenRef      = useRef(0);

  // Cleanup: stop any open iOS stream on unmount
  useEffect(() => {
    if (!_isIOS) return;
    return () => {
      iosStreamRef.current?.getTracks().forEach(t => t.stop());
      iosStreamRef.current = null;
    };
  }, []);

  const iosStart = useCallback(async () => {
    const gen = ++iosGenRef.current;
    console.log("[PTT] iosStart gen=", gen, "isIOS=", _isIOS);

    // Always call getUserMedia fresh within this gesture (onPointerDown).
    // A pre-warmed stream acquired without a gesture has a muted audio track on
    // iOS Safari — stream.active is true but the mic captures silence.
    // Stopping the previous stream first ensures no duplicate tracks.
    iosStreamRef.current?.getTracks().forEach(t => t.stop());
    iosStreamRef.current = null;

    let stream: MediaStream;
    try {
      console.log("[PTT] calling getUserMedia...");
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const track = stream.getAudioTracks()[0];
      console.log("[PTT] getUserMedia OK, active=", stream.active,
        "track.enabled=", track?.enabled, "track.muted=", track?.muted);
      if (iosGenRef.current !== gen) { stream.getTracks().forEach(t => t.stop()); return; }
      iosStreamRef.current = stream;
    } catch (err: any) {
      console.error("[PTT] getUserMedia error:", err?.name, err?.message);
      const name: string = err?.name ?? "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") setStatus("denied");
      return;
    }

    const mimeType =
      MediaRecorder.isTypeSupported("audio/mp4")               ? "audio/mp4" :
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus")  ? "audio/webm;codecs=opus" :
      undefined;
    console.log("[PTT] mimeType=", mimeType);

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    iosChunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) iosChunksRef.current.push(e.data); };
    iosRecorderRef.current = recorder;
    recorder.start(100); // 100 ms timeslice so chunks accumulate on short presses
    console.log("[PTT] MediaRecorder started, state=", recorder.state);
    if (iosGenRef.current === gen) setStatus("listening");

    // Safety: auto-stop after 15 s so the mic never runs away
    setTimeout(() => { if (iosGenRef.current === gen) void iosStop(); }, 15000);
  }, []);

  const iosStop = useCallback(async () => {
    const gen      = iosGenRef.current;
    const recorder = iosRecorderRef.current;
    iosRecorderRef.current = null;
    console.log("[PTT] iosStop gen=", gen, "recorder state=", recorder?.state);

    if (!recorder || recorder.state === "inactive") { setStatus("idle"); return; }

    // iOS Safari sometimes doesn't fire onstop — race with a 1.5 s timeout
    // so the button never stays stuck in "listening" state.
    const chunks = await Promise.race([
      new Promise<Blob[]>(resolve => {
        const collected = iosChunksRef.current;
        recorder.ondataavailable = (e) => { if (e.data.size > 0) collected.push(e.data); };
        recorder.onstop = () => resolve([...collected]);
        try { recorder.stop(); } catch { resolve([...iosChunksRef.current]); }
      }),
      new Promise<Blob[]>(resolve =>
        setTimeout(() => {
          console.log("[PTT] onstop timeout — using buffered chunks");
          resolve([...iosChunksRef.current]);
        }, 1500)
      ),
    ]);
    iosChunksRef.current = [];
    // Stop the stream tracks immediately — releases the iOS mic indicator
    iosStreamRef.current?.getTracks().forEach(t => t.stop());
    iosStreamRef.current = null;

    console.log("[PTT] chunks=", chunks.length, "totalBytes=", chunks.reduce((s, c) => s + c.size, 0));

    setStatus("idle");
    if (gen !== iosGenRef.current || chunks.length === 0) {
      console.log("[PTT] iosStop: cancelled or empty, gen match=", gen === iosGenRef.current);
      return;
    }

    const mimeType = chunks[0]?.type || "audio/mp4";
    const blob = new Blob(chunks, { type: mimeType });
    const text = await transcribeViaWhisper(blob, langRef.current);
    console.log("[PTT] final text=", text);
    if (text && gen === iosGenRef.current) onResultRef.current(text);
  }, []);

  const iosCancel = useCallback(() => {
    iosGenRef.current++; // invalidates any in-flight iosStop / transcription
    const recorder = iosRecorderRef.current;
    iosRecorderRef.current = null;
    iosChunksRef.current = [];
    if (recorder && recorder.state !== "inactive") { try { recorder.stop(); } catch { } }
    iosStreamRef.current?.getTracks().forEach(t => t.stop());
    iosStreamRef.current = null;
    setStatus("idle");
  }, []);

  // ── Non-iOS: Web Speech API ───────────────────────────────────────────────

  const recRef       = useRef<any>(null);
  const latestRef    = useRef("");
  const isHoldingRef = useRef(false);

  const doStart = useCallback((attempt: number) => {
    if (!isHoldingRef.current) return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setStatus("unsupported"); return; }

    latestRef.current = "";
    const rec = new SR();
    rec.lang            = langRef.current;
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => { if (isHoldingRef.current) setStatus("listening"); };

    rec.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
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
      }
    };

    rec.onend = () => {
      if (recRef.current === rec) recRef.current = null;
      if (permissionDenied) { latestRef.current = ""; return; }
      const text = latestRef.current.trim();
      latestRef.current = "";
      if (text) {
        setStatus("idle");
        onResultRef.current(text);
      } else if (isHoldingRef.current && attempt < MAX_RETRIES) {
        setStatus("idle");
        const delay = attempt === 0 ? 1200 : attempt < 3 ? 800 : 600;
        setTimeout(() => { if (isHoldingRef.current) doStart(attempt + 1); }, delay);
      } else {
        setStatus("idle");
      }
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      recRef.current = null;
      if (isHoldingRef.current && attempt < MAX_RETRIES) {
        const delay = attempt === 0 ? 1200 : attempt < 3 ? 800 : 600;
        setTimeout(() => { if (isHoldingRef.current) doStart(attempt + 1); }, delay);
      } else {
        setStatus("idle");
      }
    }
  }, []);

  // ── Public API ────────────────────────────────────────────────────────────

  const start = useCallback(() => {
    if (_isIOS) { void iosStart(); return; }
    if (recRef.current) return;
    isHoldingRef.current = true;
    doStart(0);
  }, [doStart, iosStart]);

  const stop = useCallback(() => {
    if (_isIOS) { void iosStop(); return; }
    isHoldingRef.current = false;
    const rec = recRef.current;
    if (!rec) return;
    try { rec.stop(); } catch { recRef.current = null; setStatus("idle"); }
  }, [iosStop]);

  const cancel = useCallback(() => {
    if (_isIOS) { iosCancel(); return; }
    isHoldingRef.current = false;
    const rec = recRef.current;
    if (!rec) return;
    recRef.current = null;
    latestRef.current = "";
    try { rec.abort(); } catch { }
    setStatus("idle");
  }, [iosCancel]);

  useEffect(() => {
    return () => {
      isHoldingRef.current = false;
      if (recRef.current) { try { recRef.current.abort(); } catch { } recRef.current = null; }
    };
  }, []);

  return { status, start, stop, cancel };
}
