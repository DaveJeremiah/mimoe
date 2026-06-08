import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import type { Collection, CollectionEntry, CollectionFormData } from "@/lib/collectionTypes";
import { ARABIC_DIALECTS } from "@/lib/languageConfig";
import type { Language } from "@/lib/languageConfig";

interface NewCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (collection: CollectionFormData) => void;
  editingCollection?: Collection;
  activeLanguage?: Language;
}

export function NewCollectionModal({ isOpen, onClose, onSave, editingCollection, activeLanguage }: NewCollectionModalProps) {
  const [title, setTitle]               = useState(editingCollection?.title || "");
  const [importText, setImportText]     = useState("");
  const [isSaving, setIsSaving]         = useState(false);
  const [error, setError]               = useState("");
  const [selectedDialect, setSelectedDialect] = useState(editingCollection?.dialect ?? "ar-SA");

  useEffect(() => {
    if (editingCollection && isOpen) {
      const existingEntries = editingCollection.entries.map(entry => {
        const alts = entry.alternatives?.length ? ` | ${entry.alternatives.join(' | ')}` : '';
        return `${entry.english} | ${entry.french}${alts}`;
      }).join('\n');
      setImportText(existingEntries);
    } else if (!isOpen) {
      setImportText("");
    }
  }, [editingCollection, isOpen]);

  useEffect(() => {
    if (isOpen) setSelectedDialect(editingCollection?.dialect ?? "ar-SA");
  }, [isOpen, editingCollection]);

  const parseImportText = (text: string): CollectionEntry[] => {
    const entries: CollectionEntry[] = [];
    for (const line of text.split('\n').filter(l => l.trim())) {
      const sep = line.includes('|') ? '|' : line.includes('\t') ? '\t' : null;
      if (!sep) continue;
      const parts = line.split(sep).map(p => p.trim()).filter(Boolean);
      if (parts.length < 2) continue;
      const [english, rawFrench, ...alts] = parts;
      const frenchParts = rawFrench.split('/').map(p => p.trim()).filter(Boolean);
      const french = frenchParts[0];
      const entry: CollectionEntry = { english, french, target: french };
      const combined = [...alts, ...frenchParts.slice(1)];
      if (combined.length) entry.alternatives = combined;
      entries.push(entry);
    }
    return entries;
  };

  const handleSave = () => {
    setError("");
    if (!title.trim()) { setError("Please enter a collection title"); return; }
    const entries = importText.trim() ? parseImportText(importText) : [];
    if (!importText.trim() && !editingCollection) {
      setError("Add at least one entry (English | Target)");
      return;
    }
    if (importText.trim() && entries.length === 0) {
      setError("No valid entries found — use: English | French");
      return;
    }
    setIsSaving(true);
    onSave({
      title: title.trim(),
      language: activeLanguage ?? "french",
      dialect: activeLanguage === "arabic" ? selectedDialect : undefined,
      entries,
    });
    setTimeout(() => { setIsSaving(false); handleClose(); }, 500);
  };

  const handleClose = () => {
    setTitle(""); setImportText(""); setError(""); setIsSaving(false); onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Sheet slides up from bottom */}
      <div
        className="w-full max-w-[480px] rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up-in"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', maxHeight: '88vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="font-display text-lg font-bold text-foreground">
            {editingCollection ? "Edit Collection" : "New Collection"}
          </h3>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(88vh - 120px)' }}>
          <div className="p-5 space-y-4">

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Collection title
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. La Vie en Rose, Weekend phrases…"
                className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
                disabled={isSaving}
              />
            </div>

            {/* Arabic dialect selector */}
            {activeLanguage === "arabic" && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Arabic Dialect
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ARABIC_DIALECTS.map(d => (
                    <button
                      key={d.code}
                      type="button"
                      onClick={() => setSelectedDialect(d.code)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                        selectedDialect === d.code
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{d.flag}</span><span>{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Entries textarea */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {editingCollection ? "Edit entries" : "Import entries"}
              </label>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder={"One pair per line:\nHello | Bonjour\nGoodbye | Au revoir\nThank you | Merci / Merci beaucoup"}
                className="w-full h-44 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Format: <span className="text-primary font-mono">English | Target | Alt2</span>
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1 pb-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSaving}
                className="flex-1 px-4 py-3 rounded-xl bg-muted text-foreground font-semibold text-sm hover:bg-muted/70 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                  : <><Plus className="w-4 h-4" />{editingCollection ? "Update" : "Create"}</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
