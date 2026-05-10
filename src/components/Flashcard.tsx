import { useState, useRef, useEffect, useCallback } from "react";
import { speakFrench, unlockAudio, prefetchAudio, isMatch } from "@/lib/speechUtils";
import type { FlashcardItem } from "@/lib/flashcardData";
import type { LanguageConfig } from "@/lib/languageConfig";
import { LANGUAGE_CONFIGS } from "@/lib/languageConfig";
import { Check, Send, Mic, ArrowRight, Bookmark, Volume2, VolumeX, Heart, MoreVertical, MessageSquare, Activity } from "lucide-react";

type MicStatus = "idle" | "listening" | "denied" | "unsupported" | "paused";

interface FlashcardProps {
  card: FlashcardItem;
  onAdvance: (opts: { failed: boolean; requeue: boolean }) => void;
  total: number;
  remaining: number;
  onTranscriptRef: React.MutableRefObject<(text: string, isFinal: boolean) => void>;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  isMicOn?: boolean;
  onToggleMic?: () => void;
  onAnimateAdvance?: (fn: (exitClass: string, opts: { failed: boolean; requeue: boolean }) => void) => void;
  langConfig?: LanguageConfig;
}

type CardState =
  | "QUESTION"
  | "CORRECT_REVEAL"
  | "WRONG_FIRST"
  | "WRONG_RETRY_CORRECT"
  | "WRONG_FINAL";

const AUTO_ADVANCE_MS = 1500;

function matchesCard(answer: string, target: string, alternatives?: string[]): boolean {
  if (isMatch(answer, target)) return true;
  if (alternatives) {
    return alternatives.some(alt => isMatch(answer, alt));
  }
  return false;
}

