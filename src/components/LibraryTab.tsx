import { Check, Plus } from "lucide-react";
import type { Level } from "@/lib/flashcardData";
import type { Collection } from "@/lib/collectionTypes";

import { CollectionCard } from "./CollectionCard";
import { COLLECTION_CATEGORIES } from "@/lib/collectionTypes";

interface LibraryTabProps {
  levels: Level[];
  completedLevelIds: string[];
  collections: Collection[];
  onSelectBand: (band: "A1" | "A2" | "B1") => void;
  activeLanguage: string;
  activeTab: "vocabulary" | "phrases";
  onTabSwitch: (tab: "vocabulary" | "phrases") => void;
}

export const BANDS = [
  { id: "A1" as const, title: "Beginner", icon: "🌱" },
  { id: "A2" as const, title: "Elementary", icon: "🌿" },
  { id: "B1" as const, title: "Intermediate", icon: "🌳" },
];

export function LibraryTab({
  levels,
  completedLevelIds,
  collections,
  onSelectBand,
  activeLanguage,
  activeTab,
  onTabSwitch,
}: LibraryTabProps) {
  
  const grouped: Record<string, Level[]> = { A1: [], A2: [], B1: [] };
  for (const level of levels) {
    if (level.cefr && grouped[level.cefr]) {
      grouped[level.cefr].push(level);
    }
  }

  return (
    <div className="w-full flex flex-col pt-6 pb-24 px-5 min-h-[100dvh]">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-white text-3xl font-bold">Courses</h1>
        <div className="flex bg-white/5 p-1 rounded-xl">
          <button
            onClick={() => onTabSwitch("vocabulary")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              activeTab === "vocabulary" ? "bg-[#B875FF] text-white" : "text-white/40"
            }`}
          >
            Vocab
          </button>
          <button
            onClick={() => onTabSwitch("phrases")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              activeTab === "phrases" ? "bg-[#B875FF] text-white" : "text-white/40"
            }`}
          >
            Phrases
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">My courses</h2>
        </div>
        
        <div className="flex flex-col gap-3">
          {BANDS.map(band => {
            const decks = grouped[band.id] || [];
            const completed = decks.filter(d => completedLevelIds.includes(d.id)).length;
            const pct = decks.length > 0 ? Math.round((completed / decks.length) * 100) : 0;
            const isActive = pct > 0;

            return (
              <button
                key={band.id}
                onClick={() => onSelectBand(band.id)}
                className={`w-full flex items-center justify-between p-4 rounded-[20px] transition-all ${
                  isActive ? "bg-white/5 border border-white/10" : "bg-transparent border border-white/5"
                } active:scale-[0.98] hover:bg-white/10`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5">
                    <span className="text-lg">{band.icon}</span>
                  </div>
                  <div className="text-left">
                    <h3 className="text-white font-semibold text-base">{band.id} · {band.title}</h3>
                    <p className="text-white/40 text-xs mt-0.5">{decks.length} levels</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {pct === 100 ? (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#B875FF]">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  ) : (
                    <span className="text-white/60 font-semibold text-sm">{pct}%</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
