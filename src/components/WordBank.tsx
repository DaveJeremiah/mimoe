import { useState } from "react";
import { Trash2, Plus, X, BookOpen, Upload, Edit2, Check as CheckIcon } from "lucide-react";
import type { FlashcardItem } from "@/lib/flashcardData";
import { BulkImportModal } from "./BulkImportModal";

interface WordBankProps {
  items: FlashcardItem[];
  onAdd: (english: string, french: string, alternatives?: string[]) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, english: string, french: string, alternatives?: string[]) => void;
  onBulkAdd: (entries: { english: string; french: string; alternatives?: string[] }[]) => void;
  label: string;
}

export function WordBank({ items, onAdd, onDelete, onBulkAdd, label }: WordBankProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [english, setEnglish] = useState("");
  const [french, setFrench] = useState("");
  const [altInput, setAltInput] = useState("");
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEnglish, setEditEnglish] = useState("");
  const [editFrench, setEditFrench] = useState("");
  const [editAlt, setEditAlt] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!english.trim() || !french.trim()) return;
    const alternatives = altInput.split('|').map(a => a.trim()).filter(Boolean);
    onAdd(english.trim(), french.trim(), alternatives.length > 0 ? alternatives : undefined);
    setEnglish("");
    setFrench("");
    setAltInput("");
  };

  const startEdit = (item: FlashcardItem) => {
    setEditingId(item.id);
    setEditEnglish(item.english);
    setEditFrench(item.french);
    setEditAlt(item.alternatives ? item.alternatives.join(" | ") : "");
  };

  const saveEdit = (id: string) => {
    const alts = editAlt.split('|').map(a => a.trim()).filter(Boolean);
    onUpdate?.(id, editEnglish.trim(), editFrench.trim(), alts.length ? alts : undefined);
    setEditingId(null);
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
                  className="flex items-center justify-between p-3 rounded-xl bg-background border border-border"
                >
                  {editingId === item.id ? (
                    <div className="flex-1 flex flex-col gap-2 min-w-0 mr-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editEnglish}
                          onChange={(e) => setEditEnglish(e.target.value)}
                          className="flex-1 min-w-0 rounded-lg border border-input bg-card px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <input
                          type="text"
                          value={editFrench}
                          onChange={(e) => setEditFrench(e.target.value)}
                          className="flex-1 min-w-0 rounded-lg border border-input bg-card px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <input
                        type="text"
                        value={editAlt}
                        onChange={(e) => setEditAlt(e.target.value)}
                        placeholder="Alternatives: Alt1 | Alt2"
                        className="w-full rounded-lg border border-input bg-card px-2 py-1 text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{item.english}</span>
                      <span className="text-muted-foreground mx-2">→</span>
                      <span className="text-sm text-primary font-semibold">{item.french}</span>
                      {item.alternatives && item.alternatives.length > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground italic">/ {item.alternatives.join(' / ')}</span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1 shrink-0">
                    {editingId === item.id ? (
                      <>
                        <button
                          onClick={() => saveEdit(item.id)}
                          className="p-2 text-success hover:bg-success/10 rounded-lg transition-colors"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        {onUpdate && (
                          <button
                            onClick={() => startEdit(item)}
                            className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(item.id)}
                          className="p-2 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border space-y-3">
              {/* Single Entry Form */}
              <form onSubmit={handleAdd} className="space-y-2">
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
                    className="rounded-xl bg-primary px-4 py-2.5 text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={altInput}
                  onChange={(e) => setAltInput(e.target.value)}
                  placeholder="Alternatives (optional): Salut | Bonsoir"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
