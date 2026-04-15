import { useState, useRef, useEffect, useCallback } from "react";
import { isMatch, primeFrenchSpeech, speakFrench, speakCorrect } from "@/lib/speechUtils";
import type { FlashcardItem } from "@/lib/flashcardData";
import { Check, X, Send, Mic } from "lucide-react";

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
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "pending">("pending");
  const [cardColorIndex, setCardColorIndex] = useState(0);
  const [isFirstCard, setIsFirstCard] = useState(true);
  const cardColors = ["bg-indigo-400", "bg-green-400", "bg-yellow-400"];
  const recognitionRef = useRef<any>(null);
  const resultHandledRef = useRef(false);
  const attemptRef = useRef(0);
  const startMicRef = useRef<() => void>(() => {});

  const stopMic = useCallback(() => {
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
      }, 1500);
    } else {
      attemptRef.current += 1;
      if (attemptRef.current >= 2) {
        setState("incorrect");
        speakFrench(card.french);
      } else {
        setState("retry");
        setSpokenText(answer);
        setTimeout(() => {
          setState("prompt");
          setSpokenText("");
          resultHandledRef.current = false;
          startMicRef.current();
        }, 1500);
      }
    }
  }, [card.french, onCorrect, stopMic]);

  const startMic = useCallback(() => {
    if (recognitionRef.current) return;
    resultHandledRef.current = false;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = true;
    recognition.continuous = false;
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
      if (e.error === "not-allowed") {
        setMicPermission("denied");
        setIsListening(false);
        return;
      }
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "network" || e.error === "service-not-allowed") {
        // Handle focus loss errors by retrying after delay
        setTimeout(() => {
          if (!resultHandledRef.current && micPermission !== "denied") {
            startMicRef.current();
          }
        }, 1000);
        return;
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      // Auto-restart if no result was handled yet (keeps listening)
      if (!resultHandledRef.current && micPermission !== "denied") {
        setTimeout(() => {
          try {
            startMicRef.current();
          } catch (error) {
            // Retry again if it fails
            setTimeout(() => {
              if (!resultHandledRef.current && micPermission !== "denied") {
                startMicRef.current();
              }
            }, 500);
          }
        }, 100);
      } else {
        setIsListening(false);
      }
    };

    try {
      recognition.start();
      setIsListening(true);
      setMicPermission("granted");
    } catch {
      setIsListening(false);
    }
  }, [card.french, handleResult, micPermission]);

  startMicRef.current = startMic;

  // Auto-start mic on every new card
  useEffect(() => {
    setState("prompt");
    setTextInput("");
    setSpokenText("");
    setIsListening(false);
    setAnimatingOut(false);
    setAnimatingBack(false);
    resultHandledRef.current = false;
    recognitionRef.current = null;
    attemptRef.current = 0;

    // Cycle to next color for new card (but not for the very first card)
    if (!isFirstCard) {
      setCardColorIndex((prev) => (prev + 1) % cardColors.length);
    }
    setIsFirstCard(false);

    primeFrenchSpeech();
    const t = window.setTimeout(() => startMicRef.current(), 300);
    return () => {
      window.clearTimeout(t);
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, [card.id, cardColors.length]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    primeFrenchSpeech();
    stopMic();
    setSpokenText(textInput.trim());
    handleResult(textInput.trim());
  };

  const handleSelfAssess = (correct: boolean) => {
    if (correct) {
      speakCorrect(card.french);
      setAnimatingOut(true);
      setTimeout(onCorrect, 500);
    } else {
      setAnimatingBack(true);
      setTimeout(onIncorrect, 600);
    }
  };

  const handleDontKnow = () => {
    stopMic();
    setState("incorrect");
    speakFrench(card.french);
    // Move card to back of queue after showing answer
    setTimeout(() => {
      setAnimatingBack(true);
      setTimeout(onIncorrect, 2000);
    }, 2000);
  };

  const cycleCardColor = useCallback(() => {
    setCardColorIndex((prev) => (prev + 1) % cardColors.length);
  }, [cardColors.length]);

  const isIncorrect = state === "incorrect";
  const isRetry = state === "retry";
  const ringColor = isIncorrect
    ? "ring-destructive/40 shadow-[0_0_20px_-4px_hsl(var(--destructive)/0.3)]"
    : isRetry
    ? "ring-warning/35 shadow-[0_0_20px_-4px_hsl(var(--warning)/0.25)]"
    : "ring-success/30 shadow-[0_0_24px_-4px_hsl(var(--success)/0.35)]";
  const cardSurface = isIncorrect
    ? "bg-destructive"
    : cardColors[cardColorIndex];

  return (
    <div className="flex flex-col items-center gap-5 w-full animate-card-enter">
      {/* Progress */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium">{remaining}</span>
        <span>/</span>
        <span>{total}</span>
        <span>cards remaining</span>
      </div>

      {/* Main card */}
      <div className="relative w-full max-w-[300px]">
        <div
          className={`relative aspect-[3/4] rounded-2xl ring-2 ${ringColor} transition-all duration-300 ${
            animatingOut ? "animate-card-drop-off" : ""
          } ${animatingBack ? "animate-card-to-back" : ""} card-shadow-lg`}
        >
          <div className={`w-full h-full overflow-hidden flex flex-col items-center justify-center p-6 transition-colors duration-300 bg-success my-0 border-secondary rounded-md ${
              cardSurface
            }`}>
            {state === "prompt" && (
              <>
                <span className="text-[10px] font-semibold uppercase tracking-widest mb-3 text-sidebar">
                  Translate to French
                </span>
                <h2 className="font-display text-5xl font-black text-center leading-snug text-slate-900">
                  {card.english}
                </h2>
                {spokenText && (
                  <p className="mt-3 text-sm text-gray-700 italic">"{spokenText}"</p>
                )}
                {/* Listening indicator */}
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) {
                      stopMic();
                      resultHandledRef.current = true;
                    } else {
                      resultHandledRef.current = false;
                      startMic();
                    }
                  }}
                  className={`mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 ${
                    isListening
                      ? "text-primary/80 bg-primary/10 animate-fade-in"
                      : "text-muted-foreground bg-muted hover:bg-accent/50"
                  }`}
                >
                  {isListening ? (
                    <>
                      <Mic className="w-4 h-4 animate-pulse" />
                      <span className="text-xs">Listening — tap to pause</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span className="text-xs">Tap to listen</span>
                    </>
                  )}
                </button>
              </>
            )}

            {state === "retry" && (
              <>
                <span className="mb-3 text-xs font-semibold uppercase tracking-widest text-warning">
                  Try once more!
                </span>
                <h2 className="font-display text-2xl font-bold text-foreground text-center leading-snug">
                  {card.english}
                </h2>
                {spokenText && (
                  <p className="mt-3 text-sm text-muted-foreground italic">"{spokenText}"</p>
                )}
                <div className="mt-4 flex items-center gap-2 text-warning animate-fade-in">
                  <X className="w-5 h-5" />
                  <span className="font-semibold text-sm">Not quite — one more try!</span>
                </div>
              </>
            )}
            {state === "correct" && (
              <>
                <span className="text-xs font-semibold uppercase tracking-widest text-success mb-3">
                  Correct!
                </span>
                <h2 className="font-display text-2xl font-black text-black text-center leading-snug">
                  {card.french}
                </h2>
                <p className="mt-2 text-sm text-gray-800">{card.english}</p>
                <div className="mt-4 flex items-center gap-2 text-success animate-fade-in">
                  <Check className="w-6 h-6" />
                </div>
              </>
            )}

            {state === "incorrect" && (
              <>
                <span className="text-xs font-semibold uppercase tracking-widest text-destructive-foreground/60 mb-3">
                  Answer
                </span>
                <h2 className="font-display text-2xl font-black text-black text-center leading-snug">
                  {card.french}
                </h2>
                {spokenText && (
                  <p className="mt-3 text-sm text-gray-700 italic">
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

      {/* I don't know button - always visible to maintain structure */}
      <div className="flex justify-center mt-8">
        <button
          onClick={handleDontKnow}
          disabled={state !== "prompt"}
          className="px-6 py-3 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          I don't know
        </button>
      </div>

      {/* Controls — always visible to prevent layout wobbling */}
      <div className="flex flex-col items-center gap-6 w-full max-w-[300px] animate-fade-in mt-8">
        <form onSubmit={handleTextSubmit} className="flex w-full gap-3 items-center">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Or type in French..."
            disabled={state !== "prompt"}
            className="flex-1 rounded-full border border-input bg-card px-5 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={state !== "prompt"}
            className="w-12 h-12 rounded-full bg-amber-100 text-blue-900 hover:bg-amber-200 transition-colors flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
