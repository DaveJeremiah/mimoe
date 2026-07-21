import { useState } from "react";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
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
  const gradients = [
    "radial-gradient(circle at 20% 30%, #C86428 0%, transparent 60%), radial-gradient(circle at 80% 20%, #F5C842 0%, transparent 60%), radial-gradient(circle at 50% 80%, #E8A020 0%, transparent 60%), #1a1a24",
    "radial-gradient(circle at 20% 30%, #047857 0%, transparent 60%), radial-gradient(circle at 80% 20%, #0EA5E9 0%, transparent 60%), radial-gradient(circle at 50% 80%, #6366F1 0%, transparent 60%), #1a1a24",
    "radial-gradient(circle at 20% 30%, #4F46E5 0%, transparent 60%), radial-gradient(circle at 80% 20%, #7C3AED 0%, transparent 60%), radial-gradient(circle at 50% 80%, #C026D3 0%, transparent 60%), #1a1a24",
  ];
  const bgGradient = gradients[index % gradients.length];

  return (
    <div className="relative overflow-hidden shadow-2xl transition-transform active:scale-[0.98]"
         style={{ borderRadius: 32, minHeight: 160, transformOrigin: 'center center' }}>
      
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: bgGradient }} />

      {/* Emoji top-left */}
      <div className="absolute top-5 left-5 z-20 pointer-events-none">
         <span style={{ fontSize: 48, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}>{catInfo?.emoji ?? "📚"}</span>
      </div>

      {/* Menu button top-right */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-white/20 active:scale-95"
        style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}
      >
        <MoreVertical className="w-5 h-5 text-white" />
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
          <div
            className="absolute right-4 top-16 w-32 rounded-xl overflow-hidden z-40"
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
           <h3 className="text-white text-2xl font-bold tracking-tight line-clamp-2">{collection.title}</h3>
           
           {/* Badges / Pills row */}
           <div className="flex flex-wrap items-center gap-2 mt-4">
             {/* Count Pill */}
             <div className="bg-white/10 border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-1.5">
               <span className="text-white/90 text-xs font-semibold">{collection.entries.length} cards</span>
             </div>
             
             {/* Category Pill */}
             {catInfo && (
               <div className="bg-white/10 border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                 <span className="text-white/90 text-xs font-semibold">{catInfo.label}</span>
               </div>
             )}

             {/* Study Button */}
             <button
                onClick={(e) => { e.stopPropagation(); onStudy(collection); }}
                className="bg-white text-black rounded-full px-5 py-1.5 flex items-center gap-1.5 ml-auto hover:bg-white/90 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.3)]"
             >
                <span className="text-sm font-bold">Study</span>
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
