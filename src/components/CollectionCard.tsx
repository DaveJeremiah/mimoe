import { useState } from "react";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import type { Collection } from "@/lib/collectionTypes";
import { COLLECTION_CATEGORIES } from "@/lib/collectionTypes";

interface CollectionCardProps {
  collection: Collection;
  onStudy: (collection: Collection) => void;
  onEdit: (collection: Collection) => void;
  onDelete: (collectionId: string) => void;
}

export function CollectionCard({ collection, onStudy, onEdit, onDelete }: CollectionCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const catInfo = COLLECTION_CATEGORIES.find(c => c.value === collection.category);

  const handleEdit = () => { setShowMenu(false); onEdit(collection); };
  const handleDelete = () => {
    setShowMenu(false);
    if (window.confirm(`Delete "${collection.title}"?`)) onDelete(collection.id);
  };

  return (
    <div
      className="relative overflow-hidden rounded-[20px] flex flex-col p-4"
      style={{
        aspectRatio: '1/1',
        background: '#0E0E14',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Top row: menu button only */}
      <div className="flex items-start justify-end mb-2 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="p-1 rounded-lg hover:bg-white/8 transition-colors flex-shrink-0 -mr-1 -mt-0.5"
        >
          <MoreVertical className="w-3.5 h-3.5 text-white/30" />
        </button>
      </div>

      {/* Emoji — fills the middle */}
      <div className="flex-1 flex items-center">
        <span style={{ fontSize: 36, lineHeight: 1 }}>{catInfo?.emoji ?? "📚"}</span>
      </div>

      {/* Title + count */}
      <div className="mb-3 flex-shrink-0">
        <h3
          className="font-display text-sm font-bold text-white leading-tight mb-0.5"
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

      {/* Study button */}
      <button
        onClick={() => onStudy(collection)}
        className="w-full py-2 rounded-xl font-bold text-xs transition-opacity hover:opacity-90 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #7C3AED, #9B5CF6)', color: '#fff' }}
      >
        Study
      </button>

      {/* Dropdown menu */}
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
  );
}
