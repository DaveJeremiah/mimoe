import { CheckCircle2 } from "lucide-react";
import type { FlashcardItem } from "@/lib/flashcardData";

interface Props {
  cards: FlashcardItem[];
  failedIds: Set<string>;
  title: string;
  subtitle: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  rtl?: boolean;
}

// Universal deck-completion / performance view — inline chips, accent colors.
export function DeckComplete({
  cards, failedIds, title, subtitle, primaryLabel, onPrimary, secondaryLabel, onSecondary, rtl,
}: Props) {
  return (
    <>
      {/* Inline performance chips */}
      <div className="w-full flex flex-wrap gap-2 justify-center animate-slide-up-in pb-44">
        {cards.map(card => {
          const missed = failedIds.has(card.id);
          return (
            <span
              key={card.id}
              dir={rtl ? "rtl" : "ltr"}
              className="px-4 py-2.5 rounded-2xl border font-semibold text-sm"
              style={missed
                ? { borderColor: "rgba(236,72,153,0.45)", color: "#f472b6", background: "rgba(236,72,153,0.12)" }
                : { borderColor: "rgba(168,85,247,0.4)", color: "#c4b5fd", background: "rgba(168,85,247,0.12)" }}
            >
              {card.target ?? card.french ?? card.english}
            </span>
          );
        })}
      </div>

      {/* Action panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
        <div
          className="w-full max-w-[480px] px-5 pt-5 pb-8 animate-result-slide rounded-t-[36px]"
          style={{ background: "#160d24", borderTop: "2px solid rgba(168,85,247,0.3)" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-8 h-8" style={{ color: "#a855f7" }} />
            <div>
              <p className="font-black text-xl leading-tight" style={{ color: "#d8b4fe" }}>{title}</p>
              <p className="text-xs font-medium" style={{ color: "rgba(216,180,254,0.5)" }}>{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onPrimary}
            className="w-full h-[52px] rounded-2xl text-white font-black text-sm tracking-widest uppercase active:translate-y-1 transition-all"
            style={{ background: "linear-gradient(135deg,#9b5cf6,#ec4899)", boxShadow: "0 4px 0 #7c3aed" }}
          >
            {primaryLabel}
          </button>
          {secondaryLabel && onSecondary && (
            <button
              onClick={onSecondary}
              className="w-full mt-3 py-1.5 text-sm font-semibold"
              style={{ color: "rgba(216,180,254,0.55)" }}
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
