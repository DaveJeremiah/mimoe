import { useState, useRef, useEffect, useCallback } from "react";
import { speakFrench, prefetchAudio, isMatch, stopAudio, unlockAudio } from "@/lib/speechUtils";
import type { FlashcardItem } from "@/lib/flashcardData";
import type { LanguageConfig } from "@/lib/languageConfig";
import { LANGUAGE_CONFIGS } from "@/lib/languageConfig";
import { usePushToTalkMic } from "@/hooks/usePushToTalkMic";
import { RefreshCw } from "lucide-react";

function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern) } catch { /* unsupported */ }
}

// ── Band style: colours that flow through the entire session ──────────────────
export interface BandStyle {
  cardBg:    string;  // solid card background (matches home card)
  ghost1:    string;  // middle ghost layer
  ghost2:    string;  // back ghost layer
  lines:     string;  // ruled-line rgba
  bar:       string;  // progress / accent colour
  curl:      string;  // page-curl gradient
  textColor: string;  // question text colour (white on vivid bg)
}

export const DEFAULT_BAND_STYLE: BandStyle = {
  cardBg:    "#FFD000",
  ghost1:    "#F0C400",
  ghost2:    "#E5B800",
  lines:     "rgba(0,0,0,0.07)",
  bar:       "#FFD000",
  curl:      "linear-gradient(140deg,#fffde0 0%,#f5ef90 40%,#e8d840 70%,#d4c020 100%)",
  textColor: "#1a0e00",
};

interface FlashcardProps {
  card: FlashcardItem;
  onAdvance: (opts: { failed: boolean; requeue: boolean }) => void;
  total: number;
  remaining: number;
  streak?: number;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  isMicOn?: boolean;
  onAnimateAdvance?: (fn: (exitClass: string, opts: { failed: boolean; requeue: boolean }) => void) => void;
  langConfig?: LanguageConfig;
  bandStyle?: BandStyle;
}

type CardState =
  | "QUESTION"
  | "CORRECT_REVEAL"
  | "WRONG_FIRST"
  | "WRONG_RETRY_CORRECT"
  | "WRONG_FINAL";

const AUTO_ADVANCE_MS = 1600;

function matchesCard(answer: string, target: string, alternatives?: string[]): boolean {
  if (isMatch(answer, target)) return true;
  if (alternatives) return alternatives.some(alt => isMatch(answer, alt));
  return false;
}

// ── Page curl — receives the gradient as a prop (no outer-scope refs) ────────
function PageCurl({ size, curl }: { size: number; curl: string }) {
  return (
    <div
      className="absolute bottom-0 right-0 pointer-events-none z-20"
      style={{ width: size, height: size }}
    >
      {/* Shadow under the curl */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 100% 100%, rgba(0,0,0,0.22) 0%, transparent 65%)",
          borderBottomRightRadius: "28px",
        }}
      />
      {/* Curled flap */}
      <div className="absolute inset-0 overflow-hidden" style={{ borderBottomRightRadius: "28px" }}>
        <div
          style={{
            position: "absolute", bottom: 0, right: 0,
            width: "100%", height: "100%",
            clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
            background: curl,
          }}
        />
      </div>
      {/* Crease line */}
      <div
        style={{
          position: "absolute", bottom: 0, left: 0,
          width: "141%", height: "1.5px",
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.85) 40%, rgba(255,255,255,0.3) 100%)",
          transformOrigin: "bottom left",
          transform: "rotate(-45deg)",
          opacity: 0.8,
        }}
      />
    </div>
  );
}

// ── Subtle diagonal crack pattern (same as home cards) ────────────────────────
function CardPattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.1 }}
      viewBox="0 0 200 200"
      preserveAspectRatio="xMidYMid slice"
    >
      <line x1="60"  y1="0"   x2="120" y2="200" stroke="white" strokeWidth="1.2"/>
      <line x1="140" y1="0"   x2="80"  y2="200" stroke="white" strokeWidth="0.6"/>
      <line x1="0"   y1="70"  x2="200" y2="130" stroke="white" strokeWidth="0.6"/>
    </svg>
  );
}

