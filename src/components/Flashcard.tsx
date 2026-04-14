import { useState, useRef, useEffect, useCallback } from "react";
import { MicButton } from "./MicButton";
import { isMatch, primeFrenchSpeech, speakFrench, speakCorrect } from "@/lib/speechUtils";
import type { FlashcardItem } from "@/lib/flashcardData";
import { Check, X, Send } from "lucide-react";

interface FlashcardProps {
  card: FlashcardItem;
  onCorrect: () => void;
  onIncorrect: () => void;
  total: number;
  remaining: number;
}

type CardState = "prompt" | "correct" | "incorrect" | "retry";

export function Flashcard({ card, onCorrect, onIncorrect, total, remaining }: FlashcardProps) {
  const [state, setState] = useState<CardState>("prompt");
  const [isListening, setIsListening] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [spokenText, setSpokenText] = useState("");
  const [animatingOut, setAnimatingOut] = useState(false);
  const [animatingBack, setAnimatingBack] = useState(false);
  const recognitionRef = useRef<any>(null);
  const micActivatedRef = useRef(false);
  const resultHandledRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const attemptRef = useRef(0);

  const stopMic = useCallback(() => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const handleResult = useCallback((answer: string) => {
    stopMic();

    if (isMatch(answer, card.french)) {
      setState("correct");
      speakCorrect(card.french);
      setTimeout(() => {
        setAnimatingOut(true);
        setTimeout(onCorrect, 400);
      }, 300);
    } else {
      setState("incorrect");
      setTimeout(() => speakFrench(card.french), 150);
    }
  }, [card.french, onCorrect, stopMic]);

  const startMic = useCallback(() => {
    if (recognitionRef.current) return;
    resultHandledRef.current = false;
    shouldRestartRef.current = true;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported. Please type your answer.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 5;
    recognitionRef.current = recognition;

    const submitAnswer = (answer: string) => {
      if (resultHandledRef.current) return;
      resultHandledRef.current = true;
      handleResult(answer);
    };

    recognition.onresult = (event: any) => {
      const latestResult = event.results[event.results.length - 1];
      const latestTranscript = latestResult?.[0]?.transcript?.trim() ?? "";

      if (latestTranscript) {
        setSpokenText(latestTranscript);
      }

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        for (let j = 0; j < result.length; j++) {
          const transcript = result[j].transcript.trim();
          if (isMatch(transcript, card.french)) {
            setSpokenText(transcript);
            submitAnswer(card.french);
            return;
          }
        }
      }

      if (latestResult?.isFinal && latestTranscript) {
        submitAnswer(latestTranscript);
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === "no-speech" || e.error === "aborted") {
        return;
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (shouldRestartRef.current && !resultHandledRef.current && micActivatedRef.current) {
        try {
          const newRecognition = new SpeechRecognition();
          newRecognition.lang = "fr-FR";
          newRecognition.interimResults = true;
          newRecognition.continuous = true;
          newRecognition.maxAlternatives = 5;
          newRecognition.onresult = recognition.onresult;
          newRecognition.onerror = recognition.onerror;
          newRecognition.onend = recognition.onend;
          recognitionRef.current = newRecognition;
          newRecognition.start();
        } catch {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, [card.french, handleResult]);

  useEffect(() => {
    setState("prompt");
    setTextInput("");
    setSpokenText("");
    setIsListening(false);
    setAnimatingOut(false);
    setAnimatingBack(false);
    resultHandledRef.current = false;
    shouldRestartRef.current = false;
    recognitionRef.current = null;

    if (micActivatedRef.current) {
      const t = window.setTimeout(() => startMic(), 200);
      return () => window.clearTimeout(t);
    }
  }, [card.id, startMic]);

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  const toggleMic = useCallback(() => {
    if (isListening) {
      micActivatedRef.current = false;
      stopMic();
      return;
    }

    micActivatedRef.current = true;
    primeFrenchSpeech();
    startMic();
  }, [isListening, startMic, stopMic]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    primeFrenchSpeech();
    setSpokenText(textInput.trim());
    handleResult(textInput.trim());
  };

  const handleSelfAssess = (correct: boolean) => {
    if (correct) {
      setAnimatingOut(true);
      setTimeout(onCorrect, 500);
    } else {
      setAnimatingBack(true);
      setTimeout(onIncorrect, 600);
    }
  };

  const isIncorrect = state === "incorrect";
  const ringColor = isIncorrect
    ? "ring-destructive/40 shadow-[0_0_20px_-4px_hsl(var(--destructive)/0.3)]"
    : "ring-success/30 shadow-[0_0_20px_-4px_hsl(var(--success)/0.25)]";
  const stackBorder = isIncorrect ? "border-destructive/20" : "border-success/20";

  return (
    <div className="flex flex-col items-center gap-5 w-full animate-card-enter">
      {/* Progress */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium">{remaining}</span>
        <span>/</span>
        <span>{total}</span>
        <span>cards remaining</span>
      </div>

      {/* Card stack */}
      <div className="relative w-full max-w-[300px]">
        {remaining > 2 && (
          <div className={`absolute inset-0 aspect-[3/4] rounded-2xl bg-card border ${stackBorder} translate-y-3 scale-[0.92] opacity-40`} />
        )}
        {remaining > 1 && (
          <div className={`absolute inset-0 aspect-[3/4] rounded-2xl bg-card border ${stackBorder} translate-y-1.5 scale-[0.96] opacity-60`} />
        )}

        {/* Main card */}
        <div
          className={`relative aspect-[3/4] rounded-2xl ring-2 ${ringColor} transition-all duration-300 ${
            animatingOut ? "animate-card-drop-off" : ""
          } ${animatingBack ? "animate-card-to-back" : ""}`}
        >
          <div className={`w-full h-full rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6 transition-colors duration-300 ${
            isIncorrect ? "bg-destructive" : "bg-card"
          }`}>
            {state === "prompt" && (
              <>
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Translate to French
                </span>
                <h2 className="font-display text-2xl font-bold text-foreground text-center leading-snug">
                  {card.english}
                </h2>
                {spokenText && (
                  <p className="mt-3 text-sm text-muted-foreground italic">"{spokenText}"</p>
                )}
              </>
            )}

            {state === "correct" && (
              <>
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Translate to French
                </span>
                <h2 className="font-display text-2xl font-bold text-foreground text-center leading-snug">
                  {card.english}
                </h2>
                <div className="mt-5 flex items-center gap-2 text-success animate-fade-in">
                  <Check className="w-6 h-6" />
                  <span className="font-semibold text-lg">Correct!</span>
                </div>
              </>
            )}

            {state === "incorrect" && (
              <>
                <span className="text-xs font-semibold uppercase tracking-widest text-destructive-foreground/60 mb-3">
                  Answer
                </span>
                <h2 className="font-display text-2xl font-bold text-destructive-foreground text-center leading-snug">
                  {card.french}
                </h2>
                {spokenText && (
                  <p className="mt-3 text-sm text-destructive-foreground/60 italic">
                    You said: "{spokenText}"
                  </p>
                )}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => handleSelfAssess(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success text-success-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                  >
                    <Check className="w-4 h-4" /> I knew it
                  </button>
                  <button
                    onClick={() => handleSelfAssess(false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card text-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                  >
                    <X className="w-4 h-4" /> Try again
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      {state === "prompt" && (
        <div className="flex flex-col items-center gap-3 w-full max-w-[300px] animate-fade-in">
          <MicButton isListening={isListening} onClick={toggleMic} />
          <span className="text-xs text-muted-foreground">
            {isListening ? "Listening..." : "Tap to speak"}
          </span>
          <form onSubmit={handleTextSubmit} className="flex w-full gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type in French..."
              className="flex-1 rounded-xl border border-input bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2.5 text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
