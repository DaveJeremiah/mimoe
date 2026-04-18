import { useState } from "react";
import { MoreVertical, Play, Edit, Trash2 } from "lucide-react";
import type { Collection } from "@/lib/collectionTypes";

interface CollectionCardProps {
  collection: Collection;
  onStudy: (collection: Collection) => void;
  onEdit: (collection: Collection) => void;
  onDelete: (collectionId: string) => void;
}

export function CollectionCard({ collection, onStudy, onEdit, onDelete }: CollectionCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleStudy = () => {
    onStudy(collection);
  };

  const handleEdit = () => {
    setShowMenu(false);
    onEdit(collection);
  };

  const handleDelete = () => {
    setShowMenu(false);
    if (window.confirm(`Are you sure you want to delete "${collection.title}"?`)) {
      onDelete(collection.id);
    }
  };

  return (
    <div className="relative bg-amber-50 rounded-2xl shadow-md border border-amber-200 p-6 hover:shadow-lg transition-shadow">
      {/* Menu Button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 rounded-lg hover:bg-amber-100 transition-colors"
        >
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>
        
        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-amber-200 z-10">
            <button
              onClick={handleEdit}
              className="w-full px-3 py-2 text-left text-sm hover:bg-amber-50 transition-colors flex items-center gap-2"
            >
              <Edit className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Collection Content */}
      <div className="pr-8">
        <h3 className="font-display text-xl font-bold text-gray-900 mb-2">
          {collection.title}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {collection.entries.length} {collection.entries.length === 1 ? 'card' : 'cards'}
        </p>
        <button
          onClick={handleStudy}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors font-medium text-sm"
        >
          <Play className="w-4 h-4" />
          Study
        </button>
      </div>

      {/* Close menu when clicking outside */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