export function Flashcard({ card, onAdvance, total, remaining, onTranscriptRef, isBookmarked, onToggleBookmark, isMicOn = true, onToggleMic, onAnimateAdvance, langConfig }: FlashcardProps) {
  const lc = langConfig ?? LANGUAGE_CONFIGS.french;
  const targetWord = card.target ?? card.french ?? "";

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
  const targetRef = useRef(targetWord);
  const lcRef = useRef(lc);
  const inputRef = useRef<HTMLInputElement>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const ignoreUntilRef = useRef<number>(0);
  const lastProcessedRef = useRef<string>("");

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { targetRef.current = targetWord; }, [targetWord]);
  useEffect(() => { lcRef.current = lc; }, [lc]);

  useEffect(() => {
    onTranscriptRef.current = (transcript: string, isFinal: boolean) => {
      const s = stateRef.current;
      if (s !== "QUESTION" && s !== "WRONG_FIRST") return;
      // Ignore stale transcripts that arrived from speech before this card mounted
      if (Date.now() < ignoreUntilRef.current) return;
      // Avoid re-processing the same transcript twice (partial then final)
      if (transcript === lastProcessedRef.current) return;

      setSpokenText(transcript);

      if (matchesCard(transcript, targetRef.current, card.alternatives)) {
        lastProcessedRef.current = transcript;
        processAnswerRef.current?.(transcript);
      } else if (isFinal) {
        lastProcessedRef.current = transcript;
        processAnswerRef.current?.(transcript);
      }
    };
  }, [onTranscriptRef, card.alternatives]);

  const processAnswerRef = useRef<(answer: string) => void>();

  const animateAndAdvance = useCallback((
    exitClass: string,
    opts: { failed: boolean; requeue: boolean }
  ) => {
    if (isExiting) return;
    setIsExiting(true);
    setExitAnim(exitClass);
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
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

    const correct = matchesCard(answer, targetRef.current, card.alternatives);

    if (s === "QUESTION") {
      if (correct) {
        setState("CORRECT_REVEAL");
        setCardAnim("animate-glow-green");
        speakFrench(targetRef.current, undefined, lcRef.current);
        scheduleAutoAdvance(false);
      } else {
        setState("WRONG_FIRST");
        setCardAnim("animate-glow-red");
        speakFrench(targetRef.current, () => {
          setTimeout(() => inputRef.current?.focus(), 50);
        }, lcRef.current);
        setTextInput("");
      }
    } else {
      if (correct) {
        setState("WRONG_RETRY_CORRECT");
        setCardAnim("animate-glow-green");
        speakFrench(targetRef.current, undefined, lcRef.current);
        scheduleAutoAdvance(true);
      } else {
        setState("WRONG_FINAL");
        setCardAnim("animate-flip-reveal");
        setTimeout(() => setCardAnim(""), 500);
        speakFrench(targetRef.current, undefined, lcRef.current);
      }
    }
  }, [scheduleAutoAdvance, card.alternatives]);

  useEffect(() => { processAnswerRef.current = processAnswer; }, [processAnswer]);

  useEffect(() => {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setState("QUESTION");
    setTextInput("");
    setSpokenText("");
    // Suppress any in-flight transcript from the previous card for ~800ms
    ignoreUntilRef.current = Date.now() + 800;
    lastProcessedRef.current = "";

    if (!isFirstCard) {
      setCardColorIndex((prev) => (prev + 1) % cardColors.length);
    }
    setIsFirstCard(false);

    setEnterAnim("animate-enter-right");
    setTimeout(() => setEnterAnim(""), 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  useEffect(() => {
    prefetchAudio([targetWord], lc);
  }, [targetWord, lc]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = textInput.trim();
    if (!value) return;
    setSpokenText(value);
    processAnswer(value);
  };

  const handleDontKnow = () => {
    if (stateRef.current !== "QUESTION" && stateRef.current !== "WRONG_FIRST") return;
    setCardAnim("animate-shake");
    setTimeout(() => {
      setCardAnim("");
      setState("WRONG_FINAL");
      speakFrench(targetRef.current, undefined, lcRef.current);
    }, 500);
  };

  const handleContinueAfterFinal = () => {
    animateAndAdvance("animate-swipe-left", { failed: true, requeue: true });
  };

  const handleKnewItAfterFinal = () => {
    animateAndAdvance("animate-swipe-right", { failed: true, requeue: false });
  };

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
  const targetDir = lc.rtl ? "rtl" : "ltr";
  const targetFontClass = lc.fontClass;

  return (
    <div className="flex flex-col items-center gap-5 w-full animate-card-enter">
      <div className="relative w-full max-w-[300px]">
        <div className="absolute inset-x-4 top-3 h-full rounded-[2rem] bg-muted/40 border border-border/30" />
        <div className="absolute inset-x-2 top-1.5 h-full rounded-[2rem] bg-muted/70 border border-border/50" />

        <div className={`relative w-full h-full card-perspective ${exitAnim} ${cardAnim}`}>
          <div className={`relative aspect-square rounded-[2rem] ring-2 ${ringColor} ${enterAnim} transition-all duration-300 card-shadow-lg`}>
            <div className={`relative w-full h-full flex flex-col items-center justify-center p-6 transition-colors duration-300 border-secondary rounded-[1.85rem] ${cardSurface}`}>
              <button
                onClick={() => toggleBookmark(card.id)}
                className="absolute top-3 left-3 z-10 p-1.5 rounded-full bg-black/20 backdrop-blur-sm transition-colors"
              >
                <Heart className={`w-4 h-4 transition-colors ${bookmarked ? "fill-red-400 text-red-400" : "text-white/70"}`} />
              </button>

              {(isQuestion || isWrongFirst) && (
                <>
                  <span className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${isWrongFirst ? "text-warning" : "text-sidebar"}`}>
                    {isWrongFirst ? "Try again" : `Translate to ${lc.label}`}
                  </span>
                  <h2 className="font-display text-5xl font-black text-center leading-snug text-slate-900">
                    {card.english}
                  </h2>
                  {spokenText && (
                    <p className="mt-3 text-sm text-gray-700 italic" dir={targetDir}>"{spokenText}"</p>
                  )}
                </>
              )}

              {isReveal && (
                <>
                  <span className={`text-xs font-semibold uppercase tracking-widest mb-3 ${state === "CORRECT_REVEAL" ? "text-success" : "text-warning"}`}>
                    {state === "CORRECT_REVEAL" ? "Correct!" : "Got it on retry"}
                  </span>
                  <h2 dir={targetDir} className={`font-display text-3xl font-black text-black text-center leading-snug animate-pop-in ${targetFontClass}`}>
                    {targetWord}
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
                  <h2 dir={targetDir} className={`font-display text-3xl font-black text-black text-center leading-snug animate-pop-in ${targetFontClass}`}>
                    {targetWord}
                  </h2>
                  <p className="mt-1 text-sm text-gray-800">{card.english}</p>
                  {spokenText && (
                    <p className="mt-2 text-xs text-gray-700 italic" dir={targetDir}>You said: "{spokenText}"</p>
                  )}
                  <button
                    onClick={() => speakFrench(targetWord, undefined, lc)}
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
            placeholder={isWrongFirst ? `Try again in ${lc.label}...` : `Type in ${lc.label}...`}
            dir={targetDir}
            className={`flex-1 rounded-full border border-border bg-muted px-5 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${targetFontClass}`}
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