export function Flashcard({
  card, onAdvance, total, remaining, streak = 0,
  isBookmarked, onToggleBookmark, isMicOn = true,
  onAnimateAdvance, langConfig, bandStyle = DEFAULT_BAND_STYLE,
}: FlashcardProps) {
  const lc = langConfig ?? LANGUAGE_CONFIGS.french;
  const targetWord = card.target ?? card.french ?? "";

  const [state, setState]           = useState<CardState>("QUESTION");
  const [spokenText, setSpokenText] = useState("");
  const [exitAnim, setExitAnim]     = useState<string>("");
  const [enterAnim, setEnterAnim]   = useState<string>("animate-enter-right");
  const [cardAnim, setCardAnim]     = useState<string>("");
  const [isExiting, setIsExiting]   = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);

  const stateRef      = useRef<CardState>("QUESTION");
  const targetRef     = useRef(targetWord);
  const lcRef         = useRef(lc);
  const advanceTimerRef   = useRef<number | null>(null);
  const ignoreUntilRef    = useRef<number>(0);
  const lastProcessedRef  = useRef<string>("");
  const ttsGateRef        = useRef<boolean>(false);   // true while TTS is speaking
  const gateSafetyRef     = useRef<number | null>(null);
  const processAnswerRef  = useRef<(answer: string) => void>();

  // Track whether TTS is actively playing (used to disable the PTT button)
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ── Push-to-talk recognition ─────────────────────────────────────────────
  const { status: pttStatus, start: startPTT, stop: stopPTT, cancel: cancelPTT } =
    usePushToTalkMic({
      lang: lc.sttLang,
      onResult: useCallback((text: string) => {
        if (ttsGateRef.current) return;                   // TTS playing — ignore
        if (Date.now() < ignoreUntilRef.current) return;  // card just switched
        if (text === lastProcessedRef.current) return;    // duplicate
        setSpokenText(text);
        lastProcessedRef.current = text;
        processAnswerRef.current?.(text);
      }, []),
    });

  // Speak the target word, fully blocking PTT until audio finishes.
  // With PTT there's no continuous mic to pause — just gate the ttsRef and
  // optionally advance when done.
  const speakGated = useCallback((text: string, onDone?: () => void) => {
    setIsSpeaking(true);
    ttsGateRef.current = true;
    if (gateSafetyRef.current) window.clearTimeout(gateSafetyRef.current);
    let finished = false;
    const onFinish = () => {
      if (finished) return;
      finished = true;
      if (gateSafetyRef.current) { window.clearTimeout(gateSafetyRef.current); gateSafetyRef.current = null; }
      window.setTimeout(() => {
        setIsSpeaking(false);
        ttsGateRef.current = false;
        lastProcessedRef.current = "";
        if (onDone) onDone();
      }, 200);
    };
    // Safety: never stay gated more than 6.5 s
    gateSafetyRef.current = window.setTimeout(onFinish, 6500);
    speakFrench(text, onFinish, lcRef.current);
  }, []);

  useEffect(() => { stateRef.current = state; },       [state]);
  useEffect(() => { targetRef.current = targetWord; }, [targetWord]);
  useEffect(() => { lcRef.current = lc; },             [lc]);

  // Sparkle on correct
  useEffect(() => {
    if (state === "CORRECT_REVEAL" || state === "WRONG_RETRY_CORRECT") {
      setShowSparkle(true);
      const t = setTimeout(() => setShowSparkle(false), 800);
      return () => clearTimeout(t);
    }
  }, [state]);


  const animateAndAdvance = useCallback((
    exitClass: string, opts: { failed: boolean; requeue: boolean }
  ) => {
    if (isExiting) return;
    setIsExiting(true);
    setExitAnim(exitClass);
    if (advanceTimerRef.current) { window.clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
    setTimeout(() => { setIsExiting(false); setExitAnim(""); onAdvance(opts); }, 420);
  }, [isExiting, onAdvance]);

  useEffect(() => { if (onAnimateAdvance) onAnimateAdvance(animateAndAdvance); }, [onAnimateAdvance, animateAndAdvance]);

  const scheduleAutoAdvance = useCallback((failed: boolean) => {
    if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = window.setTimeout(() => {
      animateAndAdvance("animate-slide-up", { failed, requeue: failed });
    }, AUTO_ADVANCE_MS);
  }, [animateAndAdvance]);

  const processAnswer = useCallback((answer: string) => {
    const s = stateRef.current;
    if (s !== "QUESTION" && s !== "WRONG_FIRST") return;
    if (!answer.trim()) return;
    const correct = matchesCard(answer, targetRef.current, card.alternatives);

    if (s === "QUESTION") {
      if (correct) {
        // ✓ Correct 1st try → no TTS, just advance
        vibrate(40);
        setState("CORRECT_REVEAL");
        scheduleAutoAdvance(false);
      } else {
        // ✗ Wrong 1st try → speak the word as a clue, HOLD for retry (no advance)
        vibrate([60, 40, 60]);
        setState("WRONG_FIRST");
        speakGated(targetRef.current);
        // no auto-advance — mic reopens after TTS so the user can try again
      }
    } else if (s === "WRONG_FIRST") {
      if (correct) {
        // ✓ Correct 2nd try → no TTS, just advance
        vibrate(40);
        setState("WRONG_RETRY_CORRECT");
        scheduleAutoAdvance(true);
      } else {
        // ✗ Wrong 2nd try → speak the word, then advance ONCE audio finishes
        vibrate([60, 40, 60]);
        setState("WRONG_FINAL");
        speakGated(targetRef.current, () => {
          animateAndAdvance("animate-slide-up", { failed: true, requeue: true });
        });
      }
    }
  }, [scheduleAutoAdvance, card.alternatives, speakGated, animateAndAdvance]);

  useEffect(() => { processAnswerRef.current = processAnswer; }, [processAnswer]);

  useEffect(() => {
    if (advanceTimerRef.current) { window.clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
    if (gateSafetyRef.current) { window.clearTimeout(gateSafetyRef.current); gateSafetyRef.current = null; }
    stopAudio();                 // cut any audio from the previous card so it can't bleed in
    ttsGateRef.current = false;
    setState("QUESTION");
    setSpokenText("");
    setShowSparkle(false);
    // Brief suppress so the tail of the previous card's audio isn't misheard
    ignoreUntilRef.current = Date.now() + 600;
    lastProcessedRef.current = "";
    setEnterAnim("animate-enter-right");
    setTimeout(() => setEnterAnim(""), 400);

    // No auto-speak on card appear — TTS only fires after the user speaks
  }, [card.id]);

  useEffect(() => { prefetchAudio([targetWord], lc); }, [targetWord, lc]);
  useEffect(() => { return () => { if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current); }; }, []);

  const handleDontKnow = () => {
    if (isExiting) return;
    if (stateRef.current !== "QUESTION" && stateRef.current !== "WRONG_FIRST") return;
    // Speak the word first (so the user hears it), then move the card to the
    // back of the queue once the audio finishes.
    vibrate(40);
    setState("WRONG_FINAL");
    speakGated(targetRef.current, () => {
      animateAndAdvance("animate-slide-up", { failed: false, requeue: true });
    });
  };

  const handleKnewItAfterFinal = () => animateAndAdvance("animate-slide-up", { failed: true, requeue: false });

  // ── Derived ────────────────────────────────────────────────────────────
  const isQuestion      = state === "QUESTION";
  const isWrongFirst    = state === "WRONG_FIRST";
  const isReveal        = state === "CORRECT_REVEAL" || state === "WRONG_RETRY_CORRECT";
  const isWrongFinal    = state === "WRONG_FINAL";
  const isAnswerVisible = isReveal || isWrongFinal || isWrongFirst;
  const isGreenState    = state === "CORRECT_REVEAL" || state === "WRONG_RETRY_CORRECT";

  const answerColor = isGreenState ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.75)";
  const targetDir   = lc.rtl ? "rtl" : "ltr";
  const targetFontClass = lc.fontClass ?? "";

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center w-full">

      {/* Card stack */}
      <div className={`relative w-full max-w-[270px] ${exitAnim} ${cardAnim} animate-curl-breathe`}>

        {/* Ghost layers — peek out from the TOP */}
        <div className="absolute inset-x-4 top-[-8px] bottom-3 rounded-[28px]"
          style={{ background: bandStyle.ghost2, boxShadow: "0 -4px 16px rgba(0,0,0,0.2)" }} />
        <div className="absolute inset-x-2 top-[-4px] bottom-1.5 rounded-[28px]"
          style={{ background: bandStyle.ghost1, boxShadow: "0 -2px 10px rgba(0,0,0,0.15)" }} />

        {/* Front card — solid band colour */}
        <div
          className={`relative aspect-square overflow-hidden ${enterAnim}`}
          style={{
            borderRadius: "28px",
            background: bandStyle.cardBg,
            backgroundImage: `repeating-linear-gradient(transparent, transparent 29px, ${bandStyle.lines} 29px, ${bandStyle.lines} 30px)`,
            backgroundSize: "100% 30px",
            backgroundPositionY: "48px",
            boxShadow: "0 14px 40px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          {/* Same diagonal crack pattern as home cards */}
          <CardPattern />

          {/* Streak fire badge — top-right corner of card */}
          {streak >= 2 && (
            <div className="absolute top-3 right-3 z-20 flex items-center gap-0.5 px-2 py-1 rounded-full"
              style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(4px)" }}>
              <span className="text-[13px] leading-none">🔥</span>
              <span className="text-[11px] font-black text-white/90 leading-none">{streak}</span>
            </div>
          )}

          {/* Sparkle stars */}
          {showSparkle && (
            <>
              <span className="absolute top-7 right-9 text-white/90 leading-none pointer-events-none select-none animate-sparkle" style={{ fontSize: "22px" }}>✦</span>
              <span className="absolute bottom-10 left-9 text-white/65 leading-none pointer-events-none select-none animate-sparkle" style={{ fontSize: "14px", animationDelay: "90ms" }}>✦</span>
            </>
          )}

          {/* Card content */}
          <div className="relative w-full h-full flex flex-col items-center justify-center p-8 z-10">

            {/* QUESTION */}
            {isQuestion && (
              <h2
                className="font-black text-[2.4rem] text-center leading-tight tracking-tight"
                style={{ color: bandStyle.textColor, textShadow: "0 1px 6px rgba(0,0,0,0.18)" }}
              >
                {card.english}
              </h2>
            )}

            {/* WRONG_FIRST — reveal in white */}
            {isWrongFirst && (
              <div className="flex flex-col items-center gap-2 animate-pop-in">
                <h2 dir={targetDir} className={`font-bold text-[2rem] text-center leading-tight lowercase ${targetFontClass}`}
                  style={{ color: answerColor }}>
                  {targetWord}
                </h2>
                {spokenText && <p className="text-white/45 text-sm italic">"{spokenText}"</p>}
              </div>
            )}

            {/* CORRECT or WRONG_FINAL */}
            {(isReveal || isWrongFinal) && (
              <div className="flex flex-col items-center gap-3 animate-pop-in">
                <h2 dir={targetDir} className={`font-bold text-[2rem] text-center leading-tight lowercase ${targetFontClass}`}
                  style={{ color: answerColor }}>
                  {targetWord}
                </h2>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{card.english}</p>
                {isWrongFinal && (
                  <button
                    onClick={handleKnewItAfterFinal}
                    className="mt-1 text-[11px] font-semibold px-4 py-1.5 rounded-full transition-colors"
                    style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.2)" }}
                  >
                    I knew it
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Page curl — pass gradient as prop, no scope issue */}
          <PageCurl size={108} curl={bandStyle.curl} />
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex flex-col items-center w-full mt-10 gap-5">

        {/* Row: replay ── PTT circle ── spacer (balanced) */}
        <div className="flex items-center justify-center gap-7">

          {/* Replay / reveal button */}
          <button
            onClick={() => {
              if (isAnswerVisible) speakFrench(targetWord, undefined, lc);
              else handleDontKnow();
            }}
            className="w-[50px] h-[50px] rounded-full bg-[#252f45] flex items-center justify-center shadow-[0_4px_0_#171e30] active:shadow-[0_2px_0_#171e30] active:translate-y-[2px] transition-all flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4 text-white/40" />
          </button>

          {/* Circular PTT with expanding ripple rings */}
          <div className="relative flex items-center justify-center flex-shrink-0">
            {/* Ripple rings — staggered animate-ping, overflow beyond container (no clip) */}
            {pttStatus === "listening" && (
              <>
                <div className="absolute w-[76px] h-[76px] rounded-full bg-[#1cb0f6]/55 animate-ping" style={{ animationDuration: "1.1s" }} />
                <div className="absolute w-[76px] h-[76px] rounded-full bg-[#1cb0f6]/35 animate-ping" style={{ animationDuration: "1.1s", animationDelay: "280ms" }} />
                <div className="absolute w-[76px] h-[76px] rounded-full bg-[#1cb0f6]/18 animate-ping" style={{ animationDuration: "1.1s", animationDelay: "560ms" }} />
              </>
            )}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                if (!isMicOn) return;
                unlockAudio();
                startPTT();
              }}
              onPointerUp={() => stopPTT()}
              onPointerLeave={() => stopPTT()}
              onPointerCancel={() => cancelPTT()}
              onContextMenu={(e) => e.preventDefault()}
              className={[
                "relative z-10 w-[76px] h-[76px] rounded-full",
                "flex flex-col items-center justify-center gap-[3px]",
                "select-none touch-none transition-all duration-150",
                pttStatus === "listening"
                  ? "bg-[#1cb0f6] shadow-[0_5px_0_#1592cc,0_0_22px_rgba(28,176,246,0.45)] scale-[0.92]"
                  : isMicOn
                    ? "bg-[#252f45] shadow-[0_5px_0_#171e30] active:scale-[0.92] active:shadow-[0_2px_0_#171e30]"
                    : "bg-[#252f45] opacity-30",
              ].join(" ")}
              style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties}
            >
              {pttStatus === "listening" ? (
                <div className="flex items-center gap-[3px]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className="wave-dot"
                      data-active="true"
                      style={{ "--dot-delay": `${i * 80}ms` } as React.CSSProperties}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="12" rx="3" fill="rgba(255,255,255,0.55)" />
                    <path d="M5 10a7 7 0 0 0 14 0" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
                    <line x1="12" y1="17" x2="12" y2="21" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
                    <line x1="9" y1="21" x2="15" y2="21" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
                  </svg>
                  <span className="text-[8px] font-bold text-white/25 uppercase tracking-[0.12em] leading-none">Hold</span>
                </>
              )}
            </button>
          </div>

          {/* Spacer — mirrors the replay button for visual balance */}
          <div className="w-[50px] h-[50px] flex-shrink-0" />
        </div>

        <button
          onClick={handleDontKnow}
          className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-medium hover:text-white/45 transition-colors"
        >
          Can't speak now
        </button>
      </div>
    </div>
  );
}
