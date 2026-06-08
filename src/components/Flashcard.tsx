import { useState, useRef, useEffect, useCallback } from "react";
import { speakFrench, prefetchAudio, isMatch, stopAudio } from "@/lib/speechUtils";
import type { FlashcardItem } from "@/lib/flashcardData";
import type { LanguageConfig } from "@/lib/languageConfig";
import { LANGUAGE_CONFIGS } from "@/lib/languageConfig";
import type { MicStatus } from "@/hooks/useContinuousMic";
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
  onTranscriptRef: React.MutableRefObject<(text: string, isFinal: boolean) => void>;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  isMicOn?: boolean;
  micStatus?: MicStatus;
  onToggleMic?: () => void;
  onAnimateAdvance?: (fn: (exitClass: string, opts: { failed: boolean; requeue: boolean }) => void) => void;
  langConfig?: LanguageConfig;
  bandStyle?: BandStyle;
  onPauseListening?: () => void;   // stop the mic while TTS plays (avoids scratch/echo)
  onResumeListening?: () => void;  // resume the mic after TTS, for a retry
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

// ─────────────────────────────────────────────────────────────────────────────
// iOS PWA has stricter audio-session rules — the mic session and the <audio>
// playback session can't overlap, and each takes longer to release than on Android.
const _isIOS = typeof navigator !== "undefined" && (
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
);
// Running as a standalone PWA (added to home screen) is even more restrictive.
const _isPWA = typeof window !== "undefined" &&
  ((window.navigator as any).standalone === true ||
   window.matchMedia?.("(display-mode: standalone)").matches);
// Use generous delays on iOS/PWA; tight but sufficient on Android/Chrome.
const PRE_TTS_MS  = (_isIOS || _isPWA) ? 550 : 300;  // mic teardown → audio start
const POST_TTS_MS = (_isIOS || _isPWA) ? 750 : 350;  // audio end   → mic restart

export function Flashcard({
  card, onAdvance, total, remaining, onTranscriptRef,
  isBookmarked, onToggleBookmark, isMicOn = true, micStatus = "idle", onToggleMic,
  onAnimateAdvance, langConfig, bandStyle = DEFAULT_BAND_STYLE,
  onPauseListening, onResumeListening,
}: FlashcardProps) {
  const lc = langConfig ?? LANGUAGE_CONFIGS.french;
  const targetWord = card.target ?? card.french ?? "";

  // Keep latest pause/resume callbacks in refs (used inside stable speakGated)
  const pauseListeningRef  = useRef(onPauseListening);
  const resumeListeningRef = useRef(onResumeListening);
  useEffect(() => { pauseListeningRef.current = onPauseListening; }, [onPauseListening]);
  useEffect(() => { resumeListeningRef.current = onResumeListening; }, [onResumeListening]);

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

  // Speak the target word and FULLY block the mic until the audio finishes,
  // so the spoken word isn't picked up by the recognizer as the user's answer.
  // onDone (optional) runs AFTER the audio truly ends — used to advance the card
  // only once playback is complete, so audio never bleeds into the next card.
  const speakGated = useCallback((text: string, onDone?: () => void) => {
    ttsGateRef.current = true;
    // Stop recording first. A live recording makes Android route audio through
    // its voice/echo-cancel path; tearing it down mid-playback switches the audio
    // mode and glitches the word ("stops mid-word"). So we stop the mic, wait for
    // it to fully release, THEN play — clean audio with no mid-word hitch.
    pauseListeningRef.current?.();
    if (gateSafetyRef.current) window.clearTimeout(gateSafetyRef.current);
    let finished = false;
    const onFinish = () => {
      if (finished) return;
      finished = true;
      if (gateSafetyRef.current) { window.clearTimeout(gateSafetyRef.current); gateSafetyRef.current = null; }
      // Small tail so the recognizer's trailing buffer is dropped, then either
      // advance (onDone) or resume listening for the user's retry.
      // iOS/PWA needs a longer tail — the audio session takes more time to vacate.
      window.setTimeout(() => {
        ttsGateRef.current = false;
        lastProcessedRef.current = "";
        if (onDone) onDone();
        else resumeListeningRef.current?.();   // staying on card → listen again
      }, POST_TTS_MS);
    };
    // Safety: never stay gated more than 6.5s in case the audio end never fires
    gateSafetyRef.current = window.setTimeout(onFinish, 6500);
    // Let the mic fully release before playing, so the audio-session switch
    // happens BEFORE playback rather than mid-word.  iOS/PWA needs longer here.
    window.setTimeout(() => speakFrench(text, onFinish, lcRef.current), PRE_TTS_MS);
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

  useEffect(() => {
    onTranscriptRef.current = (transcript: string, isFinal: boolean) => {
      const s = stateRef.current;
      if (s !== "QUESTION" && s !== "WRONG_FIRST") return;
      if (ttsGateRef.current) return;                       // TTS speaking — ignore its echo
      if (Date.now() < ignoreUntilRef.current) return;
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

      {/* Waveform + square buttons */}
      <div className="flex gap-3 w-full max-w-[340px] mt-10">
        <button
          onClick={onToggleMic}
          className={`flex-1 h-[60px] rounded-2xl flex items-center justify-center gap-[4px] select-none transition-all duration-200
            ${isMicOn
              ? "bg-[#1cb0f6] shadow-[0_5px_0_#1592cc] active:shadow-[0_2px_0_#1592cc] active:translate-y-[3px]"
              : "bg-[#252f45] shadow-[0_5px_0_#171e30] active:shadow-[0_2px_0_#171e30] active:translate-y-[3px]"
            }`}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="wave-dot"
              data-active={micStatus === "listening" ? "true" : "false"}
              style={{ "--dot-delay": `${i * 80}ms` } as React.CSSProperties}
            />
          ))}
        </button>

        <button
          onClick={() => {
            if (isAnswerVisible) speakFrench(targetWord, undefined, lc);
            else handleDontKnow();
          }}
          className="w-[60px] h-[60px] rounded-2xl bg-[#252f45] flex items-center justify-center shadow-[0_5px_0_#171e30] active:shadow-[0_2px_0_#171e30] active:translate-y-[3px] transition-all"
        >
          <RefreshCw className="w-5 h-5 text-white/45" />
        </button>
      </div>

      <button
        onClick={handleDontKnow}
        className="mt-5 text-[10px] uppercase tracking-[0.18em] text-white/25 font-medium hover:text-white/45 transition-colors"
      >
        Can't speak now
      </button>
    </div>
  );
}
