import { useState } from "react";
import { Check, Plus, ChevronDown, ChevronUp } from "lucide-react";
import type { Level } from "@/lib/flashcardData";
import type { Collection } from "@/lib/collectionTypes";

import { LevelSelect } from "./LevelSelect";
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
  onStudyCollection: (collection: Collection) => void;
  onCreateNotes: () => void;
  onCreateCollection: () => void;
  onEditCollection: (collection: Collection) => void;
  onDeleteCollection: (collectionId: string) => void;
  onOpenWordBank: (mode: "courses" | "collections") => void;
}

export function LibraryTab({
  levels,
  completedLevelIds,
  collections,
  onSelectBand,
  activeLanguage,
  activeTab,
  onTabSwitch,
  onStudyCollection,
  onCreateNotes,
  onCreateCollection,
  onEditCollection,
  onDeleteCollection,
  onOpenWordBank
}: LibraryTabProps) {
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(true);
  const [isCoursesOpen, setIsCoursesOpen] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  return (
    <div className="w-full flex flex-col pt-6 pb-24 px-5">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-white text-3xl font-bold">Library</h1>
        <div className="flex items-center gap-3">
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
      </div>

      <div className="flex flex-col gap-8">
        {/* PERSONAL COLLECTIONS SECTION */}
        <div>
          <div 
            className="flex items-center justify-between mb-4 cursor-pointer select-none"
            onClick={() => setIsCollectionsOpen(!isCollectionsOpen)}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-xl">My Collections</h2>
              {isCollectionsOpen ? <ChevronUp className="w-5 h-5 text-white/40" /> : <ChevronDown className="w-5 h-5 text-white/40" />}
            </div>
            
            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => onOpenWordBank("collections")}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Word Bank
              </button>
              <div className="relative">
              <button 
                onClick={() => setIsCreateOpen(!isCreateOpen)}
                className="flex items-center gap-1 text-[#B875FF] text-sm font-semibold hover:opacity-80 px-2 py-1 bg-white/5 rounded-full"
              >
                <Plus className="w-4 h-4" /> Create
              </button>
              
              {isCreateOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsCreateOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#111111] border border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden animate-slide-up-in">
                    <button 
                      onClick={() => { setIsCreateOpen(false); onCreateNotes(); }}
                      className="w-full text-left px-4 py-3 text-sm font-semibold text-white/90 hover:bg-white/5 transition-colors border-b border-white/5"
                    >
                      📝 Note (Single)
                    </button>
                    <button 
                      onClick={() => { setIsCreateOpen(false); onCreateCollection(); }}
                      className="w-full text-left px-4 py-3 text-sm font-semibold text-white/90 hover:bg-white/5 transition-colors"
                    >
                      🗂️ Collection (Bulk)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {isCollectionsOpen && (
            <div className="flex flex-col gap-5 animate-slide-up-in">
              {(() => {
                const visibleCollections = collections.filter(c => (c.language ?? "french") === activeLanguage);
                if (visibleCollections.length === 0) return (
                  <div className="flex flex-col items-center justify-center py-10 px-4 bg-white/5 rounded-3xl border border-white/5 text-center">
                    <span className="text-4xl mb-4">🗂️</span>
                    <h3 className="text-white font-bold text-lg mb-2">No collections yet</h3>
                    <p className="text-white/50 text-sm mb-6 max-w-[200px]">Create your first personal deck to start learning your own words.</p>
                  </div>
                );

                const groups: { cat: typeof COLLECTION_CATEGORIES[number] | null; items: Collection[] }[] = [];
                const catMap = new Map<string, Collection[]>();
                const uncategorized: Collection[] = [];
                
                for (const col of visibleCollections) {
                  if (col.category) {
                    if (!catMap.has(col.category)) catMap.set(col.category, []);
                    catMap.get(col.category)!.push(col);
                  } else {
                    uncategorized.push(col);
                  }
                }
                
                for (const catDef of COLLECTION_CATEGORIES) {
                  if (catMap.has(catDef.value)) {
                    groups.push({ cat: catDef, items: catMap.get(catDef.value)! });
                  }
                }
                if (uncategorized.length > 0) groups.push({ cat: null, items: uncategorized });
                
                const indexById = new Map(visibleCollections.map((c, i) => [c.id, i]));
                
                return (
                  <div className="space-y-6">
                    {groups.map(({ cat, items }) => (
                      <div key={cat?.value ?? "__none"}>
                        {cat && (
                          <div className="flex items-center gap-2 mb-3 pl-1">
                            <span className="text-xl">{cat.emoji}</span>
                            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">{cat.label}</span>
                          </div>
                        )}
                        <div className="flex flex-col gap-3">
                          {items.map((collection) => (
                            <CollectionCard
                              key={collection.id}
                              collection={collection}
                              index={indexById.get(collection.id) ?? 0}
                              onStudy={onStudyCollection}
                              onEdit={onEditCollection}
                              onDelete={onDeleteCollection}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* COURSES SECTION */}
        <div>
          <div 
            className="flex items-center justify-between mb-4 cursor-pointer select-none"
            onClick={() => setIsCoursesOpen(!isCoursesOpen)}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-xl">Courses</h2>
              {isCoursesOpen ? <ChevronUp className="w-5 h-5 text-white/40" /> : <ChevronDown className="w-5 h-5 text-white/40" />}
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onOpenWordBank("courses"); }}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Word Bank
            </button>
          </div>
          
          {isCoursesOpen && (
            <div className="animate-slide-up-in">
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
          )}
        </div>
      </div>
    </div>
  );
}
