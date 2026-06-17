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

// ── iOS: getUserMedia + MediaRecorder + Azure STT ────────────────────────────
//
// Root cause of "button does nothing after TTS plays":
//   webkitSpeechRecognition requests exclusive AVAudioSession ".record" mode.
//   After <audio> TTS finishes, iOS holds ".playback" for ~1.5 s during teardown.
//   The two modes conflict → recognition silently fails.
//
// Fix:
//   Record with MediaRecorder → convert MP4/AAC to 16-bit PCM WAV client-side
//   via AudioContext.decodeAudioData → POST WAV to azure-stt edge function.

const AZURE_STT_URL = "https://zwjydluacxsbfdxhanol.supabase.co/functions/v1/azure-stt";
const AZURE_STT_KEY = "sb_publishable_qW88wOpvd4NT1OIiIaFFCA_0eD52E7q";

// Encode Float32 PCM samples → 16-bit little-endian WAV bytes
function encodeWavPcm16(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numSamples  = samples.length;
  const bytesPerSample = 2;
  const dataSize    = numSamples * bytesPerSample;
  const buffer      = new ArrayBuffer(44 + dataSize);
  const v           = new DataView(buffer);
  const str = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + dataSize, true);
  str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true);          // chunk size
  v.setUint16(20, 1, true);           // PCM
  v.setUint16(22, 1, true);           // mono
  v.setUint32(24, sampleRate, true);  // sample rate
  v.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  v.setUint16(32, bytesPerSample, true);
  v.setUint16(34, 16, true);          // bits per sample
  str(36, "data"); v.setUint32(40, dataSize, true);
  let off = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    off += 2;
  }
  return buffer;
}

// Decode any browser-supported audio blob → mono 16 kHz WAV
async function blobToWav16k(blob: Blob): Promise<Blob> {
  const TARGET_SR = 16000;
  const arrayBuffer = await blob.arrayBuffer();
  // OfflineAudioContext resamples to TARGET_SR during decoding
  const tmpCtx = new AudioContext();
  const decoded = await tmpCtx.decodeAudioData(arrayBuffer);
  tmpCtx.close();

  const offCtx = new OfflineAudioContext(1, Math.ceil(decoded.duration * TARGET_SR), TARGET_SR);
  const src = offCtx.createBufferSource();
  src.buffer = decoded;
  src.connect(offCtx.destination);
  src.start(0);
  const resampled = await offCtx.startRendering();
  const samples   = resampled.getChannelData(0);

  return new Blob([encodeWavPcm16(samples, TARGET_SR)], { type: "audio/wav" });
}

async function transcribeViaAzure(blob: Blob, langCode: string): Promise<string | null> {
  try {
    console.log("[PTT] transcribeViaAzure blob size=", blob.size, "type=", blob.type, "lang=", langCode);

    let audioBlob: Blob;
    try {
      audioBlob = await blobToWav16k(blob);
      console.log("[PTT] WAV converted size=", audioBlob.size);
    } catch (convErr) {
      console.error("[PTT] WAV conversion failed, sending original:", convErr);
      audioBlob = blob;
    }

    const form = new FormData();
    form.append("file", audioBlob, "audio.wav");
    form.append("language", langCode);

    const res = await fetch(AZURE_STT_URL, {
      method: "POST",
      headers: { apikey: AZURE_STT_KEY },
      body: form,
    });

    console.log("[PTT] azure-stt response status=", res.status);
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[PTT] azure-stt error body=", errText);
      return null;
    }
    const json = await res.json() as { text?: string };
    console.log("[PTT] azure-stt result=", json.text);
    return json.text?.trim() || null;
  } catch (err) {
    console.error("[PTT] transcribeViaAzure exception:", err);
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
    const text = await transcribeViaAzure(blob, langRef.current);
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
