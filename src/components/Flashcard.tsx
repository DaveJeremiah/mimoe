import { useState, useRef, useEffect, useCallback } from "react";
import { isMatch, primeFrenchSpeech, speakFrench, speakCorrect } from "@/lib/speechUtils";
import { useContinuousMic } from "@/hooks/useContinuousMic";
import type { FlashcardItem } from "@/lib/flashcardData";
import { Check, X, Send, Mic, MicOff, ArrowRight } from "lucide-react";

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
  const [textInput, setTextInput] = useState("");
  const [spokenText, setSpokenText] = useState("");
  const [animatingOut, setAnimatingOut] = useState(false);
  const [animatingBack, setAnimatingBack] = useState(false);
  const [cardColorIndex, setCardColorIndex] = useState(0);
  const [isFirstCard, setIsFirstCard] = useState(true);
  const cardColors = ["bg-indigo-400", "bg-green-400", "bg-yellow-400"];
  const resultHandledRef = useRef(false);
  const attemptRef = useRef(0);
  const cardFrenchRef = useRef(card.french);

  useEffect(() => {
    cardFrenchRef.current = card.french;
  }, [card.french]);

  // Continuous mic — opens once, stays open across cards
  const handleTranscript = useCallback((transcript: string, isFinal: boolean) => {
    if (resultHandledRef.current) return;
    setSpokenText(transcript);
    if (isMatch(transcript, cardFrenchRef.current)) {
      resultHandledRef.current = true;
      handleResultRef.current?.(cardFrenchRef.current);
    } else if (isFinal) {
      resultHandledRef.current = true;
      handleResultRef.current?.(transcript);
    }
  }, []);

  const { status: micStatus, start: startMic, stop: stopMic, pause: pauseMic, resume: resumeMic } = useContinuousMic({
    lang: "fr-FR",
    onTranscript: handleTranscript,
  });

  const handleResultRef = useRef<(answer: string) => void>();

  const handleResult = useCallback((answer: string) => {
    pauseMic();

    if (isMatch(answer, card.french)) {
      setState("correct");
      speakCorrect(card.french);
      setTimeout(() => {
        setAnimatingOut(true);
        setTimeout(onCorrect, 400);
      }, 1200);
    } else {
      attemptRef.current += 1;
      // Always speak the correct answer out loud on every failure
      speakFrench(card.french);
      if (attemptRef.current >= 2) {
        setState("incorrect");
      } else {
        setState("retry");
        setSpokenText(answer);
      }
    }
  }, [card.french, onCorrect, pauseMic]);

  useEffect(() => {
    handleResultRef.current = handleResult;
  }, [handleResult]);

  // Reset per-card state on new card; mic stays alive
  useEffect(() => {
    setState("prompt");
    setTextInput("");
    setSpokenText("");
    setAnimatingOut(false);
    setAnimatingBack(false);
    resultHandledRef.current = false;
    attemptRef.current = 0;

    if (!isFirstCard) {
      setCardColorIndex((prev) => (prev + 1) % cardColors.length);
    }
    setIsFirstCard(false);

    primeFrenchSpeech();
    // Resume listening for the new card if mic was previously enabled
    resumeMic();
  }, [card.id]);

  // Stop mic when component fully unmounts
  useEffect(() => {
    return () => { stopMic(); };
  }, [stopMic]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    primeFrenchSpeech();
    resultHandledRef.current = true;
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
    pauseMic();
    resultHandledRef.current = true;
    setState("incorrect");
    // Speak the answer out loud
    speakFrench(card.french);
  };

  // Tap-to-continue from retry state — user controls when to try again
  const handleContinueRetry = () => {
    setState("prompt");
    setSpokenText("");
    resultHandledRef.current = false;
    resumeMic();
  };

  const isIncorrect = state === "incorrect";
  const isRetry = state === "retry";
  const ringColor = isIncorrect
    ? "ring-red-500/60 shadow-[0_0_30px_-4px_rgba(239,68,68,0.4)]"
    : isRetry
    ? "ring-warning/35 shadow-[0_0_20px_-4px_hsl(var(--warning)/0.25)]"
    : "ring-success/30 shadow-[0_0_24px_-4px_hsl(var(--success)/0.35)]";
  const cardSurface = isIncorrect
    ? "bg-red-500"
    : cardColors[cardColorIndex];

  const isListening = micStatus === "listening";
  const micDenied = micStatus === "denied";
  const micUnsupported = micStatus === "unsupported";

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
                {/* Mic toggle — once enabled, stays open across cards */}
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) {
                      stopMic();
                    } else {
                      startMic();
                    }
                  }}
                  disabled={micUnsupported}
                  className={`mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 ${
                    isListening
                      ? "text-primary/80 bg-primary/10 animate-fade-in"
                      : micDenied
                      ? "text-destructive bg-destructive/10"
                      : "text-muted-foreground bg-muted hover:bg-accent/50"
                  } disabled:opacity-50`}
                >
                  {isListening ? (
                    <>
                      <Mic className="w-4 h-4 animate-pulse" />
                      <span className="text-xs text-gray-600">Listening — tap to stop</span>
                    </>
                  ) : micDenied ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span className="text-xs">Mic blocked — check permissions</span>
                    </>
                  ) : micUnsupported ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span className="text-xs">Mic not supported</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span className="text-xs">Tap once to enable mic</span>
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
                  <span className="font-semibold text-sm">Not quite</span>
                </div>
                <button
                  onClick={handleContinueRetry}
                  className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card text-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  <ArrowRight className="w-4 h-4" /> Try again
                </button>
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
                <button
                  onClick={() => speakFrench(card.french)}
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/30 text-black text-xs font-medium hover:bg-white/50 transition-colors"
                >
                  <Mic className="w-3.5 h-3.5" /> Hear it again
                </button>
                <div className="mt-5 flex gap-3">
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
                    <ArrowRight className="w-4 h-4" /> Continue
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Not sure button */}
      <div className="flex justify-center mt-8">
        <button
          onClick={handleDontKnow}
          disabled={state !== "prompt"}
          className="px-6 py-3 rounded-full text-white transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-yellow-500"
        >
          Not sure
        </button>
      </div>

      {/* Text input — always visible */}
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
