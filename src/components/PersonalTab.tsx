import { Plus } from "lucide-react";
import type { Collection } from "@/lib/collectionTypes";
import { CollectionCard } from "./CollectionCard";
import { COLLECTION_CATEGORIES } from "@/lib/collectionTypes";

interface PersonalTabProps {
  collections: Collection[];
  activeLanguage: string;
  onStudyCollection: (collection: Collection) => void;
  onCreateNotes: () => void;
  onCreateCollection: () => void;
  onEditCollection: (collection: Collection) => void;
  onDeleteCollection: (collectionId: string) => void;
  onOpenWordBank: () => void;
}

export function PersonalTab({
  collections,
  activeLanguage,
  onStudyCollection,
  onCreateNotes,
  onCreateCollection,
  onEditCollection,
  onDeleteCollection,
  onOpenWordBank
}: PersonalTabProps) {
  
  return (
    <div className="w-full flex flex-col pt-6 pb-0 px-5">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-white text-3xl font-bold">Personal</h1>
        <button 
          onClick={onOpenWordBank}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-bold transition-colors"
        >
          Word Bank
        </button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-bold text-lg">My Collections</h2>
        <div className="flex gap-4">
          <button 
            onClick={onCreateNotes}
            className="flex items-center gap-1 text-[#B875FF] text-sm font-semibold hover:opacity-80"
          >
            <Plus className="w-4 h-4" /> Note
          </button>
          <button 
            onClick={onCreateCollection}
            className="flex items-center gap-1 text-[#B875FF] text-sm font-semibold hover:opacity-80"
          >
            <Plus className="w-4 h-4" /> Collection
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {(() => {
          const visibleCollections = collections.filter(c => (c.language ?? "french") === activeLanguage);
          if (visibleCollections.length === 0) return (
            <div className="flex flex-col items-center justify-center py-12 px-4 bg-white/5 rounded-3xl border border-white/5 text-center">
              <span className="text-4xl mb-4">🗂️</span>
              <h3 className="text-white font-bold text-lg mb-2">No collections yet</h3>
              <p className="text-white/50 text-sm mb-6 max-w-[200px]">Create your first personal deck to start learning your own words.</p>
              <button 
                onClick={onCreateCollection}
                className="px-6 py-3 bg-[#B875FF] hover:bg-[#a65df0] text-white rounded-2xl font-bold transition-all active:scale-95"
              >
                Create Collection
              </button>
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
            <div className="space-y-8">
              {groups.map(({ cat, items }) => (
                <div key={cat?.value ?? "__none"}>
                  {cat && (
                    <div className="flex items-center gap-2 mb-4 pl-1">
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="text-sm font-bold text-white/50 uppercase tracking-wider">{cat.label}</span>
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
    </div>
  );
}
