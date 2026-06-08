import type { Level } from "@/lib/flashcardData";
import { Check, Heart, ArrowLeft, ChevronRight } from "lucide-react";

function BgPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.1 }}
      viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <line x1="60" y1="0" x2="120" y2="200" stroke="white" strokeWidth="1.2"/>
      <line x1="140" y1="0" x2="80" y2="200" stroke="white" strokeWidth="0.6"/>
      <line x1="0" y1="70" x2="200" y2="130" stroke="white" strokeWidth="0.6"/>
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
      <div className="w-full pt-6">
        {/* Deck list (band header is now at top of FlashcardApp) */}
        <div className="flex flex-col gap-2">
          {decks.map((deck, i) => {
            const isCompleted = completedLevelIds.includes(deck.id);
            const title = stripCefrPrefix(deck.title);
            return (
              <button
                key={deck.id}
                onClick={() => onSelectLevel(deck.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 text-left active:scale-[0.98] ${
                  isCompleted ? `${band.accentBorder} ${band.accentBg}` : "border-border bg-card hover:bg-muted"
                }`}
              >
                <span className={`text-xs font-bold w-5 text-center flex-shrink-0 ${isCompleted ? band.accentText : "text-muted-foreground"}`}>
                  {i + 1}
                </span>
                <img
                  src={DECK_IMGS[deck.id] ?? DEFAULT_DECK_IMG}
                  alt=""
                  className="w-8 h-8 object-contain flex-shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{deck.cards.length} cards</p>
                </div>
                {isCompleted ? (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: band.accentBar }}>
                    <Check className="w-3 h-3 text-white" />
                  </div>
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>
            );
          })}

          {grouped.custom.length > 0 && (
            <>
              <div className="pt-2 pb-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">My levels</p>
              </div>
              {grouped.custom.map((deck, i) => {
                const isCompleted = completedLevelIds.includes(deck.id);
                return (
                  <button
                    key={deck.id}
                    onClick={() => onSelectLevel(deck.id)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 text-left active:scale-[0.98] ${
                      isCompleted ? "border-success/30 bg-success/10" : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    <span className="text-xs font-bold w-5 text-center flex-shrink-0 text-muted-foreground">{i + 1}</span>
                    <img
                      src={FE("Memo/3D/memo_3d.png")}
                      alt=""
                      className="w-8 h-8 object-contain flex-shrink-0"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight truncate">{deck.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{deck.cards.length} cards</p>
                    </div>
                    {isCompleted
                      ? <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-white" /></div>
                      : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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

  // ── HOME VIEW — 3 big vivid band cards ───────────────────────────────
  const BAND_CARDS = [
    {
      id: "A1" as const,
      // Blaze orange → hot pink → royal blue — orange leads, blue accent corner
      bg: "linear-gradient(140deg, #F97316 0%, #DB2777 55%, #1E40AF 100%)",
      shadow: "#C45F00",
      img3d: BAND_IMGS.A1,
      title: "Beginner",
      subtitle: "Greetings, numbers, core verbs",
    },
    {
      id: "A2" as const,
      // Deep emerald → sky blue → vivid indigo — 3 distinct hues, all punchy
      bg: "linear-gradient(140deg, #059669 0%, #0EA5E9 50%, #6366F1 100%)",
      shadow: "#047857",
      img3d: BAND_IMGS.A2,
      title: "Elementary",
      subtitle: "Routines, travel, past tense",
    },
    {
      id: "B1" as const,
      // Deep indigo → rich violet → electric magenta — 3 vivid stops
      bg: "linear-gradient(140deg, #4F46E5 0%, #7C3AED 50%, #C026D3 100%)",
      shadow: "#3730A3",
      img3d: BAND_IMGS.B1,
      title: "Intermediate",
      subtitle: "Opinions, work, storytelling",
    },
  ];

  return (
    <div className="w-full flex flex-col gap-3">

      {/* Bookmarked row */}
      {bookmarkedCount > 0 && onStudyBookmarked && (
        <button
          onClick={onStudyBookmarked}
          className="w-full flex items-center gap-3 p-3.5 rounded-2xl active:scale-[0.98] transition-transform"
          style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}
        >
          <Heart className="w-5 h-5 text-red-400 fill-red-400 flex-shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-foreground">Favorites</p>
            <p className="text-xs text-muted-foreground">{bookmarkedCount} saved cards</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      {/* First band card — hero (full width, tall) */}
      {BAND_CARDS.slice(0, 1).map((b) => {
        const decks = grouped[b.id] ?? [];
        const completed = decks.filter(d => completedLevelIds.includes(d.id)).length;
        const pct = decks.length > 0 ? (completed / decks.length) * 100 : 0;
        return (
          <button
            key={b.id}
            onClick={() => onSelectBand(b.id)}
            className="relative w-full overflow-hidden text-left active:scale-[0.97] transition-transform"
            style={{
              background: b.bg,
              borderRadius: "28px",
              boxShadow: `0 6px 0 ${b.shadow}, 0 12px 32px rgba(0,0,0,0.35)`,
              minHeight: "clamp(220px, 46vw, 290px)",
            }}
          >
            <BgPattern />
            <div className="absolute inset-0 p-5 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <img
                  src={b.img3d}
                  alt=""
                  className="w-20 h-20 object-contain"
                  style={{ filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.4))" }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
                />
                <span className="text-white/70 text-xs font-bold px-2 py-1 rounded-full bg-black/20">
                  {b.id} · {completed}/{decks.length}
                </span>
              </div>
              <div>
                <p className="text-white font-black text-2xl leading-tight" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.25)" }}>
                  {b.title}
                </p>
                <p className="text-white/70 text-xs mt-0.5 mb-3">{b.subtitle}</p>
                <div className="h-1.5 rounded-full bg-black/20 overflow-hidden">
                  <div className="h-full rounded-full bg-white/80 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          </button>
        );
      })}

      {/* A2 + B1 side by side */}
      <div className="grid grid-cols-2 gap-3">
        {BAND_CARDS.slice(1).map((b) => {
          const decks = grouped[b.id] ?? [];
          const completed = decks.filter(d => completedLevelIds.includes(d.id)).length;
          const pct = decks.length > 0 ? (completed / decks.length) * 100 : 0;
          return (
            <button
              key={b.id}
              onClick={() => onSelectBand(b.id)}
              className="relative overflow-hidden text-left active:scale-[0.97] transition-transform"
              style={{
                background: b.bg,
                borderRadius: "24px",
                boxShadow: `0 5px 0 ${b.shadow}, 0 10px 24px rgba(0,0,0,0.3)`,
                minHeight: "clamp(150px, 32vw, 190px)",
              }}
            >
              <BgPattern />
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <img
                    src={b.img3d}
                    alt=""
                    className="w-14 h-14 object-contain"
                    style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.4))" }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
                  />
                  <span className="text-white/60 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/20">{b.id}</span>
                </div>
                <div>
                  <p className="text-white font-black text-lg leading-tight" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>
                    {b.title}
                  </p>
                  <p className="text-white/65 text-[10px] mt-0.5 mb-2">{completed}/{decks.length} decks</p>
                  <div className="h-1 rounded-full bg-black/20 overflow-hidden">
                    <div className="h-full rounded-full bg-white/75 transition-all duration-500" style={{ width: `${pct}%` }} />
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
