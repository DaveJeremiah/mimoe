import { useState } from "react";
import { X, Upload, Check } from "lucide-react";
import type { FlashcardItem } from "@/lib/flashcardData";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (entries: { english: string; french: string; alternatives?: string[] }[]) => void;
  existingItems: FlashcardItem[];
}

export function BulkImportModal({ isOpen, onClose, onImport, existingItems }: BulkImportModalProps) {
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);

  const parseImportText = (text: string): { english: string; french: string; alternatives?: string[] }[] => {
    const entries: { english: string; french: string; alternatives?: string[] }[] = [];
    const lines = text.split('\n').filter(line => line.trim() !== '');

    for (const line of lines) {
      let english = '';
      let french = '';
      let alternatives: string[] = [];

      // Try pipe separator first
      if (line.includes('|')) {
        const parts = line.split('|').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          english = parts[0];
          french = parts[1];
          alternatives = parts.slice(2);
        }
      }
      // Fallback to tab separator
      else if (line.includes('\t')) {
        const parts = line.split('\t').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          english = parts[0];
          french = parts[1];
          alternatives = parts.slice(2);
        }
      }

      if (english && french) {
        const entry: { english: string; french: string; alternatives?: string[] } = { english, french };
        if (alternatives.length > 0) entry.alternatives = alternatives;
        entries.push(entry);
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
              placeholder={`One pair per line — tab separates alternatives:&#10;Hello&#9;Bonjour&#10;Goodbye&#9;Au revoir&#9;Salut&#10;Thank you&#9;Merci&#9;Merci beaucoup&#10;&#10;Or use pipe separators:&#10;Hello | Bonjour | Salut&#10;Goodbye | Au revoir`}
              className="w-full h-48 p-3 border border-gray-600 rounded-lg font-mono text-sm bg-gray-900 text-green-300 placeholder:text-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isImporting}
            />
          </div>

          <div className="text-xs text-gray-400 mb-4">
            Format: <span className="text-green-400 font-mono">English | French | Alt2 | Alt3</span> — extra columns are accepted alternatives
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
