import { useRef, useState, useEffect } from "react";
import { Mic, Square, Upload, Play, Trash2 } from "lucide-react";

interface Props {
  value?: string;                       // existing data URI, if any
  onChange: (dataUri: string | undefined) => void;
  disabled?: boolean;
}

// Keep clips small — they're stored inline as base64 on the collection entry.
const MAX_BYTES = 1_500_000; // ~1.5 MB of audio

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export function AudioRecorderInput({ value, onChange, disabled }: Props) {
  const [recording, setRecording] = useState(false);
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size > MAX_BYTES) { setErr("Recording too long — keep it short"); return; }
        onChange(await blobToDataUri(blob));
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
    if (!file.type.startsWith("audio/")) { setErr("Pick an audio file"); return; }
    if (file.size > MAX_BYTES) { setErr("File too large (max 1.5 MB)"); return; }
    onChange(await blobToDataUri(file));
  };

  const preview = () => { if (value) new Audio(value).play().catch(() => {}); };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {value ? (
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
            <Square className="w-3 h-3" fill="currentColor" /> Stop
          </button>
        ) : (
          <>
            <button
              type="button" onClick={startRecording} disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
              style={{ background: "rgba(129,140,248,0.1)", color: "rgba(165,180,252,0.85)", border: "1px solid rgba(129,140,248,0.22)" }}
            >
              <Mic className="w-3 h-3" /> Record
            </button>
            <button
              type="button" onClick={() => fileRef.current?.click()} disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <Upload className="w-3 h-3" /> Upload
            </button>
            <input ref={fileRef} type="file" accept="audio/*" onChange={onUpload} className="hidden" />
          </>
        )}
      </div>
      {err && <span className="text-[10px] text-red-400 pl-1">{err}</span>}
    </div>
  );
}
