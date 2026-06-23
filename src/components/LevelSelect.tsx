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
const BANDS = [
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
      <div className="w-full pt-2">
        {/* Deck list — always 2-col grid, compact cards */}
        <div className="grid grid-cols-2 gap-2">
          {decks.map((deck, i) => {
            const isCompleted = completedLevelIds.includes(deck.id);
            const title = stripCefrPrefix(deck.title);
            return (
              <button
                key={deck.id}
                onClick={() => onSelectLevel(deck.id)}
                className={`w-full flex items-center gap-2.5 p-3 rounded-2xl transition-all duration-200 text-left active:scale-[0.97] ${
                  isCompleted ? `${band.accentBorder} ${band.accentBg} border` : "bg-card hover:bg-muted"
                }`}
                style={!isCompleted ? { border: '1px solid rgba(255,255,255,0.07)' } : undefined}
              >
                <span className={`text-xs font-bold w-4 text-center flex-shrink-0 ${isCompleted ? band.accentText : "text-muted-foreground"}`}>
                  {i + 1}
                </span>
                <img
                  src={DECK_IMGS[deck.id] ?? DEFAULT_DECK_IMG}
                  alt=""
                  className="w-7 h-7 object-contain flex-shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-tight truncate">{title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{deck.cards.length} cards</p>
                </div>
                {isCompleted ? (
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: band.accentBar }}>
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                )}
              </button>
            );
          })}

          {grouped.custom.length > 0 && (
            <>
              <div className="pt-2 pb-1 col-span-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">My levels</p>
              </div>
              {grouped.custom.map((deck, i) => {
                const isCompleted = completedLevelIds.includes(deck.id);
                return (
                  <button
                    key={deck.id}
                    onClick={() => onSelectLevel(deck.id)}
                    className={`w-full flex items-center gap-2.5 p-3 rounded-2xl transition-all duration-200 text-left active:scale-[0.97] ${
                      isCompleted ? "border border-success/30 bg-success/10" : "bg-card hover:bg-muted"
                    }`}
                    style={!isCompleted ? { border: '1px solid rgba(255,255,255,0.07)' } : undefined}
                  >
                    <span className="text-xs font-bold w-4 text-center flex-shrink-0 text-muted-foreground">{i + 1}</span>
                    <img
                      src={FE("Memo/3D/memo_3d.png")}
                      alt=""
                      className="w-7 h-7 object-contain flex-shrink-0"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground leading-tight truncate">{deck.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{deck.cards.length} cards</p>
                    </div>
                    {isCompleted
                      ? <div className="w-4 h-4 rounded-full bg-success flex items-center justify-center flex-shrink-0"><Check className="w-2.5 h-2.5 text-white" /></div>
                      : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    }
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
  const ALL_TILES = [
    {
      id: "A1" as const,
      title: "Beginner",
      subtitle: "Greetings, numbers, core verbs",
      c: activeLanguage === "arabic"
        ? ["#C86428", "#E8A020", "#F5C842"]
        : ["#C9856A", "#ECBEB4", "#4A9E8A"],
      active: true,
      wide: true,
    },
    {
      id: "A2" as const,
      title: "Elementary",
      subtitle: "Routines, travel, past tense",
      c: ["#047857", "#0EA5E9", "#6366F1"],
      active: true,
      wide: false,
    },
    {
      id: "B1" as const,
      title: "Intermediate",
      subtitle: "Opinions, storytelling",
      c: ["#4F46E5", "#7C3AED", "#C026D3"],
      active: true,
      wide: false,
    },
    {
      id: "B2",
      title: "Upper-Inter.",
      subtitle: "Nuance & debate",
      c: ["#334155", "#475569", "#64748B"],
      active: false,
      wide: false,
    },
    {
      id: "C1",
      title: "Advanced",
      subtitle: "Fluency & professional",
      c: ["#1E293B", "#334155", "#475569"],
      active: false,
      wide: false,
    },
    {
      id: "C2",
      title: "Mastery",
      subtitle: "Near-native proficiency",
      c: ["#0F172A", "#1E293B", "#334155"],
      active: false,
      wide: true,
    },
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

      {/* Tile grid */}
      <div className="grid grid-cols-2 gap-3">
        {ALL_TILES.map((tile) => {
          const decks = tile.active ? (grouped[tile.id as "A1" | "A2" | "B1"] ?? []) : [];
          const completed = decks.filter(d => completedLevelIds.includes(d.id)).length;
          const pct = decks.length > 0 ? (completed / decks.length) * 100 : 0;
          const [c0, c1, c2] = tile.c;

          return (
            <button
              key={tile.id}
              onClick={() => { if (tile.active) onSelectBand(tile.id as "A1" | "A2" | "B1"); }}
              className={`relative overflow-hidden transition-transform outline-none ${
                tile.wide ? "col-span-2" : "col-span-1"
              } ${tile.active ? "active:scale-[0.97]" : "cursor-default"}`}
              style={{
                borderRadius: 20,
                minHeight: tile.wide
                  ? "clamp(88px, 19vw, 118px)"
                  : "clamp(115px, 27vw, 158px)",
              }}
            >
              {/* Bokeh background */}
              <div
                className="absolute pointer-events-none"
                style={{
                  inset: "-50%",
                  background: `
                    radial-gradient(ellipse at 22% 30%, ${c0}dd 0%, transparent 52%),
                    radial-gradient(ellipse at 75% 20%, ${c1}cc 0%, transparent 48%),
                    radial-gradient(ellipse at 55% 82%, ${c2}bb 0%, transparent 52%),
                    ${c0}88
                  `,
                  filter: "blur(26px)",
                }}
              />

              {/* Darken for coming-soon */}
              {!tile.active && (
                <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(0,0,0,0.55)" }} />
              )}

              {/* Glass edge */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  borderRadius: 20,
                  border: `1px solid ${tile.active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)"}`,
                  boxShadow: tile.active ? "inset 0 1px 0 rgba(255,255,255,0.13), 0 8px 28px rgba(0,0,0,0.4)" : "none",
                }}
              />

              {/* Shine on active tiles */}
              {tile.active && <CardShine />}

              {/* Content */}
              <div className="relative z-10 p-4 h-full flex flex-col justify-between" style={{ minHeight: "inherit" }}>
                {/* Top: band code + count / soon badge */}
                <div className="flex items-start justify-between">
                  <span
                    className="font-black tracking-[0.22em] uppercase"
                    style={{
                      fontFamily: "'Courier New', monospace",
                      fontSize: 10,
                      color: tile.active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)",
                    }}
                  >
                    {tile.id}
                  </span>
                  {tile.active ? (
                    <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.38)" }}>
                      {completed}/{decks.length}
                    </span>
                  ) : (
                    <span
                      className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                      style={{ color: "rgba(255,255,255,0.28)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      Soon
                    </span>
                  )}
                </div>

                {/* Bottom: title + progress ring */}
                <div className="flex items-end justify-between">
                  <p
                    className="font-black leading-tight"
                    style={{
                      fontSize: tile.wide ? 17 : 14,
                      color: tile.active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {tile.title}
                  </p>
                  {tile.active && <ProgressRing pct={pct} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

    </div>
  );
}
