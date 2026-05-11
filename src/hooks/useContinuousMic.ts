import { useCallback, useEffect, useRef, useState } from "react";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

type MicStatus = "idle" | "listening" | "denied" | "unsupported" | "paused";

interface UseContinuousMicOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  sttLang?: string;
}

async function fetchAzureToken(): Promise<{ token: string; region: string } | null> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.functions.invoke("azure-speech-token", {
      method: "POST",
    });
    if (error || !data?.token) {
      console.warn("Azure token fetch failed:", error);
      return null;
    }
    return data as { token: string; region: string };
  } catch (e) {
    console.warn("Azure token error:", e);
    return null;
  }
}

export function useContinuousMic({ onTranscript, sttLang = "fr-FR" }: UseContinuousMicOptions) {
  const [status, setStatus] = useState<MicStatus>("idle");
  const recognizerRef = useRef<SpeechSDK.SpeechRecognizer | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const enabledRef = useRef(false);
  const sttLangRef = useRef(sttLang);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const prev = sttLangRef.current;
    sttLangRef.current = sttLang;
    // If language changed while listening, restart the recognizer with the new language.
    if (prev !== sttLang && enabledRef.current) {
      const rec = recognizerRef.current;
      recognizerRef.current = null;
      enabledRef.current = false;
      const restart = async () => {
        if (rec) {
          await new Promise<void>((resolve) => {
            rec.stopContinuousRecognitionAsync(
              () => { rec.close(); resolve(); },
              () => { rec.close(); resolve(); }
            );
          });
        }
        await start();
      };
      restart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sttLang]);

  const createRecognizer = useCallback((token: string, region: string) => {
    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region);
    speechConfig.speechRecognitionLanguage = sttLangRef.current;
    speechConfig.outputFormat = SpeechSDK.OutputFormat.Detailed;

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognizing = (_sender, event) => {
      const text = event.result.text?.trim();
      if (text) onTranscriptRef.current(text, false);
    };

    recognizer.recognized = (_sender, event) => {
      if (event.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        const text = event.result.text?.trim();
        if (text) onTranscriptRef.current(text, true);
      }
    };

    recognizer.canceled = (_sender, event) => {
      if (event.reason === SpeechSDK.CancellationReason.Error) {
        console.error("Azure STT error:", event.errorDetails);
        if (event.errorDetails?.includes("1006") || event.errorDetails?.includes("auth")) {
          setStatus("denied");
          enabledRef.current = false;
        }
      }
    };

    recognizer.sessionStopped = () => {
      if (enabledRef.current) {
        setTimeout(() => {
          if (enabledRef.current) {
            try {
              recognizerRef.current?.startContinuousRecognitionAsync();
              setStatus("listening");
            } catch { /* ignore */ }
          }
        }, 300);
      }
    };

    return recognizer;
  }, []);

  const start = useCallback(async () => {
    if (enabledRef.current) return;

    const auth = await fetchAzureToken();
    if (!auth) {
      setStatus("unsupported");
      return;
    }

    try {
      const recognizer = createRecognizer(auth.token, auth.region);
      recognizerRef.current = recognizer;
      enabledRef.current = true;

      recognizer.startContinuousRecognitionAsync(
        () => setStatus("listening"),
        (err) => {
          console.error("Azure STT start error:", err);
          if (String(err).includes("1006") || String(err).includes("microphone")) {
            setStatus("denied");
          }
          enabledRef.current = false;
        }
      );
    } catch (err) {
      console.error("Failed to create recognizer:", err);
      setStatus("unsupported");
    }
  }, [createRecognizer]);

  const stop = useCallback(() => {
    enabledRef.current = false;
    const rec = recognizerRef.current;
    recognizerRef.current = null;
    if (rec) {
      rec.stopContinuousRecognitionAsync(
        () => { rec.close(); setStatus("idle"); },
        () => { rec.close(); setStatus("idle"); }
      );
    } else {
      setStatus("idle");
    }
  }, []);

  useEffect(() => {
    return () => {
      enabledRef.current = false;
      const rec = recognizerRef.current;
      recognizerRef.current = null;
      if (rec) {
        rec.stopContinuousRecognitionAsync(
          () => rec.close(),
          () => rec.close()
        );
      }
    };
  }, []);

  return { status, start, stop };
}
