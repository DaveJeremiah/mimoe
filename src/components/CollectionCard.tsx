import { useState } from "react";
import { MoreVertical, Edit, Trash2, Play } from "lucide-react";
import type { Collection } from "@/lib/collectionTypes";
import { COLLECTION_CATEGORIES } from "@/lib/collectionTypes";

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

  return (
    <div 
      className="relative w-full flex items-center gap-3 p-4 rounded-[28px] transition-all duration-200 text-left active:scale-[0.97]"
      style={{
        background: "transparent",
        border: "2px solid rgba(184, 117, 255, 0.3)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)"
      }}
      onClick={() => onStudy(collection)}
    >
      {/* Removed Icon / Emoji */}

      <div className="flex-1 min-w-0 relative z-10">
        <p className="text-[15px] font-bold text-white leading-tight truncate pr-2">{collection.title}</p>
        
        {/* Pills */}
        <div className="flex items-center gap-2 mt-2">
          <div className="bg-black/40 border border-white/5 rounded-full px-2 py-0.5 flex items-center">
            <span className="text-white/70 text-[10px] font-semibold">{collection.entries.length} cards</span>
          </div>
          {catInfo && (
            <div className="bg-black/40 border border-white/5 rounded-full px-2 py-0.5 flex items-center">
              <span className="text-white/70 text-[10px] font-semibold">{catInfo.label}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2 relative z-10 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors"
        >
          <MoreVertical className="w-4 h-4 text-white/50" />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onStudy(collection); }}
          className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-colors shadow-lg"
          style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
          <div
            className="absolute right-14 top-12 w-32 rounded-xl overflow-hidden z-40 animate-pop-in"
            style={{
              background: 'rgba(20,20,28,0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
            }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(collection); setShowMenu(false); }}
              className="w-full px-3 py-3 text-left text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(collection.id); setShowMenu(false); }}
              className="w-full px-3 py-3 text-left text-sm text-red-400 hover:text-red-300 hover:bg-white/10 transition-colors flex items-center gap-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

