import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { ARABIC_DIALECTS } from "@/lib/languageConfig";
import type { Language } from "@/lib/languageConfig";

interface NewLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, dialect?: string) => void;
  activeLanguage?: Language;
}

export function NewLevelModal({ isOpen, onClose, onSave, activeLanguage }: NewLevelModalProps) {
  const [title, setTitle] = useState("");
  const [selectedDialect, setSelectedDialect] = useState("ar-SA");

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setSelectedDialect("ar-SA");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSave(trimmed, activeLanguage === "arabic" ? selectedDialect : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-display text-lg font-bold text-foreground">New Level</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Level title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Travel phrases"
              className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              You'll add cards inside the level using the Word Bank.
            </p>
          </div>

          {activeLanguage === "arabic" && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Arabic Dialect
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ARABIC_DIALECTS.map((dialect) => (
                  <button
                    key={dialect.code}
                    type="button"
                    onClick={() => setSelectedDialect(dialect.code)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                      selectedDialect === dialect.code
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{dialect.flag}</span>
                    <span>{dialect.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-muted text-foreground font-semibold text-sm hover:bg-muted/70 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
