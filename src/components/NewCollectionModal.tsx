import { useState } from "react";
import { X, Plus } from "lucide-react";
import type { Collection, CollectionEntry, CollectionFormData } from "@/lib/collectionTypes";

interface NewCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (collection: CollectionFormData) => void;
  editingCollection?: Collection;
}

export function NewCollectionModal({ isOpen, onClose, onSave, editingCollection }: NewCollectionModalProps) {
  const [title, setTitle] = useState(editingCollection?.title || "");
  const [importText, setImportText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const parseImportText = (text: string): CollectionEntry[] => {
    const entries: CollectionEntry[] = [];
    const lines = text.split('\n').filter(line => line.trim() !== '');

    for (const line of lines) {
      let english = '';
      let french = '';

      // Try pipe separator first
      if (line.includes('|')) {
        const parts = line.split('|');
        if (parts.length >= 2) {
          english = parts[0].trim();
          french = parts.slice(1).join('|').trim();
        }
      }
      // Fallback to tab separator
      else if (line.includes('\t')) {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          english = parts[0].trim();
          french = parts.slice(1).join('\t').trim();
        }
      }

      // Only add if both parts exist and are not empty
      if (english && french) {
        entries.push({ english, french });
      }
    }

    return entries;
  };

  const handleSave = () => {
    setError("");
    
    if (!title.trim()) {
      setError("Please enter a collection title");
      return;
    }

    let entries: CollectionEntry[] = [];
    
    if (importText.trim()) {
      entries = parseImportText(importText);
      if (entries.length === 0) {
        setError("Please add at least one valid entry (English | French)");
        return;
      }
    } else if (!editingCollection) {
      setError("Please add at least one entry or import existing entries");
      return;
    }

    setIsSaving(true);
    
    const collectionData: CollectionFormData = {
      title: title.trim(),
      entries: editingCollection ? [...editingCollection.entries, ...entries] : entries
    };

    onSave(collectionData);

    setTimeout(() => {
      setIsSaving(false);
      handleClose();
    }, 500);
  };

  const handleClose = () => {
    setTitle("");
    setImportText("");
    setError("");
    setIsSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-amber-50 rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-amber-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingCollection ? "Edit Collection" : "New Collection"}
          </h3>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collection Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., La Vie en Rose, Stromae - Papaoutai"
              className="w-full p-3 border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSaving}
            />
          </div>

          {/* Import Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {editingCollection ? "Add More Entries" : "Import Entries"}
            </label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="One pair per line:&#10;Hello | Bonjour&#10;Goodbye | Au revoir&#10;Thank you | Merci&#10;&#10;Or use tab separation:&#10;Hello&#9;Bonjour&#10;Goodbye&#9;Au revoir"
              className="w-full h-48 p-3 border border-amber-300 rounded-lg font-mono text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSaving}
            />
          </div>

          <div className="text-xs text-gray-600">
            Format: English | French (or tab-separated)
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-100 border border-red-300">
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {editingCollection ? "Update" : "Create"} Collection
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
