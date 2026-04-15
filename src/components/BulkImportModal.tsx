import { useState } from "react";
import { X, Upload, Check } from "lucide-react";
import type { FlashcardItem } from "@/lib/flashcardData";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (entries: { english: string; french: string }[]) => void;
  existingItems: FlashcardItem[];
}

export function BulkImportModal({ isOpen, onClose, onImport, existingItems }: BulkImportModalProps) {
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);

  const parseImportText = (text: string): { english: string; french: string }[] => {
    const entries: { english: string; french: string }[] = [];
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

  const handleImport = () => {
    if (!importText.trim()) return;

    setIsImporting(true);
    setResult(null);

    const parsedEntries = parseImportText(importText);
    
    // Deduplicate against existing items
    const existingEnglishTerms = new Set(existingItems.map(item => item.english.toLowerCase()));
    const newEntries = parsedEntries.filter(entry => !existingEnglishTerms.has(entry.english.toLowerCase()));

    // Add new entries
    if (newEntries.length > 0) {
      onImport(newEntries);
    }

    // Show result
    setResult({
      added: newEntries.length,
      skipped: parsedEntries.length - newEntries.length
    });

    // Clear and close after delay
    setTimeout(() => {
      setImportText('');
      setIsImporting(false);
      if (newEntries.length > 0) {
        onClose();
      }
    }, 2000);
  };

  const handleClose = () => {
    setImportText('');
    setResult(null);
    setIsImporting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-amber-50 rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-amber-200">
          <h3 className="text-lg font-semibold text-gray-900">Bulk Import</h3>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Import Entries
            </label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="One pair per line:&#10;Hello | Bonjour&#10;Goodbye | Au revoir&#10;Thank you | Merci&#10;&#10;Or use tab separation:&#10;Hello&#9;Bonjour&#10;Goodbye&#9;Au revoir"
              className="w-full h-48 p-3 border border-amber-300 rounded-lg font-mono text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isImporting}
            />
          </div>

          <div className="text-xs text-gray-600 mb-4">
            Format: English | French (or tab-separated)
          </div>

          {/* Result Message */}
          {result && (
            <div className="mb-4 p-3 rounded-lg bg-green-100 border border-green-300">
              <div className="flex items-center gap-2 text-green-800">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {result.added} entries added, {result.skipped} skipped
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={isImporting}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!importText.trim() || isImporting}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-900 text-white font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
