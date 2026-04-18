import { useState, useRef, useEffect, useCallback } from "react";
import { primeFrenchSpeech, speakFrench, unlockAudio, prefetchAudio } from "@/lib/speechUtils";
import { useContinuousMic } from "@/hooks/useContinuousMic";
import type { FlashcardItem } from "@/lib/flashcardData";
import { Check, X, Send, Mic, MicOff, ArrowRight } from "lucide-react";

interface FlashcardProps {
  card: FlashcardItem;
  /** Called to advance to next card. failed=card was wrong at any point. requeue=put back at end of deck. */
  onAdvance: (opts: { failed: boolean; requeue: boolean }) => void;
  total: number;
  remaining: number;
}

// Strict state machine — do not add states.
type CardState =
  | "QUESTION"
  | "CORRECT_REVEAL"
  | "WRONG_FIRST"
  | "WRONG_RETRY_CORRECT"
  | "WRONG_FINAL";

/** Pure normalizer — strips accents, punctuation, lowercases, collapses whitespace. */
function normalizeAnswer(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

function isCorrect(userAnswer: string, correctFrench: string): boolean {
  return normalizeAnswer(userAnswer) === normalizeAnswer(correctFrench);
}

const AUTO_ADVANCE_MS = 1500;

export function Flashcard({ card, onAdvance, total, remaining }: FlashcardProps) {
  const [state, setState] = useState<CardState>("QUESTION");
  const [textInput, setTextInput] = useState("");
  const [spokenText, setSpokenText] = useState("");
  const [cardColorIndex, setCardColorIndex] = useState(0);
  const [isFirstCard, setIsFirstCard] = useState(true);
  const cardColors = ["bg-indigo-400", "bg-green-400", "bg-yellow-400"];

  const stateRef = useRef<CardState>("QUESTION");
  const cardFrenchRef = useRef(card.french);
  const inputRef = useRef<HTMLInputElement>(null);
  const advanceTimerRef = useRef<number | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { cardFrenchRef.current = card.french; }, [card.french]);

  // ── Mic transcript handler — only acts in QUESTION or WRONG_FIRST ──
  const handleTranscript = useCallback((transcript: string, isFinal: boolean) => {
    const s = stateRef.current;
    if (s !== "QUESTION" && s !== "WRONG_FIRST") return;

    setSpokenText(transcript);

    if (isCorrect(transcript, cardFrenchRef.current)) {
      processAnswerRef.current?.(transcript);
    } else if (isFinal) {
      processAnswerRef.current?.(transcript);
    }
  }, []);

  const { status: micStatus, start: startMic, stop: stopMic, pause: pauseMic, resume: resumeMic } = useContinuousMic({
    lang: "fr-FR",
    onTranscript: handleTranscript,
  });

  // ── Core state transitions ──
  const processAnswerRef = useRef<(answer: string) => void>();

  const scheduleAutoAdvance = useCallback((failed: boolean) => {
    if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = window.setTimeout(() => {
      onAdvance({ failed, requeue: false });
    }, AUTO_ADVANCE_MS);
  }, [onAdvance]);

  const processAnswer = useCallback((answer: string) => {
    const s = stateRef.current;
    if (s !== "QUESTION" && s !== "WRONG_FIRST") return;

    const correct = isCorrect(answer, cardFrenchRef.current);

    if (s === "QUESTION") {
      if (correct) {
        // QUESTION → CORRECT_REVEAL
        setState("CORRECT_REVEAL");
        pauseMic();
        speakFrench(cardFrenchRef.current);
        scheduleAutoAdvance(false);
      } else {
        // QUESTION → WRONG_FIRST
        setState("WRONG_FIRST");
        pauseMic();
        speakFrench(cardFrenchRef.current, () => {
          resumeMic();
          setTimeout(() => inputRef.current?.focus(), 50);
        });
        setTextInput("");
      }
    } else {
      // WRONG_FIRST
      if (correct) {
        // WRONG_FIRST → WRONG_RETRY_CORRECT
        setState("WRONG_RETRY_CORRECT");
        pauseMic();
        speakFrench(cardFrenchRef.current);
        scheduleAutoAdvance(true);
      } else {
        // WRONG_FIRST → WRONG_FINAL
        setState("WRONG_FINAL");
        pauseMic();
        speakFrench(cardFrenchRef.current);
        // No auto-advance — wait for button
      }
    }
  }, [pauseMic, resumeMic, scheduleAutoAdvance]);

  useEffect(() => { processAnswerRef.current = processAnswer; }, [processAnswer]);

  // ── Reset per-card state on new card; mic stays alive ──
  useEffect(() => {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setState("QUESTION");
    setTextInput("");
    setSpokenText("");

    if (!isFirstCard) {
      setCardColorIndex((prev) => (prev + 1) % cardColors.length);
    }
    setIsFirstCard(false);

    primeFrenchSpeech();
    resumeMic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  // Stop mic when component unmounts (leaving session)
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
      stopMic();
    };
  }, [stopMic]);

  // ── User actions ──
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = textInput.trim();
    if (!value) return;
    setSpokenText(value);
    processAnswer(value);
  };

  const handleDontKnow = () => {
    // Treat as final wrong: jump straight to WRONG_FINAL flow
    if (stateRef.current !== "QUESTION" && stateRef.current !== "WRONG_FIRST") return;
    setState("WRONG_FINAL");
    pauseMic();
    speakFrench(cardFrenchRef.current);
  };

  const handleContinueAfterFinal = () => {
    onAdvance({ failed: true, requeue: true });
  };

  const handleKnewItAfterFinal = () => {
    onAdvance({ failed: true, requeue: false });
  };

  // ── Derived UI flags ──
  const isWrongFinal = state === "WRONG_FINAL";
  const isWrongFirst = state === "WRONG_FIRST";
  const isReveal = state === "CORRECT_REVEAL" || state === "WRONG_RETRY_CORRECT";
  const isQuestion = state === "QUESTION";

  const ringColor = isWrongFinal
    ? "ring-red-500/60 shadow-[0_0_30px_-4px_rgba(239,68,68,0.4)]"
    : isWrongFirst
    ? "ring-warning/35 shadow-[0_0_20px_-4px_hsl(var(--warning)/0.25)]"
    : "ring-success/30 shadow-[0_0_24px_-4px_hsl(var(--success)/0.35)]";

  const cardSurface = isWrongFinal ? "bg-red-500" : cardColors[cardColorIndex];

  const isListening = micStatus === "listening";
  const micDenied = micStatus === "denied";
  const micUnsupported = micStatus === "unsupported";

  const inputDisabled = !(isQuestion || isWrongFirst);

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
          className={`relative aspect-[3/4] rounded-2xl ring-2 ${ringColor} transition-all duration-300 card-shadow-lg`}
        >
          <div className={`w-full h-full overflow-hidden flex flex-col items-center justify-center p-6 transition-colors duration-300 border-secondary rounded-md ${cardSurface}`}>
            {(isQuestion || isWrongFirst) && (
              <>
                <span className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${isWrongFirst ? "text-warning" : "text-sidebar"}`}>
                  {isWrongFirst ? "Try again" : "Translate to French"}
                </span>
                <h2 className="font-display text-5xl font-black text-center leading-snug text-slate-900">
                  {card.english}
                </h2>
                {spokenText && (
                  <p className="mt-3 text-sm text-gray-700 italic">"{spokenText}"</p>
                )}
                {!micUnsupported && (
                  <button
                    type="button"
                    onClick={() => { unlockAudio(); isListening ? stopMic() : startMic(); }}
                    className={`mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 ${
                      isListening
                        ? "text-primary/80 bg-primary/10 animate-fade-in"
                        : micDenied
                        ? "text-destructive bg-destructive/10"
                        : "text-muted-foreground bg-muted hover:bg-accent/50"
                    }`}
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
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        <span className="text-xs">Tap once to enable mic</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )}

            {isReveal && (
              <>
                <span className={`text-xs font-semibold uppercase tracking-widest mb-3 ${state === "CORRECT_REVEAL" ? "text-success" : "text-warning"}`}>
                  {state === "CORRECT_REVEAL" ? "Correct!" : "Got it on retry"}
                </span>
                <h2 className="font-display text-3xl font-black text-black text-center leading-snug">
                  {card.french}
                </h2>
                <p className="mt-2 text-sm text-gray-800">{card.english}</p>
                <div className="mt-4 flex items-center gap-2 text-success animate-fade-in">
                  <Check className="w-6 h-6" />
                </div>
              </>
            )}

            {isWrongFinal && (
              <>
                <span className="text-xs font-semibold uppercase tracking-widest text-destructive-foreground/60 mb-3">
                  Answer
                </span>
                <h2 className="font-display text-3xl font-black text-black text-center leading-snug">
                  {card.french}
                </h2>
                <p className="mt-1 text-sm text-gray-800">{card.english}</p>
                {spokenText && (
                  <p className="mt-2 text-xs text-gray-700 italic">You said: "{spokenText}"</p>
                )}
                <button
                  onClick={() => speakFrench(card.french)}
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/30 text-black text-xs font-medium hover:bg-white/50 transition-colors"
                >
                  <Mic className="w-3.5 h-3.5" /> Hear it again
                </button>
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={handleContinueAfterFinal}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card text-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleKnewItAfterFinal}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success text-success-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                  >
                    <Check className="w-4 h-4" /> I knew it
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Not sure — only during attempt phases */}
      <div className="flex justify-center mt-8">
        <button
          onClick={handleDontKnow}
          disabled={!(isQuestion || isWrongFirst)}
          className="px-6 py-3 rounded-full text-white transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-yellow-500"
        >
          Not sure
        </button>
      </div>

      {/* Text input — active in QUESTION and WRONG_FIRST */}
      <div className="flex flex-col items-center gap-6 w-full max-w-[300px] animate-fade-in mt-8">
        <form onSubmit={handleTextSubmit} className="flex w-full gap-3 items-center">
          <input
            ref={inputRef}
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={isWrongFirst ? "Try again in French..." : "Or type in French..."}
            disabled={inputDisabled}
            className="flex-1 rounded-full border border-input bg-card px-5 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={inputDisabled}
            className="w-12 h-12 rounded-full bg-amber-100 text-blue-900 hover:bg-amber-200 transition-colors flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
