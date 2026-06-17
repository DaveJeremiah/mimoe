import { useCallback, useEffect, useRef, useState } from "react";

export type PTTStatus = "idle" | "listening" | "denied" | "unsupported";

interface Options {
  lang?: string;
  onResult: (text: string) => void;
  handsFree?: boolean;
}

interface StartOpts { gesture?: boolean }

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

// Decode MP4/AAC blob → 16-bit PCM WAV at 16 kHz (synchronous resample, ~30ms).
async function blobToWav16k(blob: Blob): Promise<Blob> {
  const TARGET_SR = 16000;
  const ctx = getDecodeCtx();
  if (ctx.state === "suspended") { try { await ctx.resume(); } catch { /**/ } }
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());

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

  if (decoded.sampleRate !== TARGET_SR) {
    const ratio = decoded.sampleRate / TARGET_SR;
    const out = new Float32Array(Math.round(samples.length / ratio));
    for (let i = 0; i < out.length; i++) {
      const pos = i * ratio, lo = Math.floor(pos), frac = pos - lo;
      out[i] = lo + 1 < samples.length ? samples[lo] * (1 - frac) + samples[lo + 1] * frac : samples[lo];
    }
    samples = out;
  }

  return new Blob([encodeWavPcm16(samples, TARGET_SR)], { type: "audio/wav" });
}

async function transcribeViaAzure(blob: Blob, langCode: string): Promise<string | null> {
  try {
    let audioBlob: Blob;
    try { audioBlob = await blobToWav16k(blob); }
    catch (e) { console.error("[PTT] WAV conversion failed:", e); audioBlob = blob; }
    const form = new FormData();
    form.append("file", audioBlob, "audio.wav");
    form.append("language", langCode);
    const res = await fetch(AZURE_STT_URL, { method: "POST", headers: { apikey: AZURE_STT_KEY }, body: form });
    if (!res.ok) { console.error("[PTT] azure-stt error=", await res.text().catch(() => "")); return null; }
    const json = await res.json() as { text?: string };
    console.log("[PTT] azure-stt result=", json.text);
    return json.text?.trim() || null;
  } catch (err) {
    console.error("[PTT] transcribeViaAzure exception:", err);
    return null;
  }
}

// ── Tunables ──────────────────────────────────────────────────────────────────

const MAX_RETRIES   = 8;
const VAD_SILENCE_TICKS = 7;     // 7 × 100 ms = 700 ms of silence ends the utterance
const VAD_SPEECH_RMS    = 0.022; // ~-33 dBFS threshold for "speaking"
const ONSTOP_TIMEOUT_MS = 800;   // fallback if MediaRecorder.onstop never fires

