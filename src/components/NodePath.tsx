import { useState } from "react";
import { Check, Play, Lock } from "lucide-react";
import type { Level } from "@/lib/flashcardData";
import { BottomSheet } from "./BottomSheet";
import { WavyLine, BANDS, ProgressRing, getAllTiles } from "./LevelSelect";

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
      
      {/* Sticky Header */}
      <div className="sticky top-0 w-full z-50 bg-[#0f0f13]/80 backdrop-blur-xl border-b border-white/5 py-4 px-5 flex items-center justify-center mb-2">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-white/50 font-bold uppercase tracking-widest text-[10px] mb-0.5">Current Path</h2>
          <h1 className="text-white font-black text-xl relative">
            {bandTitle}
            <WavyLine className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-32 opacity-80" />
          </h1>
        </div>
      </div>

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
            
            {/* The Huge Gradient Card */}
            <div
              className={`relative overflow-hidden outline-none transition-opacity shadow-2xl w-full mb-8`}
              style={{
                borderRadius: 24,
                minHeight: 160,
              }}
            >
              {/* Bokeh gradient */}
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
              <div className="absolute top-4 right-4 z-20">
                <ProgressRing pct={pct} />
              </div>

              {/* Bottom Glass Pane */}
              <div 
                className="absolute bottom-0 left-0 right-0 flex flex-col justify-end p-5"
                style={{
                  minHeight: "50%",
                  background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.85) 100%)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)"
                }}
              >
                <div className="relative z-10 text-left">
                  <h3 className="text-white text-2xl font-bold tracking-tight">{tile.title}</h3>
                  <p className="text-white/70 text-sm mt-1 leading-snug line-clamp-2">
                    {bandData?.subtitle || "Explore language concepts and level up your skills."}
                  </p>

                  {/* Badges / Pills row */}
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <div className="bg-white/10 border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                      <span className="text-white/90 text-xs font-semibold">{tile.id}</span>
                    </div>
                    <div className="bg-white/10 border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-white/70" />
                      <span className="text-white/90 text-xs font-semibold">{completed}/{groupLevels.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Path Track for this course */}
            <div className="w-full flex flex-col items-center relative">
              {/* Central vertical line for this group */}
              <div className="absolute top-4 bottom-4 w-[2px] bg-white/10 left-1/2 -translate-x-1/2 z-0" />

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
