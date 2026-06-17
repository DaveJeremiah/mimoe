import { useCallback, useEffect, useRef, useState } from "react";

export type PTTStatus = "idle" | "listening" | "denied" | "unsupported";

interface Options {
  lang?: string;
  onResult: (text: string) => void;
  handsFree?: boolean;
}

// ── Platform detection ────────────────────────────────────────────────────────

const _isIOS = typeof navigator !== "undefined" && (
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
  (window as any).navigator?.standalone === true
);

// ── iOS: getUserMedia + MediaRecorder + Azure STT ────────────────────────────

const AZURE_STT_URL = "https://zwjydluacxsbfdxhanol.supabase.co/functions/v1/azure-stt";
const AZURE_STT_KEY = "sb_publishable_qW88wOpvd4NT1OIiIaFFCA_0eD52E7q";

// Singleton AudioContext for decoding (avoids ~50ms creation overhead per call)
let _decodeCtx: AudioContext | null = null;
function getDecodeCtx(): AudioContext {
  if (!_decodeCtx || _decodeCtx.state === "closed") _decodeCtx = new AudioContext();
  return _decodeCtx;
}

function encodeWavPcm16(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const dataSize = samples.length * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const v   = new DataView(buf);
  const s   = (off: number, str: string) => { for (let i = 0; i < str.length; i++) v.setUint8(off + i, str.charCodeAt(i)); };
  s(0, "RIFF"); v.setUint32(4, 36 + dataSize, true);
  s(8, "WAVE"); s(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  s(36, "data"); v.setUint32(40, dataSize, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    const x = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(off, x < 0 ? x * 0x8000 : x * 0x7FFF, true); off += 2;
  }
  return buf;
}

// Decode MP4/AAC blob → 16-bit PCM WAV at 16 kHz.
// Uses a singleton AudioContext + JS linear interpolation instead of
// OfflineAudioContext, cutting conversion time from ~300 ms to ~30 ms.
async function blobToWav16k(blob: Blob): Promise<Blob> {
  const TARGET_SR = 16000;
  const ctx = getDecodeCtx();
  if (ctx.state === "suspended") { try { await ctx.resume(); } catch { /**/ } }
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());

  // Mix all channels to mono
  let samples: Float32Array;
  if (decoded.numberOfChannels === 1) {
    samples = decoded.getChannelData(0);
  } else {
    samples = new Float32Array(decoded.length);
    for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
      const d = decoded.getChannelData(ch);
      for (let i = 0; i < d.length; i++) samples[i] += d[i];
    }
    const n = decoded.numberOfChannels;
    for (let i = 0; i < samples.length; i++) samples[i] /= n;
  }

  // Downsample to 16 kHz via linear interpolation (synchronous, no extra context needed)
  if (decoded.sampleRate !== TARGET_SR) {
    const ratio = decoded.sampleRate / TARGET_SR;
    const out = new Float32Array(Math.round(samples.length / ratio));
    for (let i = 0; i < out.length; i++) {
      const pos = i * ratio;
      const lo  = Math.floor(pos);
      const frac = pos - lo;
      out[i] = lo + 1 < samples.length
        ? samples[lo] * (1 - frac) + samples[lo + 1] * frac
        : samples[lo];
    }
    samples = out;
  }

  return new Blob([encodeWavPcm16(samples, TARGET_SR)], { type: "audio/wav" });
}