const NEEDS_GESTURE = "NEEDS_GESTURE";

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePushToTalkMic({ lang = "fr-FR", onResult, handsFree = false }: Options) {
  const [status, setStatus] = useState<PTTStatus>("idle");
  // On iOS the first mic acquisition must come from a user gesture (otherwise the
  // track is muted). `ready` tells the UI whether a warm stream exists so it can
  // auto-listen, or whether it must prompt for one tap first.
  const [ready, setReady] = useState<boolean>(!_isIOS);

  const onResultRef  = useRef(onResult);
  const langRef      = useRef(lang);
  const handsFreeRef = useRef(handsFree);
  useEffect(() => { onResultRef.current  = onResult;  }, [onResult]);
  useEffect(() => { langRef.current      = lang;       }, [lang]);
  useEffect(() => { handsFreeRef.current = handsFree;  }, [handsFree]);

  // ── iOS refs ──────────────────────────────────────────────────────────────
  const iosStreamRef   = useRef<MediaStream | null>(null); // warm — kept open all session
  const iosRecorderRef = useRef<MediaRecorder | null>(null);
  const iosChunksRef   = useRef<Blob[]>([]);
  const iosGenRef      = useRef(0);
  const iosSafetyRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iosVadStopRef  = useRef<(() => void) | null>(null);

  // Acquire (or reuse) the warm mic stream. Throws NEEDS_GESTURE if a fresh
  // acquisition is required but this call isn't from a user gesture.
  const iosEnsureStream = useCallback(async (gesture: boolean): Promise<MediaStream> => {
    const warm  = iosStreamRef.current;
    const track = warm?.getAudioTracks()[0];

    if (warm?.active && track && track.readyState === "live") {
      // iOS temporarily mutes the mic track while AVAudioSession is in playback mode
      // (e.g. during TTS). Wait up to 700 ms for the unmute event before proceeding.
      if (track.muted) {
        await new Promise<void>(resolve => {
          const timeout = setTimeout(resolve, 700);
          track.addEventListener('unmute', () => { clearTimeout(timeout); resolve(); }, { once: true });
        });
      }
      return warm;
    }

    if (!gesture) throw new Error(NEEDS_GESTURE);

    warm?.getTracks().forEach(t => t.stop());
    iosStreamRef.current = null;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    iosStreamRef.current = stream;
    setReady(true);
    return stream;
  }, []);

  const iosStop = useCallback(async () => {
    if (iosSafetyRef.current) { clearTimeout(iosSafetyRef.current); iosSafetyRef.current = null; }
    if (iosVadStopRef.current) { iosVadStopRef.current(); iosVadStopRef.current = null; }

    const gen      = iosGenRef.current;
    const recorder = iosRecorderRef.current;
    iosRecorderRef.current = null;
    if (!recorder || recorder.state === "inactive") { setStatus("idle"); return; }

    const chunks = await Promise.race([
      new Promise<Blob[]>(resolve => {
        const collected = iosChunksRef.current;
        recorder.ondataavailable = (e) => { if (e.data.size > 0) collected.push(e.data); };
        recorder.onstop = () => resolve([...collected]);
        try { recorder.stop(); } catch { resolve([...iosChunksRef.current]); }
      }),
      new Promise<Blob[]>(resolve => setTimeout(() => resolve([...iosChunksRef.current]), ONSTOP_TIMEOUT_MS)),
    ]);
    iosChunksRef.current = [];
    // NOTE: stream tracks are intentionally NOT stopped — kept warm for instant
    // re-listen on the next card. Cleanup happens on unmount.

    setStatus("idle");
    if (gen !== iosGenRef.current || chunks.length === 0) return;

    const blob = new Blob(chunks, { type: chunks[0]?.type || "audio/mp4" });
    const text = await transcribeViaAzure(blob, langRef.current);
    if (text && gen === iosGenRef.current) onResultRef.current(text);
  }, []);

  const iosStart = useCallback(async (gesture: boolean) => {
    const gen = ++iosGenRef.current;

    let stream: MediaStream;
    try {
      stream = await iosEnsureStream(gesture);
    } catch (err: any) {
      if (err?.message === NEEDS_GESTURE) { setReady(false); setStatus("idle"); return; }
      console.error("[PTT] getUserMedia error:", err?.name);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") setStatus("denied");
      return;
    }
    if (iosGenRef.current !== gen) return;

    const mimeType =
      MediaRecorder.isTypeSupported("audio/mp4")              ? "audio/mp4" :
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : undefined;

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    iosChunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) iosChunksRef.current.push(e.data); };
    iosRecorderRef.current = recorder;
    recorder.start(100);
    if (iosGenRef.current === gen) setStatus("listening");

    if (iosSafetyRef.current) clearTimeout(iosSafetyRef.current);
    iosSafetyRef.current = setTimeout(() => { if (iosGenRef.current === gen) void iosStop(); }, 10000);

    // ── Voice-activity detection: stop after VAD_SILENCE_TICKS of silence ──
    try {
      const vadCtx   = new AudioContext();
      const source   = vadCtx.createMediaStreamSource(stream);
      const analyser = vadCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      let spoken = false, silence = 0;

      const timer = setInterval(() => {
        if (iosGenRef.current !== gen) { cleanup(); return; }
        analyser.getFloatTimeDomainData(buf);
        let rms = 0;
        for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
        rms = Math.sqrt(rms / buf.length);
        if (rms > VAD_SPEECH_RMS) { spoken = true; silence = 0; }
        else if (spoken && ++silence >= VAD_SILENCE_TICKS) { cleanup(); void iosStop(); }
      }, 100);

      const cleanup = () => {
        clearInterval(timer);
        try { source.disconnect(); } catch { /**/ }
        try { vadCtx.close(); } catch { /**/ }
      };
      iosVadStopRef.current = cleanup;
    } catch (e) {
      console.warn("[PTT] VAD setup failed:", e);
    }
  }, [iosEnsureStream, iosStop]);

  const iosCancel = useCallback(() => {
    iosGenRef.current++;
    if (iosSafetyRef.current) { clearTimeout(iosSafetyRef.current); iosSafetyRef.current = null; }
    if (iosVadStopRef.current) { iosVadStopRef.current(); iosVadStopRef.current = null; }
    const recorder = iosRecorderRef.current;
    iosRecorderRef.current = null;
    iosChunksRef.current = [];
    if (recorder && recorder.state !== "inactive") { try { recorder.stop(); } catch { /**/ } }
    // keep stream warm
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (!_isIOS) return;
    return () => {
      if (iosSafetyRef.current) clearTimeout(iosSafetyRef.current);
      if (iosVadStopRef.current) iosVadStopRef.current();
      iosStreamRef.current?.getTracks().forEach(t => t.stop());
      iosStreamRef.current = null;
    };
  }, []);

  // ── Non-iOS: Web Speech API ───────────────────────────────────────────────

  const recRef       = useRef<any>(null);
  const latestRef    = useRef("");
  const isHoldingRef = useRef(false);

  const doStart = useCallback((attempt: number) => {
    if (!handsFreeRef.current && !isHoldingRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setStatus("unsupported"); return; }

    latestRef.current = "";
    const rec = new SR();
    rec.lang            = langRef.current;
    rec.continuous      = !handsFreeRef.current; // hands-free: end after one utterance
    rec.interimResults  = true;
    rec.maxAlternatives = 1;

    rec.onstart  = () => setStatus("listening");
    rec.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
      latestRef.current = text.trim();
    };

    let permissionDenied = false;
    rec.onerror = (event: any) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        permissionDenied = true; setStatus("denied");
        isHoldingRef.current = false; recRef.current = null; latestRef.current = "";
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
      } else if ((handsFreeRef.current || isHoldingRef.current) && attempt < MAX_RETRIES) {
        setStatus("idle");
        const delay = attempt === 0 ? 800 : attempt < 3 ? 600 : 500;
        setTimeout(() => { if (handsFreeRef.current || isHoldingRef.current) doStart(attempt + 1); }, delay);
      } else {
        setStatus("idle");
      }
    };

    recRef.current = rec;
    try { rec.start(); }
    catch {
      recRef.current = null;
      if ((handsFreeRef.current || isHoldingRef.current) && attempt < MAX_RETRIES) {
        const delay = attempt === 0 ? 800 : attempt < 3 ? 600 : 500;
        setTimeout(() => { if (handsFreeRef.current || isHoldingRef.current) doStart(attempt + 1); }, delay);
      } else { setStatus("idle"); }
    }
  }, []);

  // ── Public API ────────────────────────────────────────────────────────────

  const start = useCallback((opts?: StartOpts) => {
    const gesture = !!opts?.gesture;
    if (_isIOS) { void iosStart(gesture); return; }
    if (recRef.current) return;
    isHoldingRef.current = true;
    doStart(0);
  }, [doStart, iosStart]);

  const stop = useCallback(() => {
    if (_isIOS) { void iosStop(); return; }
    if (handsFreeRef.current) {
      // finalize the current utterance immediately on a manual tap
      const rec = recRef.current;
      if (rec) { try { rec.stop(); } catch { /**/ } }
      return;
    }
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

  return { status, ready, start, stop, cancel };
}
