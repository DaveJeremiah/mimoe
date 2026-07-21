import { Check, Plus } from "lucide-react";
import type { Level } from "@/lib/flashcardData";
import type { Collection } from "@/lib/collectionTypes";

import { LevelSelect } from "./LevelSelect";
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

export function LibraryTab({
  levels,
  completedLevelIds,
  collections,
  onSelectBand,
  activeLanguage,
  activeTab,
  onTabSwitch,
}: LibraryTabProps) {
  
  return (
    <div className="w-full flex flex-col pt-6 pb-6 px-5 min-h-[100dvh]">
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
        
        <LevelSelect
          levels={levels}
          completedLevelIds={completedLevelIds}
          onSelectLevel={() => {}}
          selectedBand={null}
          onSelectBand={onSelectBand}
          onBack={() => {}}
          activeLanguage={activeLanguage}
        />
      </div>
    </div>
  );
}