async function transcribeViaAzure(blob: Blob, langCode: string): Promise<string | null> {
  try {
    console.log("[PTT] transcribeViaAzure size=", blob.size, "lang=", langCode);
    let audioBlob: Blob;
    try {
      audioBlob = await blobToWav16k(blob);
      console.log("[PTT] WAV size=", audioBlob.size);
    } catch (e) {
      console.error("[PTT] WAV conversion failed, using original:", e);
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
    console.log("[PTT] azure-stt status=", res.status);
    if (!res.ok) {
      console.error("[PTT] azure-stt error=", await res.text().catch(() => ""));
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

export function usePushToTalkMic({ lang = "fr-FR", onResult, handsFree = false }: Options) {
  const [status, setStatus] = useState<PTTStatus>("idle");

  const onResultRef   = useRef(onResult);
  const langRef       = useRef(lang);
  const handsFreeRef  = useRef(handsFree);
  useEffect(() => { onResultRef.current  = onResult;  }, [onResult]);
  useEffect(() => { langRef.current      = lang;       }, [lang]);
  useEffect(() => { handsFreeRef.current = handsFree;  }, [handsFree]);

  // ── iOS refs ──────────────────────────────────────────────────────────────
  const iosStreamRef   = useRef<MediaStream | null>(null);
  const iosRecorderRef = useRef<MediaRecorder | null>(null);
  const iosChunksRef   = useRef<Blob[]>([]);
  const iosGenRef      = useRef(0);

  useEffect(() => {
    if (!_isIOS) return;
    return () => {
      iosStreamRef.current?.getTracks().forEach(t => t.stop());
      iosStreamRef.current = null;
    };
  }, []);

  const iosStop = useCallback(async () => {
    const gen      = iosGenRef.current;
    const recorder = iosRecorderRef.current;
    iosRecorderRef.current = null;
    console.log("[PTT] iosStop gen=", gen, "state=", recorder?.state);

    if (!recorder || recorder.state === "inactive") { setStatus("idle"); return; }

    const chunks = await Promise.race([
      new Promise<Blob[]>(resolve => {
        const collected = iosChunksRef.current;
        recorder.ondataavailable = (e) => { if (e.data.size > 0) collected.push(e.data); };
        recorder.onstop = () => resolve([...collected]);
        try { recorder.stop(); } catch { resolve([...iosChunksRef.current]); }
      }),
      new Promise<Blob[]>(resolve =>
        setTimeout(() => {
          console.log("[PTT] onstop timeout, using buffered chunks");
          resolve([...iosChunksRef.current]);
        }, 1500)
      ),
    ]);

    iosChunksRef.current = [];
    iosStreamRef.current?.getTracks().forEach(t => t.stop());
    iosStreamRef.current = null;

    const totalBytes = chunks.reduce((s, c) => s + c.size, 0);
    console.log("[PTT] chunks=", chunks.length, "totalBytes=", totalBytes);
    setStatus("idle");

    if (gen !== iosGenRef.current || chunks.length === 0) return;

    const mimeType = chunks[0]?.type || "audio/mp4";
    const blob = new Blob(chunks, { type: mimeType });
    const text = await transcribeViaAzure(blob, langRef.current);
    console.log("[PTT] final text=", text);
    if (text && gen === iosGenRef.current) onResultRef.current(text);
  }, []);

  const iosStart = useCallback(async () => {
    const gen = ++iosGenRef.current;
    console.log("[PTT] iosStart gen=", gen, "handsFree=", handsFreeRef.current);

    iosStreamRef.current?.getTracks().forEach(t => t.stop());
    iosStreamRef.current = null;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const track = stream.getAudioTracks()[0];
      console.log("[PTT] getUserMedia OK, muted=", track?.muted, "enabled=", track?.enabled);
      if (iosGenRef.current !== gen) { stream.getTracks().forEach(t => t.stop()); return; }
      iosStreamRef.current = stream;
    } catch (err: any) {
      console.error("[PTT] getUserMedia error:", err?.name);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") setStatus("denied");
      return;
    }

    const mimeType =
      MediaRecorder.isTypeSupported("audio/mp4")              ? "audio/mp4" :
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
      undefined;

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    iosChunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) iosChunksRef.current.push(e.data); };
    iosRecorderRef.current = recorder;
    recorder.start(100);
    console.log("[PTT] recording started mimeType=", mimeType);
    if (iosGenRef.current === gen) setStatus("listening");

    // Safety auto-stop (15 s for PTT, 10 s for hands-free)
    const maxMs = handsFreeRef.current ? 10000 : 15000;
    setTimeout(() => { if (iosGenRef.current === gen) void iosStop(); }, maxMs);

    // ── Hands-free VAD ────────────────────────────────────────────────────
    // AnalyserNode monitors audio levels; auto-stops when speech is detected
    // then followed by 1.5 s of silence.
    if (handsFreeRef.current) {
      try {
        const vadCtx     = new AudioContext();
        const source     = vadCtx.createMediaStreamSource(stream);
        const analyser   = vadCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.4;
        source.connect(analyser);
        const buf = new Float32Array(analyser.fftSize);

        let spoken       = false;
        let silenceCount = 0;
        const SPEECH_RMS  = 0.025; // ~-32 dBFS — clearly audible speech
        const SILENCE_MAX = 15;    // 15 × 100 ms = 1.5 s silence cutoff

        const vadTimer = setInterval(() => {
          if (iosGenRef.current !== gen) {
            clearInterval(vadTimer);
            source.disconnect();
            vadCtx.close();
            return;
          }
          analyser.getFloatTimeDomainData(buf);
          let rms = 0;
          for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
          rms = Math.sqrt(rms / buf.length);

          if (rms > SPEECH_RMS) {
            spoken = true;
            silenceCount = 0;
          } else if (spoken) {
            silenceCount++;
            if (silenceCount >= SILENCE_MAX) {
              clearInterval(vadTimer);
              source.disconnect();
              vadCtx.close();
              void iosStop();
            }
          }
        }, 100);
      } catch (vadErr) {
        console.warn("[PTT] VAD setup failed:", vadErr);
      }
    }
  }, [iosStop]);

  const iosCancel = useCallback(() => {
    iosGenRef.current++;
    const recorder = iosRecorderRef.current;
    iosRecorderRef.current = null;
    iosChunksRef.current = [];
    if (recorder && recorder.state !== "inactive") { try { recorder.stop(); } catch { /**/ } }
    iosStreamRef.current?.getTracks().forEach(t => t.stop());
    iosStreamRef.current = null;
    setStatus("idle");
  }, []);

  // ── Non-iOS: Web Speech API ───────────────────────────────────────────────

  const recRef       = useRef<any>(null);
  const latestRef    = useRef("");
  const isHoldingRef = useRef(false);

  const doStart = useCallback((attempt: number) => {
    // PTT: must be holding; hands-free: always allowed
    if (!handsFreeRef.current && !isHoldingRef.current) return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setStatus("unsupported"); return; }

    latestRef.current = "";
    const rec = new SR();
    rec.lang           = langRef.current;
    // PTT: continuous (accumulate while holding); hands-free: stop after first utterance
    rec.continuous     = !handsFreeRef.current;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => { setStatus("listening"); };

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
        // In hands-free: don't auto-restart here; Flashcard re-triggers after TTS finishes
      } else if ((handsFreeRef.current || isHoldingRef.current) && attempt < MAX_RETRIES) {
        setStatus("idle");
        const delay = attempt === 0 ? 1200 : attempt < 3 ? 800 : 600;
        setTimeout(() => {
          if (handsFreeRef.current || isHoldingRef.current) doStart(attempt + 1);
        }, delay);
      } else {
        setStatus("idle");
      }
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      recRef.current = null;
      if ((handsFreeRef.current || isHoldingRef.current) && attempt < MAX_RETRIES) {
        const delay = attempt === 0 ? 1200 : attempt < 3 ? 800 : 600;
        setTimeout(() => {
          if (handsFreeRef.current || isHoldingRef.current) doStart(attempt + 1);
        }, delay);
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
    if (handsFreeRef.current) return; // in hands-free, VAD / recognition ends itself
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
    try { rec.abort(); } catch { /**/ }
    setStatus("idle");
  }, [iosCancel]);

  useEffect(() => {
    return () => {
      isHoldingRef.current = false;
      if (recRef.current) { try { recRef.current.abort(); } catch { /**/ } recRef.current = null; }
    };
  }, []);

  return { status, start, stop, cancel };
}
