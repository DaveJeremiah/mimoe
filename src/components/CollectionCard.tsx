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
    <div className="relative overflow-hidden bg-card rounded-3xl border border-border p-5 card-shadow">

      <div className="flex items-start justify-between mb-3">
        {/* Icon + category badge */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
            <span className="text-xl">{catInfo?.emoji ?? "🎵"}</span>
          </div>
          {catInfo && (
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'linear-gradient(135deg, rgba(155,92,246,0.2), rgba(236,72,153,0.2))', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(155,92,246,0.25)' }}
            >
              {catInfo.label}
            </span>
          )}
        </div>
        <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <h3 className="font-display text-base font-bold text-foreground mb-1 leading-tight">{collection.title}</h3>
      <p className="text-xs text-muted-foreground mb-4">{collection.entries.length} cards</p>

      <button
        onClick={() => onStudy(collection)}
        className="w-full py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
      >
        Study
      </button>

      {/* Dropdown */}
      {showMenu && (
        <div className="absolute right-4 top-14 mt-1 w-32 rounded-xl overflow-hidden z-10"
          style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
          <button onClick={handleEdit}
            className="w-full px-3 py-2.5 text-left text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2">
            <Edit className="w-3 h-3" />Edit
          </button>
          <button onClick={handleDelete}
            className="w-full px-3 py-2.5 text-left text-sm text-red-400 hover:bg-white/5 transition-colors flex items-center gap-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Trash2 className="w-3 h-3" />Delete
          </button>
        </div>
      )}
      {showMenu && <div className="fixed inset-0 z-0" onClick={() => setShowMenu(false)} />}
    </div>
  );
}
