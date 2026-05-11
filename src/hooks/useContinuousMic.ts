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
  const recognizerGenerationRef = useRef(0);
  const startingRef = useRef(false);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const closeRecognizer = useCallback((recognizer: SpeechSDK.SpeechRecognizer | null) => {
    return new Promise<void>((resolve) => {
      if (!recognizer) {
        resolve();
        return;
      }

      recognizer.recognizing = () => {};
      recognizer.recognized = () => {};
      recognizer.canceled = () => {};
      recognizer.sessionStopped = () => {};

      recognizer.stopContinuousRecognitionAsync(
        () => {
          recognizer.close();
          resolve();
        },
        () => {
          recognizer.close();
          resolve();
        }
      );
    });
  }, []);

  const createRecognizer = useCallback((token: string, region: string, generation: number) => {
    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region);
    speechConfig.speechRecognitionLanguage = sttLangRef.current;
    speechConfig.outputFormat = SpeechSDK.OutputFormat.Detailed;

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    const isCurrentRecognizer = () => (
      enabledRef.current &&
      recognizerGenerationRef.current === generation &&
      recognizerRef.current === recognizer
    );

    recognizer.recognizing = (_sender, event) => {
      if (!isCurrentRecognizer()) return;
      const text = event.result.text?.trim();
      if (text) onTranscriptRef.current(text, false);
    };

    recognizer.recognized = (_sender, event) => {
      if (!isCurrentRecognizer()) return;
      if (event.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        const text = event.result.text?.trim();
        if (text) onTranscriptRef.current(text, true);
      }
    };

    recognizer.canceled = (_sender, event) => {
      if (!isCurrentRecognizer()) return;
      if (event.reason === SpeechSDK.CancellationReason.Error) {
        console.error("Azure STT error:", event.errorDetails);
        if (event.errorDetails?.includes("1006") || event.errorDetails?.includes("auth")) {
          setStatus("denied");
          enabledRef.current = false;
        }
      }
    };

    recognizer.sessionStopped = () => {
      if (isCurrentRecognizer()) {
        setTimeout(() => {
          if (isCurrentRecognizer()) {
            try {
              recognizer.startContinuousRecognitionAsync();
              setStatus("listening");
            } catch { /* ignore */ }
          }
        }, 300);
      }
    };

    return recognizer;
  }, []);

  const start = useCallback(async () => {
    if (enabledRef.current || recognizerRef.current || startingRef.current) return;

    const generation = recognizerGenerationRef.current + 1;
    recognizerGenerationRef.current = generation;
    startingRef.current = true;

    const auth = await fetchAzureToken();
    if (!auth || recognizerGenerationRef.current !== generation) {
      startingRef.current = false;
      setStatus("unsupported");
      return;
    }

    try {
      const recognizer = createRecognizer(auth.token, auth.region, generation);
      if (recognizerGenerationRef.current !== generation) {
        recognizer.close();
        startingRef.current = false;
        return;
      }

      recognizerRef.current = recognizer;
      enabledRef.current = true;

      recognizer.startContinuousRecognitionAsync(
        () => {
          if (recognizerGenerationRef.current !== generation) {
            recognizer.close();
            return;
          }
          startingRef.current = false;
          setStatus("listening");
        },
        (err) => {
          console.error("Azure STT start error:", err);
          if (String(err).includes("1006") || String(err).includes("microphone")) {
            setStatus("denied");
          }
          startingRef.current = false;
          recognizerRef.current = null;
          enabledRef.current = false;
        }
      );
    } catch (err) {
      console.error("Failed to create recognizer:", err);
      setStatus("unsupported");
      startingRef.current = false;
      recognizerRef.current = null;
      enabledRef.current = false;
    }
  }, [createRecognizer]);

  const stop = useCallback(async () => {
    startingRef.current = false;
    enabledRef.current = false;
    recognizerGenerationRef.current += 1;
    const rec = recognizerRef.current;
    recognizerRef.current = null;
    await closeRecognizer(rec);
    setStatus("idle");
  }, [closeRecognizer]);

  const reset = useCallback(async () => {
    if (!enabledRef.current && !recognizerRef.current) return;
    await stop();
    await start();
  }, [start, stop]);

  useEffect(() => {
    const prev = sttLangRef.current;
    sttLangRef.current = sttLang;
    if (prev !== sttLang && enabledRef.current) {
      void reset();
    }
  }, [sttLang, reset]);

  useEffect(() => {
    return () => {
      startingRef.current = false;
      enabledRef.current = false;
      recognizerGenerationRef.current += 1;
      const rec = recognizerRef.current;
      recognizerRef.current = null;
      void closeRecognizer(rec);
    };
  }, [closeRecognizer]);

  return { status, start, stop, reset };
}
