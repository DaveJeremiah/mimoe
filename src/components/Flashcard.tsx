import { useState, useRef, useEffect, useCallback } from "react";
import { speakFrench, unlockAudio, prefetchAudio, isMatch } from "@/lib/speechUtils";
import type { FlashcardItem } from "@/lib/flashcardData";
import { Check, Send, Mic, ArrowRight, Bookmark, Volume2, VolumeX, Heart, MoreVertical, MessageSquare, Activity } from "lucide-react";

type MicStatus = "idle" | "listening" | "denied" | "unsupported" | "paused";

interface FlashcardProps {
  card: FlashcardItem;
  /** Called to advance to next card. failed=card was wrong at any point. requeue=put back at end of deck. */
  onAdvance: (opts: { failed: boolean; requeue: boolean }) => void;
  total: number;
  remaining: number;
  onTranscriptRef: React.MutableRefObject<(text: string, isFinal: boolean) => void>;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  /** Called when user swipes forward (skip as correct) */
  onSwipeForward?: () => void;
  /** Called when user swipes backward (undo) */
  onSwipeBackward?: () => void;
  isMicOn?: boolean;
  onToggleMic?: () => void;
  onAnimateAdvance?: (fn: (exitClass: string, opts: { failed: boolean; requeue: boolean }) => void) => void;
}

// Strict state machine — do not add states.
type CardState =
  | "QUESTION"
  | "CORRECT_REVEAL"
  | "WRONG_FIRST"
  | "WRONG_RETRY_CORRECT"
  | "WRONG_FINAL";

const AUTO_ADVANCE_MS = 1500;

/** Returns true if the answer matches the primary french OR any alternative */
function matchesCard(answer: string, french: string, alternatives?: string[]): boolean {
  if (isMatch(answer, french)) return true;
  if (alternatives) {
    return alternatives.some(alt => isMatch(answer, alt));
  }
  return false;
}

