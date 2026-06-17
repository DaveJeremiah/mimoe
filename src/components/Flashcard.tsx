import { useState, useRef, useEffect, useCallback } from "react";
import { speakFrench, speakAudioUrl, prefetchAudio, isMatch, stopAudio, unlockAudio } from "@/lib/speechUtils";
import type { FlashcardItem } from "@/lib/flashcardData";
import type { LanguageConfig } from "@/lib/languageConfig";
import { LANGUAGE_CONFIGS } from "@/lib/languageConfig";
import { usePushToTalkMic } from "@/hooks/usePushToTalkMic";
import { RipplePattern } from "./LevelSelect";
import { RefreshCw } from "lucide-react";
import logoLight from "@/assets/logo-light.png";

function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern) } catch { /* unsupported */ }
}

// iOS holds its AVAudioSession after <audio> playback; SpeechRecognition
// needs ~1 s after TTS finishes before the audio session is free.
const _isIOS = typeof navigator !== "undefined" && (
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
  (typeof window !== "undefined" && (
    (window.navigator as any).standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches
  ))
);

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
  /** When the card has custom audio, whether to play it (vs the generated voice). Controlled by parent. */
  customAudioEnabled?: boolean;
}

type CardState =
  | "QUESTION"
  | "CORRECT_REVEAL"
  | "WRONG_FIRST"
  | "WRONG_RETRY_CORRECT"
  | "WRONG_FINAL";

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

function CardPattern() {
  return <RipplePattern />;
}

