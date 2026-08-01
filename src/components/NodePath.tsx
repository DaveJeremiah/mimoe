import React, { useState, useEffect, useRef } from "react";
import { Check, Play, Lock } from "lucide-react";
import type { Level } from "@/lib/flashcardData";
import { BottomSheet } from "./BottomSheet";
import { WavyLine, BANDS, ProgressRing, getAllTiles } from "./LevelSelect";

function DynamicPathLine({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute top-0 bottom-0 left-1/2 w-[2px] z-0 overflow-visible ${className}`}>
      <svg width="2" height="100%" className="overflow-visible">
        <path
          className="dynamic-svg-path"
          fill="none"
          stroke="#B875FF"
          strokeOpacity="0.3"
          strokeWidth="6"
          strokeLinecap="round"
        />
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
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = rootRef.current?.closest('.overflow-y-auto');
    if (!scroller || !rootRef.current) return;

    let rafId: number;
    const updatePositions = () => {
      if (!rootRef.current) return;
      const nodes = rootRef.current.querySelectorAll('.path-node');
      const cards = Array.from(rootRef.current.querySelectorAll('.group-card')).map(c => {
         const rect = c.getBoundingClientRect();
         return { top: rect.top, bottom: rect.bottom };
      });
      
      let allPoints: {x: number, y: number}[][] = [];
      let currentGroupPoints: {x: number, y: number}[] = [];
      let currentGroupIndex = -1;

      nodes.forEach((node) => {
        const el = node as HTMLElement;
        const gIdx = parseInt(el.getAttribute('data-groupidx') || '0');
        if (gIdx !== currentGroupIndex) {
          if (currentGroupPoints.length > 0) allPoints.push(currentGroupPoints);
          currentGroupPoints = [];
          currentGroupIndex = gIdx;
        }

        const rect = el.getBoundingClientRect();
        const nodeY = rect.top + rect.height / 2;
        
        let maxEase = 0;
        cards.forEach(card => {
           const distToBottom = nodeY - card.bottom;
           if (nodeY < card.bottom) {
              maxEase = Math.max(maxEase, 1);
           } else if (distToBottom >= 0 && distToBottom < 260) {
              const factor = 1 - (distToBottom / 260);
              const ease = Math.sin(factor * Math.PI / 2);
              maxEase = Math.max(maxEase, ease);
           }
        });
        
        const baseX = parseFloat(el.getAttribute('data-basex') || '0');
        const dodgeX = baseX + (140 - baseX) * maxEase;
        
        el.style.transform = `translateX(${dodgeX}px)`;
        
        const trackTop = el.closest('.track-container') as HTMLElement;
        const trackRect = trackTop.getBoundingClientRect();
        const relativeY = nodeY - trackRect.top;
        currentGroupPoints.push({ x: dodgeX, y: relativeY });
      });
      if (currentGroupPoints.length > 0) allPoints.push(currentGroupPoints);
      
      const svgPaths = rootRef.current.querySelectorAll('.dynamic-svg-path');
      allPoints.forEach((points, i) => {
         if (i < svgPaths.length && points.length > 0) {
            let d = `M ${points[0].x} ${points[0].y - 50} L ${points[0].x} ${points[0].y}`;
            for (let j = 1; j < points.length; j++) {
               const prev = points[j - 1];
               const curr = points[j];
               const cp1y = prev.y + (curr.y - prev.y) / 2;
               d += ` C ${prev.x} ${cp1y}, ${curr.x} ${cp1y}, ${curr.x} ${curr.y}`;
            }
            const last = points[points.length - 1];
            d += ` L ${last.x} ${last.y + 50}`;
            svgPaths[i].setAttribute('d', d);
         }
      });
      
      rafId = requestAnimationFrame(updatePositions);
    };
    
    rafId = requestAnimationFrame(updatePositions);
    return () => cancelAnimationFrame(rafId);
  }, []);

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
    <div ref={rootRef} className="w-full flex flex-col pt-0 pb-0 relative px-3 sm:px-4">


      {activeGroups.map((tile, groupIdx) => {
        const groupLevels = grouped[tile.id];
        const completed = groupLevels.filter(d => completedLevelIds.includes(d.id)).length;
        const pct = groupLevels.length > 0 ? (completed / groupLevels.length) * 100 : 0;
        const [c0, c1, c2] = tile.c;
        const bandData = BANDS.find(b => b.id === tile.id);

        let activeIndex = groupLevels.findIndex(l => !completedLevelIds.includes(l.id));
        if (activeIndex === -1) activeIndex = groupLevels.length; // all completed

        return (
          <React.Fragment key={tile.id}>
            
            {/* The Huge Gradient Card -> Stacked Flashcard */}
            <div
              className={`group-card relative sticky z-20 w-[75%] max-w-[320px] mr-auto overflow-hidden outline-none shadow-2xl flex flex-col p-5 mb-4`}
              style={{
                top: `calc(2rem + ${groupIdx * 1.5}rem)`, // Stack based on group index!
                marginLeft: `${groupIdx * 1.5}rem`, // Shift right to create prominent top-left peek effect
                borderRadius: '32px',
                minHeight: '160px',
                background: 'hsl(var(--background))',
                border: `2px solid ${c0}`,
              }}
            >
              <div className="flex-1">
                <h3 className="text-white text-xl font-bold tracking-tight">{tile.title}</h3>
                <p className="text-white/60 text-xs mt-1.5 leading-snug line-clamp-2">
                  {bandData?.subtitle || "Explore language concepts and level up your skills."}
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                {/* Badges / Pills row */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="bg-white/5 border border-white/10 rounded-full px-2 py-1 flex items-center gap-1">
                    <span className="text-white/90 text-[10px] font-semibold" style={{ color: c0 }}>{tile.id}</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-full px-2 py-1 flex items-center gap-1">
                    <Check className="w-3 h-3" style={{ color: c0 }} />
                    <span className="text-white/90 text-[10px] font-semibold">{completed}/{groupLevels.length}</span>
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
            <div className="track-container w-full flex flex-col items-center relative mt-2 mb-2">
              {/* Central vertical wavy line for this group */}
              <DynamicPathLine />

              {groupLevels.map((level, i) => {
                const isCompleted = i < activeIndex;
                const isActive = i === activeIndex;
                const isLocked = i > activeIndex;
                
                const snakeAmplitude = 32; 
                const baseOffset = -50 + Math.sin(i * Math.PI / 2.5) * snakeAmplitude;
                const offset = baseOffset;

                return (
                  <div key={level.id} className="relative z-10 w-full flex justify-center h-[100px] items-center">
                    <button
                      onClick={() => {
                        if (!isLocked) setSelectedNode(level);
                      }}
                      className="path-node relative group transition-transform active:scale-95 flex flex-col items-center gap-2"
                      data-groupidx={groupIdx}
                      data-basex={offset}
                      style={{ transform: `translateX(${offset}px)` }}
                    >
                      {isActive ? (
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-[#B875FF] animate-ping opacity-30" />
                          <div className="w-14 h-14 rounded-full bg-[#B875FF] flex items-center justify-center shadow-[0_0_20px_rgba(184,117,255,0.4)]">
                            <Play className="w-6 h-6 text-white ml-1" fill="currentColor" />
                          </div>
                        </div>
                      ) : isCompleted ? (
                        <div className="w-12 h-12 rounded-full bg-[#1a1a24] border-2 border-[#B875FF]/40 flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                          <Check className="w-5 h-5 text-[#B875FF]" strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#1a1a24] flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                          <Lock className="w-5 h-5 text-white/20" />
                        </div>
                      )}
                      {/* Node Title Bubble */}
                      <div 
                        className="px-2 py-1 rounded-full bg-[#1a1a24] border border-white/5 text-white/70 text-[9px] font-bold max-w-[80px] truncate absolute top-full mt-1.5 shadow-lg"
                        style={{ backdropFilter: 'blur(8px)' }}
                      >
                        {level.title.replace(/^[AB]\d\s*·\s*/i, "").trim()}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </React.Fragment>
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