export function Flashcard({ card, onAdvance, total, remaining, onTranscriptRef, isBookmarked, onToggleBookmark, onSwipeForward, onSwipeBackward, isMicOn = true, onToggleMic, onAnimateAdvance }: FlashcardProps) {
  const [state, setState] = useState<CardState>("QUESTION");
  const [textInput, setTextInput] = useState("");
  const [spokenText, setSpokenText] = useState("");
  const [cardColorIndex, setCardColorIndex] = useState(0);
  const [isFirstCard, setIsFirstCard] = useState(true);
  const cardColors = ["bg-indigo-400", "bg-green-400", "bg-yellow-400"];

  const [exitAnim, setExitAnim] = useState<string>("");
  const [enterAnim, setEnterAnim] = useState<string>("animate-enter-right");
  const [cardAnim, setCardAnim] = useState<string>("");
  const [isExiting, setIsExiting] = useState(false);

  const [showInput, setShowInput] = useState(false);
  const [showCardMenu, setShowCardMenu] = useState(false);
  const [bookmarkedCards, setBookmarkedCards] = useState<Set<string>>(new Set());
  const bookmarked = bookmarkedCards.has(card.id);
  const toggleBookmark = (id: string) => {
    setBookmarkedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const stateRef = useRef<CardState>("QUESTION");
  const cardFrenchRef = useRef(card.french);
  const inputRef = useRef<HTMLInputElement>(null);
  const advanceTimerRef = useRef<number | null>(null);

  // Swipe detection state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  // Minimum swipe distance
  const minSwipeDistance = 50;

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { cardFrenchRef.current = card.french; }, [card.french]);

  // ── Wire transcript handler into parent's mic via ref ──
  useEffect(() => {
    onTranscriptRef.current = (transcript: string, isFinal: boolean) => {
      const s = stateRef.current;
      if (s !== "QUESTION" && s !== "WRONG_FIRST") return;

      setSpokenText(transcript);

      if (matchesCard(transcript, cardFrenchRef.current, card.alternatives)) {
        processAnswerRef.current?.(transcript);
      } else if (isFinal) {
        processAnswerRef.current?.(transcript);
      }
    };
  }, [onTranscriptRef]);


  // ── Core state transitions ──
  const processAnswerRef = useRef<(answer: string) => void>();

  const animateAndAdvance = useCallback((
    exitClass: string,
    opts: { failed: boolean; requeue: boolean }
  ) => {
    if (isExiting) return;
    setIsExiting(true);
    setExitAnim(exitClass);
    setTimeout(() => {
      setIsExiting(false);
      setExitAnim("");
      onAdvance(opts);
    }, 420);
  }, [isExiting, onAdvance]);

  useEffect(() => {
    if (onAnimateAdvance) {
      onAnimateAdvance(animateAndAdvance);
    }
  }, [onAnimateAdvance, animateAndAdvance]);

  const scheduleAutoAdvance = useCallback((failed: boolean) => {
    if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = window.setTimeout(() => {
      animateAndAdvance("animate-swipe-right", { failed, requeue: false });
    }, AUTO_ADVANCE_MS);
  }, [animateAndAdvance]);

  const processAnswer = useCallback((answer: string) => {
    const s = stateRef.current;
    if (s !== "QUESTION" && s !== "WRONG_FIRST") return;

    const correct = matchesCard(answer, cardFrenchRef.current, card.alternatives);

    if (s === "QUESTION") {
      if (correct) {
        // QUESTION → CORRECT_REVEAL
        setState("CORRECT_REVEAL");
        setCardAnim("animate-glow-green");
        speakFrench(cardFrenchRef.current);
        scheduleAutoAdvance(false);
      } else {
        // QUESTION → WRONG_FIRST
        setState("WRONG_FIRST");
        setCardAnim("animate-glow-red");
        speakFrench(cardFrenchRef.current, () => {
          setTimeout(() => inputRef.current?.focus(), 50);
        });
        setTextInput("");
      }
    } else {
      // WRONG_FIRST
      if (correct) {
        // WRONG_FIRST → WRONG_RETRY_CORRECT
        setState("WRONG_RETRY_CORRECT");
        setCardAnim("animate-glow-green");
        speakFrench(cardFrenchRef.current);
        scheduleAutoAdvance(true);
      } else {
        // WRONG_FIRST → WRONG_FINAL
        setState("WRONG_FINAL");
        setCardAnim("animate-flip-reveal");
        setTimeout(() => setCardAnim(""), 500);
        speakFrench(cardFrenchRef.current);
        // No auto-advance — wait for button
      }
    }
  }, [scheduleAutoAdvance]);

  useEffect(() => { processAnswerRef.current = processAnswer; }, [processAnswer]);

  // ── Reset per-card state on new card; mic is owned by parent and stays alive ──
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

    setEnterAnim("animate-enter-right");
    setTimeout(() => setEnterAnim(""), 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  // Pre-fetch audio for the current card so reveal is instant
  useEffect(() => {
    prefetchAudio([card.french]);
  }, [card.french]);

  // Cleanup advance timer on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    };
  }, []);

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
    setCardAnim("animate-shake");
    setTimeout(() => {
      setCardAnim("");
      setState("WRONG_FINAL");
      speakFrench(cardFrenchRef.current);
    }, 500);
  };

  const handleContinueAfterFinal = () => {
    animateAndAdvance("animate-swipe-left", { failed: true, requeue: false });
  };

  const handleKnewItAfterFinal = () => {
    animateAndAdvance("animate-swipe-right", { failed: true, requeue: false });
  };

  // Swipe event handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart.x - touchEnd.x;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && onSwipeForward) {
      // Swipe left (forward) - count as correct and advance
      onSwipeForward();
    } else if (isRightSwipe && onSwipeBackward) {
      // Swipe right (backward) - undo previous card
      onSwipeBackward();
    }
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

  const inputDisabled = !(isQuestion || isWrongFirst);

  return (
    <div className="flex flex-col items-center gap-5 w-full animate-card-enter">
      {/* Main card */}
      <div className="relative w-full max-w-[300px]">
        {/* Card 3 — furthest back */}
        <div className="absolute inset-x-4 top-3 h-full rounded-[2rem] bg-muted/40 border border-border/30" />
        {/* Card 2 — middle */}
        <div className="absolute inset-x-2 top-1.5 h-full rounded-[2rem] bg-muted/70 border border-border/50" />

        <div className={`relative w-full h-full card-perspective ${exitAnim} ${cardAnim}`}>
          <div
            className={`relative aspect-square rounded-[2rem] ring-2 ${ringColor} ${enterAnim} transition-all duration-300 card-shadow-lg`}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className={`relative w-full h-full flex flex-col items-center justify-center p-6 transition-colors duration-300 border-secondary rounded-[1.85rem] ${cardSurface}`}>
              {/* Corner Icons */}
              <button
                onClick={() => toggleBookmark(card.id)}
                className="absolute top-3 left-3 z-10 p-1.5 rounded-full bg-black/20 backdrop-blur-sm transition-colors"
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    bookmarked ? "fill-red-400 text-red-400" : "text-white/70"
                  }`}
                />
              </button>


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
              </>
            )}

            {isReveal && (
              <>
                <span className={`text-xs font-semibold uppercase tracking-widest mb-3 ${state === "CORRECT_REVEAL" ? "text-success" : "text-warning"}`}>
                  {state === "CORRECT_REVEAL" ? "Correct!" : "Got it on retry"}
                </span>
                <h2 className="font-display text-3xl font-black text-black text-center leading-snug animate-pop-in">
                  {card.french}
                </h2>
                <p className="mt-2 text-sm text-gray-800">{card.english}</p>
                <div className="mt-4 flex items-center gap-2 text-success animate-bounce-in">
                  <Check className="w-6 h-6" />
                </div>
              </>
            )}

            {isWrongFinal && (
              <>
                <span className="text-xs font-semibold uppercase tracking-widest text-destructive-foreground/60 mb-3">
                  Answer
                </span>
                <h2 className="font-display text-3xl font-black text-black text-center leading-snug animate-pop-in">
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
                <div className="mt-5 flex gap-3 animate-bounce-in">
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
      </div>

      <div className="flex justify-center mt-6 w-full max-w-[300px]">
        {/* Mode toggle */}
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={() => setShowInput(!showInput)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full border font-semibold text-sm transition-all ${
              showInput
                ? "bg-muted border-border text-foreground"
                : "bg-card border-border text-foreground"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Write
          </button>
          <button
            onClick={handleDontKnow}
            disabled={!(isQuestion || isWrongFirst)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-secondary/80 text-white font-semibold text-sm transition-all hover:bg-secondary disabled:opacity-50"
          >
            <VolumeX className="w-4 h-4" />
            Not sure
          </button>
        </div>
      </div>

      {showInput && (isQuestion || isWrongFirst) && (
        <form onSubmit={handleTextSubmit} className="flex w-full max-w-[300px] gap-2 animate-fade-in mt-4">
          <input
            ref={inputRef}
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={isWrongFirst ? "Try again in French..." : "Type in French..."}
            className="flex-1 rounded-full border border-border bg-muted px-5 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <button type="submit" className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}


    </div>
  );
}
