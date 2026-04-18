import { useState } from "react";
import { Trash2, Plus, X, BookOpen, Upload, Check } from "lucide-react";
import type { FlashcardItem } from "@/lib/flashcardData";
import { BulkImportModal } from "./BulkImportModal";

interface WordBankProps {
  items: FlashcardItem[];
  onAdd: (english: string, french: string, alternatives?: string[]) => void;
  onUpdate?: (id: string, english: string, french: string, alternatives?: string[]) => void;
  onDelete: (id: string) => void;
  onBulkAdd: (entries: { english: string; french: string; alternatives?: string[] }[]) => void;
  label: string;
}

export function WordBank({ items, onAdd, onUpdate, onDelete, onBulkAdd, label }: WordBankProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [english, setEnglish] = useState("");
  const [french, setFrench] = useState("");
  const [altInput, setAltInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!english.trim() || !french.trim()) return;
    const alternatives = altInput.split('|').map(a => a.trim()).filter(Boolean);
    if (editingId && onUpdate) {
      onUpdate(editingId, english.trim(), french.trim(), alternatives.length > 0 ? alternatives : undefined);
      setEditingId(null);
    } else {
      onAdd(english.trim(), french.trim(), alternatives.length > 0 ? alternatives : undefined);
    }
    setEnglish("");
    setFrench("");
    setAltInput("");
  };

  const handleEdit = (item: FlashcardItem) => {
    setEditingId(item.id);
    setEnglish(item.english);
    setFrench(item.french);
    setAltInput(item.alternatives ? item.alternatives.join(" | ") : "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEnglish("");
    setFrench("");
    setAltInput("");
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        <BookOpen className="w-4 h-4" />
        {label} Bank ({items.length})
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-foreground/20 z-40 animate-fade-in"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-h-[75vh] flex flex-col animate-slide-up border-t border-border">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-display text-lg font-bold">{label} Bank</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${editingId === item.id ? 'bg-indigo-50/50 border-indigo-200' : 'bg-background border-border'}`}
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <span className="text-sm font-medium">{item.english}</span>
                      <span className="text-muted-foreground mx-2">→</span>
                      <span className="text-sm text-primary font-semibold">{item.french}</span>
                      {item.alternatives && item.alternatives.length > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground italic">/ {item.alternatives.join(' / ')}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit entry"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="p-2 text-destructive/60 hover:text-destructive transition-colors shrink-0"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
              ))}
            </div>

            <div className="p-4 border-t border-border space-y-3 bg-muted/30">
              {/* Single Entry Form */}
              <form onSubmit={handleAdd} className="space-y-2">
                {editingId && (
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Editing Entry</span>
                    <button type="button" onClick={handleCancelEdit} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={english}
                    onChange={(e) => setEnglish(e.target.value)}
                    placeholder="English"
                    className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="text"
                    value={french}
                    onChange={(e) => setFrench(e.target.value)}
                    placeholder="French"
                    className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    className={`rounded-xl px-4 py-2.5 text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center min-w-[44px] ${editingId ? 'bg-indigo-600' : 'bg-primary'}`}
                    title={editingId ? "Save changes" : "Add entry"}
                  >
                    {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
                <input
                  type="text"
                  value={altInput}
                  onChange={(e) => setAltInput(e.target.value)}
                  placeholder="Alternatives (optional, pipe separated): Salut | Bonsoir"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-muted-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </form>

              {/* Bulk Import Button */}
              <button
                onClick={() => setIsBulkImportOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors font-medium text-sm"
              >
                <Upload className="w-4 h-4" />
                Bulk Import
              </button>
            </div>

            {/* Bulk Import Modal */}
            <BulkImportModal
              isOpen={isBulkImportOpen}
              onClose={() => setIsBulkImportOpen(false)}
              onImport={onBulkAdd}
              existingItems={items}
            />
          </div>
        </>
      )}
    </>
  );
}
