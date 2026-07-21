import { useState } from "react";
import type { Level } from "@/lib/flashcardData";
import { Check, Star, ArrowLeft, ChevronRight } from "lucide-react";

// Concentric ripple rings — SVG circles expanding from a bottom-center origin.
// Light-hit overlay — top-left highlight + bottom-right shadow gives cards
// a tactile "held in light" feel. Pure CSS, works on any gradient.
export function CardShine({ strong = false }: { strong?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{
        borderRadius: "inherit",
        background: [
          `radial-gradient(ellipse at 18% 18%, rgba(255,255,255,${strong ? "0.30" : "0.22"}) 0%, transparent 58%)`,
          `radial-gradient(ellipse at 82% 82%, rgba(0,0,0,${strong ? "0.22" : "0.16"}) 0%, transparent 52%)`,
        ].join(", "),
      }}
    />
  );
}

// Keep name alias so Flashcard / CollectionCard imports don't break
export const RipplePattern = CardShine;

export function WavyLine({ className = "", colors = ["#e05070", "#e07030"] }: { className?: string; colors?: [string, string] }) {
  const id = `wg-${colors[0].replace("#","")}-${colors[1].replace("#","")}`;
  return (
    <svg viewBox="0 0 320 28" fill="none" className={`w-full ${className}`} preserveAspectRatio="none" style={{ height: 22 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      <path
        d="M0 18 C40 5, 80 26, 120 18 C160 9, 200 26, 240 18 C270 10, 300 22, 320 14"
        stroke={`url(#${id})`} strokeWidth="2.5" strokeLinecap="round" fill="none"
      />
    </svg>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 34 34" width={36} height={36} style={{ flexShrink: 0 }} aria-hidden="true">
      <circle cx="17" cy="17" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" />
      <circle
        cx="17" cy="17" r={r}
        fill="none"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="2.5"
        strokeDasharray={`${circ * pct / 100} ${circ}`}
        strokeLinecap="round"
        style={{ transform: "rotate(-90deg)", transformOrigin: "17px 17px", transition: "stroke-dasharray 0.5s ease" }}
      />
      <text x="17" y="21" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" opacity="0.9">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

interface LevelSelectProps {
  levels: Level[];
  completedLevelIds: string[];
  onSelectLevel: (levelId: string) => void;
  onAddLevel?: () => void;
  bookmarkedCount?: number;
  onStudyBookmarked?: () => void;
  selectedBand: "A1" | "A2" | "B1" | null;
  onSelectBand: (band: "A1" | "A2" | "B1") => void;
  onBack: () => void;
  activeLanguage?: string;
}

// Colors match the home band cards exactly
export const BANDS = [
  {
    id: "A1" as const,
    label: "A1",
    title: "Your starting point",
    subtitle: "Greetings, numbers, core verbs, basics",
    emoji: "🌱",
    hex: "#FF5F6D",
    accentBg: "bg-[#FF5F6D]/10",
    accentBorder: "border-[#FF5F6D]/30",
    accentText: "text-[#FF5F6D]",
    accentBadge: "bg-[#FF5F6D]/20 text-[#FF5F6D]",
    accentBar: "#FF5F6D",
  },
  {
    id: "A2" as const,
    label: "A2",
    title: "Daily life",
    subtitle: "Routines, travel, shopping, past tense",
    emoji: "🌿",
    hex: "#06D6A0",
    accentBg: "bg-[#06D6A0]/10",
    accentBorder: "border-[#06D6A0]/30",
    accentText: "text-[#06D6A0]",
    accentBadge: "bg-[#06D6A0]/20 text-[#06D6A0]",
    accentBar: "#06D6A0",
  },
  {
    id: "B1" as const,
    label: "B1",
    title: "Real conversation",
    subtitle: "Opinions, work, emotions, storytelling",
    emoji: "🌳",
    hex: "#7B61FF",
    accentBg: "bg-[#7B61FF]/10",
    accentBorder: "border-[#7B61FF]/30",
    accentText: "text-[#7B61FF]",
    accentBadge: "bg-[#7B61FF]/20 text-[#7B61FF]",
    accentBar: "#7B61FF",
  },
] as const;

// Fluent UI Emoji 3D — free, MIT-licensed, hosted on jsDelivr CDN
const FE = (p: string) =>
  `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/${p}`;

export const BAND_IMGS = {
  A1: FE("Seedling/3D/seedling_3d.png"),
  A2: FE("Herb/3D/herb_3d.png"),
  B1: FE("Deciduous%20tree/3D/deciduous_tree_3d.png"),
};

const DECK_IMGS: Record<string, string> = {
  // French vocab A1
  "fr-v-a1-1": FE("Waving%20hand/3D/waving_hand_3d_default.png"),
  "fr-v-a1-2": FE("Abacus/3D/abacus_3d.png"),
  "fr-v-a1-3": FE("Calendar/3D/calendar_3d.png"),
  "fr-v-a1-4": FE("High%20voltage/3D/high_voltage_3d.png"),
  "fr-v-a1-5": FE("Family/3D/family_3d.png"),
  "fr-v-a1-6": FE("Fork%20and%20knife%20with%20plate/3D/fork_and_knife_with_plate_3d.png"),
  "fr-v-a1-7": FE("World%20map/3D/world_map_3d.png"),
  // French vocab A2
  "fr-v-a2-1": FE("Sparkles/3D/sparkles_3d.png"),
  "fr-v-a2-2": FE("Sunrise/3D/sunrise_3d.png"),
  "fr-v-a2-3": FE("Shopping%20bags/3D/shopping_bags_3d.png"),
  "fr-v-a2-4": FE("Train/3D/train_3d.png"),
  "fr-v-a2-5": FE("Hospital/3D/hospital_3d.png"),
  // French vocab B1
  "fr-v-b1-1": FE("Speech%20balloon/3D/speech_balloon_3d.png"),
  "fr-v-b1-2": FE("Briefcase/3D/briefcase_3d.png"),
  "fr-v-b1-3": FE("Red%20heart/3D/red_heart_3d.png"),
  "fr-v-b1-4": FE("Mobile%20phone/3D/mobile_phone_3d.png"),
  // French phrases A1
  "fr-p-a1-1": FE("Person%20raising%20hand/3D/person_raising_hand_3d_default.png"),
  "fr-p-a1-2": FE("SOS%20button/3D/sos_button_3d.png"),
  "fr-p-a1-3": FE("Hot%20beverage/3D/hot_beverage_3d.png"),
  // French phrases A2
  "fr-p-a2-1": FE("Tear-off%20calendar/3D/tear-off_calendar_3d.png"),
  "fr-p-a2-2": FE("Fast%20reverse%20button/3D/fast_reverse_button_3d.png"),
  "fr-p-a2-3": FE("Sun%20with%20face/3D/sun_with_face_3d.png"),
  // French phrases B1
  "fr-p-b1-1": FE("Speaking%20head/3D/speaking_head_3d.png"),
  "fr-p-b1-2": FE("Crystal%20ball/3D/crystal_ball_3d.png"),
  "fr-p-b1-3": FE("Clipboard/3D/clipboard_3d.png"),
  "fr-p-b1-4": FE("Open%20book/3D/open_book_3d.png"),
  // Arabic
  "ar-v-a1-1": FE("Waving%20hand/3D/waving_hand_3d_default.png"),
  "ar-v-a1-2": FE("House/3D/house_3d.png"),
  "ar-v-a1-3": FE("Abacus/3D/abacus_3d.png"),
  "ar-p-a1-1": FE("Person%20raising%20hand/3D/person_raising_hand_3d_default.png"),
  "ar-p-a1-2": FE("World%20map/3D/world_map_3d.png"),
};
const DEFAULT_DECK_IMG = FE("Open%20book/3D/open_book_3d.png");

function stripCefrPrefix(title: string): string {
  return title.replace(/^[AB]\d\s*·\s*/i, "").trim();
}

export function LevelSelect({
  levels,
  completedLevelIds,
  onSelectLevel,
  onAddLevel,
  bookmarkedCount = 0,
  onStudyBookmarked,
  selectedBand,
  onSelectBand,
  onBack,
  activeLanguage = "french",
}: LevelSelectProps) {

  const grouped: Record<string, Level[]> = { A1: [], A2: [], B1: [], custom: [] };
  for (const level of levels) {
    if (level.cefr && grouped[level.cefr]) {
      grouped[level.cefr].push(level);
    } else {
      grouped.custom.push(level);
    }
  }

  // ── DECK LIST VIEW ────────────────────────────────────────────────────
  if (selectedBand) {
    const band = BANDS.find(b => b.id === selectedBand)!;
    const decks = grouped[selectedBand] ?? [];
    const completedInBand = decks.filter(d => completedLevelIds.includes(d.id)).length;

    return (
      <div className="w-full pt-2 px-1">
        <div className="flex flex-col gap-4">
          {decks.map((deck, i) => {
            const isCompleted = completedLevelIds.includes(deck.id);
            const title = stripCefrPrefix(deck.title);
            return (
              <button
                key={deck.id}
                onClick={() => onSelectLevel(deck.id)}
                className={`relative w-full flex items-center gap-3 p-4 rounded-[28px] transition-all duration-200 text-left active:scale-[0.97] overflow-hidden`}
                style={{
                  background: isCompleted ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
                  border: isCompleted ? `1px solid ${band.hex}40` : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.2)"
                }}
              >
                {/* Subtle glass reflection */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)" }} />
                
                <img
                  src={DECK_IMGS[deck.id] ?? DEFAULT_DECK_IMG}
                  alt=""
                  className="w-10 h-10 object-contain flex-shrink-0 relative z-10"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
                />
                <div className="flex-1 min-w-0 relative z-10">
                  <p className="text-sm font-bold text-white leading-tight truncate">{title}</p>
                  
                  {/* Pills */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="bg-black/40 border border-white/5 rounded-full px-2 py-0.5 flex items-center">
                      <span className="text-white/70 text-[10px] font-semibold">{deck.cards.length} cards</span>
                    </div>
                    {isCompleted && (
                      <div className="bg-black/40 border border-white/5 rounded-full px-2 py-0.5 flex items-center gap-1" style={{ borderColor: `${band.hex}30` }}>
                        <Check className="w-3 h-3" style={{ color: band.hex }} />
                        <span className="text-[10px] font-semibold" style={{ color: band.hex }}>Done</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {!isCompleted && (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 relative z-10 backdrop-blur-md border border-white/10">
                    <ChevronRight className="w-4 h-4 text-white/50" />
                  </div>
                )}
              </button>
            );
          })}

          {grouped.custom.length > 0 && (
            <>
              <div className="pt-2 pb-1">
                <p className="text-xs text-white/50 uppercase tracking-wider font-bold px-2">My levels</p>
              </div>
              {grouped.custom.map((deck, i) => {
                const isCompleted = completedLevelIds.includes(deck.id);
                return (
                  <button
                    key={deck.id}
                    onClick={() => onSelectLevel(deck.id)}
                    className={`relative w-full flex items-center gap-3 p-4 rounded-[28px] transition-all duration-200 text-left active:scale-[0.97] overflow-hidden`}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: isCompleted ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.2)"
                    }}
                  >
                    {/* Subtle glass reflection */}
                    <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)" }} />
                    
                    <img
                      src={FE("Memo/3D/memo_3d.png")}
                      alt=""
                      className="w-10 h-10 object-contain flex-shrink-0 relative z-10"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
                    />
                    <div className="flex-1 min-w-0 relative z-10">
                      <p className="text-sm font-bold text-white leading-tight truncate">{deck.title}</p>
                      
                      {/* Pills */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="bg-black/40 border border-white/5 rounded-full px-2 py-0.5 flex items-center">
                          <span className="text-white/70 text-[10px] font-semibold">{deck.cards.length} cards</span>
                        </div>
                        {isCompleted && (
                          <div className="bg-black/40 border border-white/5 rounded-full px-2 py-0.5 flex items-center gap-1 border-emerald-500/30">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 text-[10px] font-semibold">Done</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {!isCompleted && (
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 relative z-10 backdrop-blur-md border border-white/10">
                        <ChevronRight className="w-4 h-4 text-white/50" />
                      </div>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── HOME VIEW — Microsoft-style glass tiles ──────────────────────────
  const scenicBg = activeLanguage === "arabic" ? "/images/ar-a1-bg.png" : "/images/a1-bg.png";

  const ALL_TILES = [
    {
      id: "A1" as const,
      title: "Beginner",
      c: activeLanguage === "arabic"
        ? ["#C86428", "#E8A020", "#F5C842"]
        : ["#C9856A", "#ECBEB4", "#4A9E8A"],
      active: true,
      wide: true,
      img3d: BAND_IMGS.A1 as string | undefined,
    },
    {
      id: "A2" as const,
      title: "Elementary",
      c: ["#047857", "#0EA5E9", "#6366F1"],
      active: true,
      wide: false,
      img3d: BAND_IMGS.A2 as string | undefined,
    },
    {
      id: "B1" as const,
      title: "Intermediate",
      c: ["#4F46E5", "#7C3AED", "#C026D3"],
      active: true,
      wide: false,
      img3d: BAND_IMGS.B1 as string | undefined,
    },
    { id: "B2", title: "Upper-Inter.",  c: ["#334155", "#475569", "#64748B"], active: false, wide: false, img3d: undefined },
    { id: "C1", title: "Advanced",      c: ["#1E293B", "#334155", "#475569"], active: false, wide: false, img3d: undefined },
    { id: "C2", title: "Mastery",       c: ["#0F172A", "#1E293B", "#334155"], active: false, wide: true,  img3d: undefined },
  ];

  return (
    <div className="w-full flex flex-col gap-4">

      {/* Favorites */}
      {bookmarkedCount > 0 && onStudyBookmarked && (
        <button
          onClick={onStudyBookmarked}
          className="w-full flex items-center gap-3 p-3.5 rounded-2xl active:scale-[0.98] transition-transform"
          style={{ background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.28)" }}
        >
          <Star className="w-5 h-5 text-amber-400 fill-amber-400 flex-shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-foreground">Favorites</p>
            <p className="text-xs text-muted-foreground">{bookmarkedCount} saved cards</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      {/* Tile grid — glassmorphic cards */}
      <div className="flex flex-col gap-6 px-1">
        {ALL_TILES.map((tile) => {
          const decks = tile.active ? (grouped[tile.id as "A1" | "A2" | "B1"] ?? []) : [];
          const completed = decks.filter(d => completedLevelIds.includes(d.id)).length;
          const pct = decks.length > 0 ? (completed / decks.length) * 100 : 0;
          const [c0, c1, c2] = tile.c;
          const bandData = BANDS.find(b => b.id === tile.id);

          return (
            <button
              key={tile.id}
              onClick={() => { if (tile.active) onSelectBand(tile.id as "A1" | "A2" | "B1"); }}
              className={`relative overflow-hidden outline-none transition-opacity shadow-2xl ${tile.active ? "active:scale-[0.98]" : "cursor-default opacity-80"}`}
              style={{
                borderRadius: 32,
                minHeight: 280,
                transformOrigin: "center center"
              }}
            >
              {/* Bokeh gradient for all tiles */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `
                    radial-gradient(circle at 20% 30%, ${c0} 0%, transparent 60%),
                    radial-gradient(circle at 80% 20%, ${c1} 0%, transparent 60%),
                    radial-gradient(circle at 50% 80%, ${c2} 0%, transparent 60%),
                    #1a1a24
                  `,
                }}
              />

              {/* Top Right Progress Ring */}
              {tile.active && (
                <div className="absolute top-4 right-4 z-20">
                  <ProgressRing pct={pct} />
                </div>
              )}

              {/* Bottom Glass Pane */}
              <div 
                className="absolute bottom-0 left-0 right-0 flex flex-col justify-end p-5"
                style={{
                  minHeight: "50%",
                  background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.85) 100%)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  borderTop: "1px solid rgba(255,255,255,0.05)"
                }}
              >
                <div className="relative z-10 text-left">
                  <h3 className="text-white text-2xl font-bold tracking-tight">{tile.title}</h3>
                  <p className="text-white/70 text-sm mt-1 leading-snug line-clamp-2">
                    {bandData?.subtitle || "Explore language concepts and level up your skills."}
                  </p>

                  {/* Badges / Pills row */}
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    {/* ID Pill */}
                    <div className="bg-white/10 border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                      <span className="text-white/90 text-xs font-semibold">{tile.id}</span>
                    </div>

                    {/* Progress Pill */}
                    {tile.active ? (
                      <div className="bg-white/10 border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-white/70" />
                        <span className="text-white/90 text-xs font-semibold">{completed}/{decks.length}</span>
                      </div>
                    ) : (
                      <div className="bg-white/10 border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                        <span className="text-white/90 text-xs font-semibold tracking-wide uppercase">Soon</span>
                      </div>
                    )}

                    {/* Percentage Pill */}
                    {tile.active && pct > 0 && (
                      <div className="bg-white/10 border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 rounded-full" style={{ background: "conic-gradient(from 0deg, white " + pct + "%, rgba(255,255,255,0.2) 0)" }} />
                        <span className="text-white/90 text-xs font-semibold">{Math.round(pct)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

    </div>
  );
}
