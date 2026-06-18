import { useState } from "react";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import type { Collection } from "@/lib/collectionTypes";
import { COLLECTION_CATEGORIES } from "@/lib/collectionTypes";
import { AMOEBA_COUNT } from "@/lib/blobShapes";

interface CollectionCardProps {
  collection: Collection;
  index?: number;
  onStudy: (collection: Collection) => void;
  onEdit: (collection: Collection) => void;
  onDelete: (collectionId: string) => void;
}

export function CollectionCard({ collection, index = 0, onStudy, onEdit, onDelete }: CollectionCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const catInfo = COLLECTION_CATEGORIES.find(c => c.value === collection.category);
  const amoebaId = `amoeba-${index % AMOEBA_COUNT}`;

  const handleEdit = () => { setShowMenu(false); onEdit(collection); };
  const handleDelete = () => {
    setShowMenu(false);
    if (window.confirm(`Delete "${collection.title}"?`)) onDelete(collection.id);
  };

  return (
    // Outer container: no overflow so dropdown and Study button escape the blob clip.
    <div className="relative" style={{ minHeight: 168 }}>

      {/* Amoeba background — clips to organic shape, pointer-events none.
          Inner div overshoots by 25% so extending lobes have paint to show. */}
      <div
        className="absolute pointer-events-none"
        style={{ inset: 0, bottom: '14%', clipPath: `url(#${amoebaId})` }}
      >
        <div
          className="absolute"
          style={{
            background: '#0E0E14',
            left: '-25%', right: '-25%', top: '-25%', bottom: '-25%',
          }}
        />
      </div>

      {/* Content layer — sits above the blob bg, not clipped */}
      <div className="relative flex flex-col px-4 pt-3 pb-0" style={{ minHeight: 168 }}>

        {/* Menu button — top-right */}
        <div className="flex items-start justify-end mb-1 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1 rounded-lg hover:bg-white/8 transition-colors flex-shrink-0 -mr-1 -mt-0.5"
          >
            <MoreVertical className="w-3.5 h-3.5 text-white/30" />
          </button>
        </div>

        {/* Emoji */}
        <div className="flex-1 flex items-center min-h-[40px]">
          <span style={{ fontSize: 30, lineHeight: 1 }}>{catInfo?.emoji ?? "📚"}</span>
        </div>

        {/* Title + count */}
        <div className="mb-3 flex-shrink-0">
          <h3
            className="font-sans text-sm font-bold text-white leading-tight mb-0.5"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {collection.title}
          </h3>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {collection.entries.length} cards
          </p>
        </div>

        {/* Study button — sticks out below the amoeba blob */}
        <button
          onClick={() => onStudy(collection)}
          className="w-full py-2.5 rounded-full font-bold text-xs flex-shrink-0 transition-opacity hover:opacity-85 active:opacity-70"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #9B5CF6)', color: '#fff' }}
        >
          Study
        </button>

        {/* Dropdown — renders outside the blob, unclipped */}
        {showMenu && (
          <>
            <div className="fixed inset-0 z-0" onClick={() => setShowMenu(false)} />
            <div
              className="absolute right-3 top-10 w-28 rounded-xl overflow-hidden z-10"
              style={{
                background: '#111118',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
              }}
            >
              <button
                onClick={handleEdit}
                className="w-full px-3 py-2.5 text-left text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                <Edit className="w-3 h-3" /> Edit
              </button>
              <button
                onClick={handleDelete}
                className="w-full px-3 py-2.5 text-left text-xs text-red-400 hover:bg-white/5 transition-colors flex items-center gap-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