export function Flashcard({
  card, onAdvance, total, remaining, streak = 0,
  isBookmarked, onToggleBookmark, isMicOn = true,
  onAnimateAdvance, langConfig, bandStyle = DEFAULT_BAND_STYLE,
  customAudioEnabled = true,
}: FlashcardProps) {
  const lc = langConfig ?? LANGUAGE_CONFIGS.french;
  const targetWord = card.target ?? card.french ?? "";

  const [state, setState]           = useState<CardState>("QUESTION");
  const [spokenText, setSpokenText] = useState("");
  const [exitAnim, setExitAnim]     = useState<string>("");
  const [enterAnim, setEnterAnim]   = useState<string>("animate-enter-up");
  const [cardAnim, setCardAnim]     = useState<string>("");
  const [isExiting, setIsExiting]   = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);

  const stateRef      = useRef<CardState>("QUESTION");
  const targetRef     = useRef(targetWord);
  const lcRef         = useRef(lc);
  const audioUrlRef   = useRef(card.audioUrl);
  const advanceTimerRef   = useRef<number | null>(null);
  const ignoreUntilRef    = useRef<number>(0);
  const lastProcessedRef  = useRef<string>("");
  const ttsGateRef        = useRef<boolean>(false);   // true while TTS is speaking
  const gateSafetyRef     = useRef<number | null>(null);
  const processAnswerRef  = useRef<(answer: string) => void>();

  // Track whether TTS is actively playing (used to disable the PTT button)
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Custom-audio source: the card has user audio AND the parent (via the
  // deck's 3-dot menu) hasn't switched to the generated voice.
  const hasCustomAudio = !!card.audioUrl;
  const useCustomAudio = hasCustomAudio && customAudioEnabled;
  const useCustomAudioRef = useRef(useCustomAudio);
  useEffect(() => { useCustomAudioRef.current = useCustomAudio; }, [useCustomAudio]);

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
      // iOS holds the AVAudioSession for up to ~1.2 s after audio ends.
      // 1500 ms gives a comfortable margin before SpeechRecognition starts.
      const postDelay = _isIOS ? 1500 : 200;
      window.setTimeout(() => {
        setIsSpeaking(false);
        ttsGateRef.current = false;
        lastProcessedRef.current = "";
        if (onDone) onDone();
      }, postDelay);
    };
    // Safety: never stay gated too long — custom uploads can be lengthy, so the
    // card always proceeds even if the clip is long or never fires 'ended'.
    gateSafetyRef.current = window.setTimeout(onFinish, 4000);
    if (audioUrlRef.current && useCustomAudioRef.current) {
      speakAudioUrl(audioUrlRef.current, onFinish);
    } else {
      speakFrench(text, onFinish, lcRef.current);
    }
  }, []);

  useEffect(() => { stateRef.current = state; },       [state]);
  useEffect(() => { targetRef.current = targetWord; }, [targetWord]);
  useEffect(() => { lcRef.current = lc; },             [lc]);
  useEffect(() => { audioUrlRef.current = card.audioUrl; }, [card.audioUrl]);

  // Sparkle on correct
  useEffect(() => {
    if (state === "CORRECT_REVEAL" || state === "WRONG_RETRY_CORRECT") {
      setShowSparkle(true);
      const t = setTimeout(() => setShowSparkle(false), 800);
      return () => clearTimeout(t);
    }
  }, [state]);


  const animateAndAdvance = useCallback((
    _exitClass: string, opts: { failed: boolean; requeue: boolean }
  ) => {
    if (isExiting) return;
    setIsExiting(true);
    setExitAnim("animate-card-flip-out");
    if (advanceTimerRef.current) { window.clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
    setTimeout(() => { setIsExiting(false); setExitAnim(""); onAdvance(opts); }, 220);
  }, [isExiting, onAdvance]);

  useEffect(() => { if (onAnimateAdvance) onAnimateAdvance(animateAndAdvance); }, [onAnimateAdvance, animateAndAdvance]);

  const processAnswer = useCallback((answer: string) => {
    const s = stateRef.current;
    if (s !== "QUESTION" && s !== "WRONG_FIRST") return;
    if (!answer.trim()) return;
    const correct = matchesCard(answer, targetRef.current, card.alternatives);

    if (s === "QUESTION") {
      if (correct) {
        // ✓ Correct 1st try → play the word, then advance once audio finishes
        vibrate(40);
        setState("CORRECT_REVEAL");
        speakGated(targetRef.current, () => {
          animateAndAdvance("animate-slide-up", { failed: false, requeue: false });
        });
      } else {
        // ✗ Wrong 1st try → speak the word as a clue, HOLD for retry (no advance)
        vibrate([60, 40, 60]);
        setState("WRONG_FIRST");
        speakGated(targetRef.current);
        // no auto-advance — mic reopens after TTS so the user can try again
      }
    } else if (s === "WRONG_FIRST") {
      if (correct) {
        // ✓ Correct 2nd try → play the word, then advance once audio finishes
        vibrate(40);
        setState("WRONG_RETRY_CORRECT");
        speakGated(targetRef.current, () => {
          animateAndAdvance("animate-slide-up", { failed: true, requeue: true });
        });
      } else {
        // ✗ Wrong 2nd try → speak the word, then advance ONCE audio finishes
        vibrate([60, 40, 60]);
        setState("WRONG_FINAL");
        speakGated(targetRef.current, () => {
          animateAndAdvance("animate-slide-up", { failed: true, requeue: true });
        });
      }
    }
  }, [card.alternatives, speakGated, animateAndAdvance]);

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
    setEnterAnim("animate-enter-up");
    setTimeout(() => setEnterAnim(""), 420);

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

      {/* ── Card stack — pure JSX recreation, no SVG dependency ── */}
      <div className={`relative w-full max-w-[420px] ${cardAnim}`}>
        <div style={{ perspective: '900px' }}>
          {/*
            Layout (% of container, aspect 570/438) — behind cards peek UP,
            horizontally centred on the front card:
              Ghost 2:    left 14%  right 14%  top 0    height 90%
              Ghost 1:    left 11%  right 11%  top 4%   height 90%
              Front card: left 8%   right 8%   top 8%   bottom 0
          */}
          <div
            className={`relative ${enterAnim} ${exitAnim}`}
            style={{ aspectRatio: '570/438', transformOrigin: 'center center' }}
          >

            {/* ── Ghost card 2 (back) ── */}
            <div
              className="absolute rounded-[20px]"
              style={{
                left: '14%', right: '14%', top: 0, height: '90%',
                background: bandStyle.ghost2,
                boxShadow: '0 6px 22px rgba(0,0,0,0.22)',
                opacity: exitAnim ? 0 : 1,
                transition: 'opacity 0.1s ease',
              }}
            />

            {/* ── Ghost card 1 (middle) ── */}
            <div
              className="absolute rounded-[22px]"
              style={{
                left: '11%', right: '11%', top: '4%', height: '90%',
                background: bandStyle.ghost1,
                boxShadow: '0 6px 18px rgba(0,0,0,0.16)',
                opacity: exitAnim ? 0 : 1,
                transition: 'opacity 0.1s ease',
              }}
            />

            {/* ── Front card ── */}
            <div
              className="absolute rounded-[24px]"
              style={{
                left: '8%', right: '8%', top: '8%', bottom: 0,
                background: bandStyle.cardBg,
                boxShadow: '0 16px 44px rgba(0,0,0,0.38), 0 2px 8px rgba(0,0,0,0.18)',
              }}
            >
              {/* Subtle top-left sheen */}
              <div className="absolute inset-0 rounded-[24px] pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, transparent 55%)' }} />

              {/* Logo at top-center */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 select-none pointer-events-none flex items-center justify-center z-20">
                <img src={logoLight} alt="" style={{ height: 20, width: 'auto', opacity: 0.9 }} />
              </div>

              {/* Streak fire badge */}
              {streak >= 2 && (
                <div className="absolute top-3 right-3 z-20 flex items-center gap-0.5 px-2 py-1 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(4px)' }}>
                  <span className="text-[13px] leading-none">🔥</span>
                  <span className="text-[11px] font-black text-white/90 leading-none">{streak}</span>
                </div>
              )}

              {/* Sparkle stars */}
              {showSparkle && (
                <>
                  <span className="absolute top-6 right-8 leading-none pointer-events-none select-none animate-sparkle"
                    style={{ fontSize: 20, color: 'rgba(255,255,255,0.8)' }}>✦</span>
                  <span className="absolute bottom-8 left-8 leading-none pointer-events-none select-none animate-sparkle"
                    style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', animationDelay: '90ms' }}>✦</span>
                </>
              )}

              {/* ── Card content — perfectly centered in front card face ── */}
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10"
                style={{ padding: '12px 28px 44px 28px' }}>

                {/* QUESTION */}
                {isQuestion && (
                  <h2
                    className="font-black text-[1.5rem] text-center leading-snug tracking-tight"
                    style={{ color: 'rgba(255,255,255,0.96)' }}
                  >
                    {card.english}
                  </h2>
                )}

                {/* WRONG_FIRST — reveal target as hint */}
                {isWrongFirst && (
                  <div className="flex flex-col items-center gap-2 animate-pop-in">
                    <h2 dir={targetDir}
                      className={`font-bold text-[1.5rem] text-center leading-snug lowercase ${targetFontClass}`}
                      style={{ color: 'rgba(255,255,255,0.96)' }}>
                      {targetWord}
                    </h2>
                    {card.transliteration && (
                      <p className="text-sm font-medium tracking-wide" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        {card.transliteration}
                      </p>
                    )}
                    {spokenText && (
                      <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.45)' }}>"{spokenText}"</p>
                    )}
                  </div>
                )}

                {/* CORRECT or WRONG_FINAL */}
                {(isReveal || isWrongFinal) && (
                  <div className="flex flex-col items-center gap-3 animate-pop-in">
                    <h2 dir={targetDir}
                      className={`font-bold text-[1.5rem] text-center leading-snug lowercase ${targetFontClass}`}
                      style={{ color: isGreenState ? '#a8f0bb' : 'rgba(255,255,255,0.96)' }}>
                      {targetWord}
                    </h2>
                    {card.transliteration && (
                      <p className="text-sm font-medium tracking-wide" style={{ color: isGreenState ? 'rgba(168,240,187,0.65)' : 'rgba(255,255,255,0.5)' }}>
                        {card.transliteration}
                      </p>
                    )}
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{card.english}</p>
                    {isWrongFinal && (
                      <button
                        onClick={handleKnewItAfterFinal}
                        className="mt-1 text-[11px] font-semibold px-4 py-1.5 rounded-full transition-colors"
                        style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.25)' }}
                      >
                        I knew it
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>


          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex flex-col items-center w-full mt-10 gap-5">

        {/* Row: replay ── PTT circle ── spacer (balanced) */}
        <div className="flex items-center justify-center gap-7">

          {/* Replay / reveal button */}
          <button
            onClick={() => {
              if (!isAnswerVisible) { handleDontKnow(); return; }
              if (hasCustomAudio && useCustomAudio) speakAudioUrl(card.audioUrl!);
              else speakFrench(targetWord, undefined, lc);
            }}
            className="w-[50px] h-[50px] rounded-full bg-[#252f45] flex items-center justify-center shadow-[0_4px_0_#171e30] active:shadow-[0_2px_0_#171e30] active:translate-y-[2px] transition-all flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4 text-white/40" />
          </button>

          {/* Push-to-talk — rotated squircle with accent gradient */}
          <div className="relative flex items-center justify-center flex-shrink-0">
            {/* Ripple rings (accent) — staggered animate-ping */}
            {pttStatus === "listening" && (
              <>
                <div className="absolute w-[78px] h-[78px] animate-ping" style={{ borderRadius: 26, transform: "rotate(45deg)", background: "rgba(192,38,211,0.45)", animationDuration: "1.1s" }} />
                <div className="absolute w-[78px] h-[78px] animate-ping" style={{ borderRadius: 26, transform: "rotate(45deg)", background: "rgba(155,92,246,0.30)", animationDuration: "1.1s", animationDelay: "280ms" }} />
                <div className="absolute w-[78px] h-[78px] animate-ping" style={{ borderRadius: 26, transform: "rotate(45deg)", background: "rgba(236,72,153,0.18)", animationDuration: "1.1s", animationDelay: "560ms" }} />
              </>
            )}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                if (!isMicOn || isSpeaking) return;
                unlockAudio();
                startPTT();
              }}
              onPointerUp={() => stopPTT()}
              onPointerLeave={() => stopPTT()}
              onPointerCancel={() => cancelPTT()}
              onTouchEnd={(e) => { e.preventDefault(); stopPTT(); }}
              onContextMenu={(e) => e.preventDefault()}
              className="relative z-10 w-[78px] h-[78px] flex items-center justify-center select-none touch-none transition-all duration-150 active:scale-[0.9]"
              style={{
                borderRadius: 26,
                transform: pttStatus === "listening" ? "rotate(45deg) scale(0.94)" : "rotate(45deg)",
                background: pttStatus === "listening"
                  ? "linear-gradient(135deg,#9b5cf6 0%,#c026d3 50%,#ec4899 100%)"
                  : "#15131f",
                boxShadow: pttStatus === "listening"
                  ? "0 0 30px rgba(192,38,211,0.6)"
                  : isMicOn
                    ? "inset 0 0 0 2px rgba(167,139,250,0.55), 0 8px 22px rgba(124,58,237,0.28)"
                    : "inset 0 0 0 2px rgba(255,255,255,0.06)",
                opacity: isSpeaking ? 0.55 : !isMicOn ? 0.35 : 1,
                cursor: isSpeaking ? "default" : "pointer",
                WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none",
              } as React.CSSProperties}
            >
              {/* counter-rotate the contents so they stay upright */}
              <div className="flex flex-col items-center justify-center gap-[3px]" style={{ transform: "rotate(-45deg)" }}>
                {pttStatus === "listening" ? (
                  <div className="flex items-center gap-[3px]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="wave-dot" data-active="true" style={{ "--dot-delay": `${i * 80}ms` } as React.CSSProperties} />
                    ))}
                  </div>
                ) : isSpeaking ? (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="rgba(255,255,255,0.45)" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                    </svg>
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-[0.12em] leading-none">Wait…</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="2" width="6" height="12" rx="3" fill="rgba(196,181,253,0.95)" />
                      <path d="M5 10a7 7 0 0 0 14 0" stroke="rgba(196,181,253,0.95)" strokeWidth="2" />
                      <line x1="12" y1="17" x2="12" y2="21" stroke="rgba(196,181,253,0.95)" strokeWidth="2" />
                      <line x1="9" y1="21" x2="15" y2="21" stroke="rgba(196,181,253,0.95)" strokeWidth="2" />
                    </svg>
                    <span className="text-[8px] font-bold uppercase tracking-[0.12em] leading-none" style={{ color: "rgba(167,139,250,0.85)" }}>Hold</span>
                  </>
                )}
              </div>
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
