import { useState } from "react";
import { Check, Play, Lock } from "lucide-react";
import type { Level } from "@/lib/flashcardData";
import { BottomSheet } from "./BottomSheet";
import { WavyLine, BANDS, ProgressRing, getAllTiles } from "./LevelSelect";

function VerticalWavyLine({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute top-4 bottom-4 w-32 left-1/2 -translate-x-1/2 z-0 overflow-hidden ${className}`}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="wavePattern" x="0" y="0" width="128" height="240" patternUnits="userSpaceOnUse">
            <path
              d="M64 0 C140 60, -12 180, 64 240"
              stroke="#B875FF"
              strokeWidth="6"
              strokeOpacity="0.3"
              strokeLinecap="round"
              fill="none"
            />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="url(#wavePattern)" />
      </svg>
    </div>
  );
}

interface NodePathProps {
  levels: Level[];
  completedLevelIds: string[];
  onStartLevel: (levelId: string) => void;
  bandTitle: string;
  onBack?: () => void;
}

export function NodePath({ levels, completedLevelIds, onStartLevel, bandTitle, onBack }: NodePathProps) {
  const [selectedNode, setSelectedNode] = useState<Level | null>(null);

  const ALL_TILES = getAllTiles();

  // Group levels by CEFR
  const grouped: Record<string, Level[]> = {};
  for (const level of levels) {
    const cefr = level.cefr || "custom";
    if (!grouped[cefr]) grouped[cefr] = [];
    grouped[cefr].push(level);
  }

  // Only render groups that have tiles defined (A1, A2, B1, etc)
  const activeGroups = ALL_TILES.filter(tile => tile.active && grouped[tile.id]?.length > 0);

  return (
    <div className="w-full flex flex-col items-center pt-0 pb-0 relative gap-10">


      {activeGroups.map((tile, groupIdx) => {
        const groupLevels = grouped[tile.id];
        const completed = groupLevels.filter(d => completedLevelIds.includes(d.id)).length;
        const pct = groupLevels.length > 0 ? (completed / groupLevels.length) * 100 : 0;
        const [c0, c1, c2] = tile.c;
        const bandData = BANDS.find(b => b.id === tile.id);

        let activeIndex = groupLevels.findIndex(l => !completedLevelIds.includes(l.id));
        if (activeIndex === -1) activeIndex = groupLevels.length; // all completed

        return (
          <div key={tile.id} className="w-full flex flex-col items-center px-4">
            
            {/* The Huge Gradient Card -> Stacked Flashcard */}
            <div
              className={`relative sticky z-20 w-full overflow-hidden outline-none shadow-2xl flex flex-col p-6 mb-8`}
              style={{
                top: `calc(4.5rem + ${groupIdx * 1.5}rem)`, // Stack based on group index!
                borderRadius: '32px',
                minHeight: '180px',
                background: 'hsl(var(--background))',
                border: `2px solid ${c0}`,
              }}
            >
              <div className="flex-1">
                <h3 className="text-white text-2xl font-bold tracking-tight">{tile.title}</h3>
                <p className="text-white/60 text-sm mt-2 leading-snug max-w-[85%]">
                  {bandData?.subtitle || "Explore language concepts and level up your skills."}
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-4">
                {/* Badges / Pills row */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-white/5 border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                    <span className="text-white/90 text-xs font-semibold" style={{ color: c0 }}>{tile.id}</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" style={{ color: c0 }} />
                    <span className="text-white/90 text-xs font-semibold">{completed}/{groupLevels.length}</span>
                  </div>
                </div>
                
                {/* Linear Progress Tube */}
                {pct > 0 && (
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div 
                      className="h-full transition-all duration-700 ease-out" 
                      style={{ width: `${pct}%`, background: c0 }} 
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Path Track for this course */}
            <div className="w-full flex flex-col items-center relative">
              {/* Central vertical wavy line for this group */}
              <VerticalWavyLine />

              {groupLevels.map((level, i) => {
                const isCompleted = i < activeIndex;
                const isActive = i === activeIndex;
                const isLocked = i > activeIndex;
                const offset = i % 2 === 0 ? -45 : 45;

                const isVeryLastNode = groupIdx === activeGroups.length - 1 && i === groupLevels.length - 1;

                return (
                  <div key={level.id} className={`relative z-10 w-full flex justify-center pt-7 ${isVeryLastNode ? 'pb-0' : 'pb-7'}`}>
                    <button
                      onClick={() => {
                        if (!isLocked) setSelectedNode(level);
                      }}
                      className="relative group transition-transform active:scale-95 flex flex-col items-center gap-2"
                      style={{ transform: `translateX(${offset}px)` }}
                    >
                      {isActive ? (
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-[#B875FF] animate-ping opacity-30" />
                          <div className="w-20 h-20 rounded-full bg-[#B875FF] flex items-center justify-center shadow-[0_0_30px_rgba(184,117,255,0.4)]">
                            <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
                          </div>
                        </div>
                      ) : isCompleted ? (
                        <div className="w-16 h-16 rounded-full bg-[#1a1a24] border-2 border-[#B875FF]/40 flex items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
                          <Check className="w-7 h-7 text-[#B875FF]" strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-[#1a1a24] flex items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
                          <Lock className="w-6 h-6 text-white/20" />
                        </div>
                      )}
                      {/* Node Title Bubble */}
                      <div 
                        className="px-3 py-1.5 rounded-full bg-[#1a1a24] border border-white/5 text-white/70 text-[10px] font-bold max-w-[120px] truncate absolute top-full mt-2 shadow-lg"
                        style={{ backdropFilter: 'blur(8px)' }}
                      >
                        {level.title.replace(/^[AB]\d\s*·\s*/i, "").trim()}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

          </div>
        );
      })}

      <BottomSheet
        isOpen={!!selectedNode}
        onClose={() => setSelectedNode(null)}
        title={selectedNode?.title.replace(/^[AB]\d\s*·\s*/i, "").trim() || ""}
        subtitle={selectedNode ? `${selectedNode.cards.length} cards in this lesson. Master them to advance to the next step!` : ""}
        onStart={() => {
          if (selectedNode) {
            onStartLevel(selectedNode.id);
            setSelectedNode(null);
          }
        }}
      />
    </div>
  );
}
