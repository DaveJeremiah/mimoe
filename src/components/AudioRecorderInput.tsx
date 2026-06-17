import { useRef, useState, useEffect } from "react";
import { Mic, Square, Upload, Play, Trash2 } from "lucide-react";

interface Props {
  value?: string;                       // existing data URI, if any
  onChange: (dataUri: string | undefined) => void;
  disabled?: boolean;
}

// Keep clips reasonable — they're stored inline as base64 on the collection entry.
const MAX_BYTES = 5_000_000; // ~5 MB of audio
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|webm|flac|mp4|3gp|aiff?|caf)$/i;

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// Apply high-pass filter + dynamic compression to reduce background noise and
// normalise volume. Processes offline (no real-time playback), returns WAV.
// Falls back to the original blob if anything goes wrong.
async function denoiseAudio(blob: Blob): Promise<Blob> {
  let ctx: AudioContext | null = null;
  try {
    ctx = new AudioContext();
    if (ctx.state === "suspended") await ctx.resume();
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    // Mono output — voice doesn't need stereo and halves the file size
    const offline = new OfflineAudioContext(1, decoded.length, decoded.sampleRate);

    const src = offline.createBufferSource();
    src.buffer = decoded;

    // High-pass at 80 Hz: cuts room rumble and low-frequency handling noise
    const hp = offline.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 80;
    hp.Q.value = 0.7;

    // Dynamics compressor: normalises loud/soft passages, pushes background
    // noise further below the voice signal
    const comp = offline.createDynamicsCompressor();
    comp.threshold.value = -30;
    comp.knee.value = 20;
    comp.ratio.value = 20;
    comp.attack.value = 0.001;
    comp.release.value = 0.15;

    src.connect(hp);
    hp.connect(comp);
    comp.connect(offline.destination);
    src.start();

    const rendered = await offline.startRendering();
    const samples  = rendered.getChannelData(0);

    // Noise gate with smooth attack/release — silences passages that are
    // quieter than typical speech (background hiss, room noise, etc.)
    const SR = rendered.sampleRate;
    const ATK = SR * 0.005;   // 5 ms open
    const REL = SR * 0.15;    // 150 ms close (avoids clipping mid-word)
    const GATE_OPEN  = 0.018; // ~-35 dBFS: voice above this opens gate
    const GATE_CLOSE = 0.007; // ~-43 dBFS: noise below this closes gate
    let gv = 0, gateOpen = false;
    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i]);
      if (!gateOpen && abs > GATE_OPEN)  gateOpen = true;
      if (gateOpen  && abs < GATE_CLOSE) gateOpen = false;
      gv += ((gateOpen ? 1 : 0) - gv) * (gateOpen ? 1 / ATK : 1 / REL);
      samples[i] *= Math.min(1, Math.max(0, gv));
    }

    // Encode to 16-bit PCM WAV (mono, same sample rate)
    const dataLen = samples.length * 2;
    const buf = new ArrayBuffer(44 + dataLen);
    const dv  = new DataView(buf);
    const ws  = (o: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); dv.setUint32(4, 36 + dataLen, true);
    ws(8, 'WAVE'); ws(12, 'fmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, rendered.sampleRate, true); dv.setUint32(28, rendered.sampleRate * 2, true);
    dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
    ws(36, 'data'); dv.setUint32(40, dataLen, true);
    let off = 44;
    for (let i = 0; i < samples.length; i++) {
      const x = Math.max(-1, Math.min(1, samples[i]));
      dv.setInt16(off, x < 0 ? x * 0x8000 : x * 0x7FFF, true);
      off += 2;
    }
    return new Blob([buf], { type: 'audio/wav' });
  } catch {
    return blob;
  } finally {
    try { ctx?.close(); } catch { /* ignore */ }
  }
}

export function AudioRecorderInput({ value, onChange, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [err, setErr] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    // Stop any live mic stream if the component unmounts mid-recording.
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const startRecording = async () => {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        const raw = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (raw.size > MAX_BYTES) { setErr("Recording too long — keep it short"); return; }
        setProcessing(true);
        try {
          const blob = await denoiseAudio(raw);
          onChange(await blobToDataUri(blob));
        } finally {
          setProcessing(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setErr("Mic access denied");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErr("");
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    // Many audio files (esp. .m4a) report an empty or "video/mp4" MIME type,
    // so accept by MIME OR by extension rather than requiring "audio/".
    const looksAudio =
      file.type.startsWith("audio/") ||
      file.type === "" ||
      file.type === "video/mp4" ||
      AUDIO_EXT.test(file.name);
    if (!looksAudio) { setErr("Pick an audio file"); return; }
    if (file.size > MAX_BYTES) { setErr("File too large (max 5 MB)"); return; }
    setProcessing(true);
    try {
      const blob = await denoiseAudio(file);
      onChange(await blobToDataUri(blob));
    } finally {
      setProcessing(false);
    }
  };

  const preview = () => { if (value) new Audio(value).play().catch(() => {}); };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {processing ? (
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold animate-pulse"
            style={{ background: "rgba(139,92,246,0.14)", color: "rgba(196,181,253,0.9)", border: "1px solid rgba(139,92,246,0.25)" }}
          >
            <span className="w-2.5 h-2.5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin inline-block" />
            Processing audio…
          </span>
        ) : value ? (
          <>
            <button
              type="button" onClick={preview} disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
              style={{ background: "rgba(34,197,94,0.14)", color: "rgba(134,239,172,0.9)", border: "1px solid rgba(34,197,94,0.25)" }}
            >
              <Play className="w-3 h-3" /> Your audio
            </button>
            <button
              type="button" onClick={() => onChange(undefined)} disabled={disabled}
              className="p-1.5 rounded-full hover:bg-white/8 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-white/35" />
            </button>
          </>
        ) : recording ? (
          <button
            type="button" onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold animate-pulse"
            style={{ background: "rgba(239,68,68,0.16)", color: "rgba(252,165,165,0.95)", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            <Square className="w-3 h-3" fill="currentColor" /> Tap to stop
          </button>
        ) : (
          <>
            <button
              type="button" onClick={startRecording} disabled={disabled}
              className="group relative flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold text-white overflow-hidden active:scale-95 transition-transform"
              style={{
                background: "linear-gradient(135deg,#9b5cf6 0%,#c026d3 45%,#ec4899 100%)",
                boxShadow: "0 4px 16px rgba(155,92,246,0.45)",
              }}
            >
              {/* sliding sheen */}
              <span
                className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)" }}
              />
              <span className="relative flex items-center justify-center">
                <span className="absolute w-3.5 h-3.5 rounded-full bg-white/40 animate-ping" />
                <Mic className="relative w-3 h-3" />
              </span>
              <span className="relative">Tap to record</span>
            </button>
            <button
              type="button" onClick={() => fileRef.current?.click()} disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <Upload className="w-3 h-3" /> Upload
            </button>
            <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac,.mp4,.3gp,.caf" onChange={onUpload} className="hidden" />
          </>
        )}
      </div>
      {err && <span className="text-[10px] text-red-400 pl-1">{err}</span>}
    </div>
  );
}
