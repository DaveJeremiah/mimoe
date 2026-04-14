import { useState } from "react";
import { Trash2, Plus, X, BookOpen } from "lucide-react";
import type { FlashcardItem } from "@/lib/flashcardData";

interface WordBankProps {
  items: FlashcardItem[];
  onAdd: (english: string, french: string) => void;
  onDelete: (id: string) => void;
  label: string;
}

export function WordBank({ items, onAdd, onDelete, label }: WordBankProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [english, setEnglish] = useState("");
  const [french, setFrench] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!english.trim() || !french.trim()) return;
    onAdd(english.trim(), french.trim());
    setEnglish("");
    setFrench("");
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
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{item.english}</span>
                    <span className="text-muted-foreground mx-2">→</span>
                    <span className="text-sm text-primary font-semibold">{item.french}</span>
                  </div>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-2 text-destructive/60 hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAdd} className="p-4 border-t border-border flex gap-2">
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
            </form>
          </div>
        </>
      )}
    </>
  );
}
