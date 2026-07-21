import { useState } from "react";
import { Check, Play, Lock } from "lucide-react";
import type { Level } from "@/lib/flashcardData";
import { BottomSheet } from "./BottomSheet";
import { WavyLine } from "./LevelSelect";

interface NodePathProps {
  levels: Level[];
  completedLevelIds: string[];
  onStartLevel: (levelId: string) => void;
  bandTitle: string;
  onBack?: () => void;
}

export function NodePath({ levels, completedLevelIds, onStartLevel, bandTitle, onBack }: NodePathProps) {
  const [selectedNode, setSelectedNode] = useState<Level | null>(null);

  // Find first uncompleted index
  let activeIndex = levels.findIndex(l => !completedLevelIds.includes(l.id));
  if (activeIndex === -1) activeIndex = levels.length; // all completed

  return (
    <div className="w-full min-h-[100dvh] flex flex-col items-center pt-0 pb-32 relative">
      <div className="w-full mb-6 px-5 flex items-center justify-between">
        {onBack ? (
          <button onClick={onBack} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold text-white transition-colors">
            Back
          </button>
        ) : <div className="w-14" />}
        <div className="flex flex-col items-center text-center flex-1">
          <h2 className="text-white/50 font-bold uppercase tracking-widest text-xs mb-1">Current Path</h2>
          <h1 className="text-white font-black text-2xl relative">
            {bandTitle}
            <WavyLine className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-40 opacity-80" />
          </h1>
        </div>
        <div className="w-14" />
      </div>
      
      <div className="w-full flex flex-col items-center relative mt-6">
        {/* The central vertical line connecting all nodes */}
        <div className="absolute top-12 bottom-12 w-[2px] bg-white/10 left-1/2 -translate-x-1/2 z-0" />

        {levels.map((level, i) => {
          const isCompleted = i < activeIndex;
          const isActive = i === activeIndex;
          const isLocked = i > activeIndex;

          // Zig-zag offset
          const offset = i % 2 === 0 ? -45 : 45;

          return (
            <div key={level.id} className="relative z-10 w-full flex justify-center py-7">
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
