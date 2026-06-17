import { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2, Sparkles } from "lucide-react";
import type { Collection, CollectionEntry, CollectionFormData, CollectionCategory } from "@/lib/collectionTypes";
import { COLLECTION_CATEGORIES } from "@/lib/collectionTypes";
import { ARABIC_DIALECTS } from "@/lib/languageConfig";
import type { Language } from "@/lib/languageConfig";
import { WavyLine } from "./LevelSelect";
import { AudioRecorderInput } from "./AudioRecorderInput";
import { arabicToLatin } from "@/lib/transliterate";

interface Pair { english: string; target: string; transliteration?: string; audioUrl?: string; }

interface NewCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (collection: CollectionFormData) => void;
  editingCollection?: Collection;
  activeLanguage?: Language;
  mode?: "notes" | "bulk";
}

export function NewCollectionModal({
  isOpen, onClose, onSave, editingCollection, activeLanguage, mode = "bulk",
}: NewCollectionModalProps) {
  const [title, setTitle]             = useState(editingCollection?.title || "");
  const [importText, setImportText]   = useState("");
  const [pairs, setPairs]             = useState<Pair[]>([{ english: "", target: "" }]);
  const [isSaving, setIsSaving]       = useState(false);
  const [error, setError]             = useState("");
  const [selectedDialect, setSelectedDialect]   = useState(editingCollection?.dialect ?? "ar-SA");
  const [selectedCategory, setSelectedCategory] = useState<CollectionCategory | undefined>(editingCollection?.category);

  const targetLabel = activeLanguage === "arabic" ? "Arabic" : "French";
  const bottomRef = useRef<HTMLDivElement>(null);

  // Populate fields when modal opens / editingCollection changes
  useEffect(() => {
    if (editingCollection && isOpen) {
      setTitle(editingCollection.title);
      setSelectedCategory(editingCollection.category);
      setSelectedDialect(editingCollection.dialect ?? "ar-SA");

      // Notes mode: populate pairs
      if (editingCollection.entries.length > 0) {
        setPairs(editingCollection.entries.map(e => ({
          english: e.english,
          target: e.target ?? e.french,
          transliteration: e.transliteration,
          audioUrl: e.audioUrl,
        })));
      } else {
        setPairs([{ english: "", target: "" }]);
      }

      // Bulk mode: populate textarea
      const text = editingCollection.entries.map(entry => {
        const alts = entry.alternatives?.length ? ` | ${entry.alternatives.join(' | ')}` : '';
        return `${entry.english} | ${entry.french}${alts}`;
      }).join('\n');
      setImportText(text);
    } else if (!isOpen) {
      setImportText("");
      setTitle("");
      setSelectedCategory(undefined);
      setPairs([{ english: "", target: "" }]);
    }
  }, [editingCollection, isOpen]);

  useEffect(() => {
    if (isOpen) setSelectedDialect(editingCollection?.dialect ?? "ar-SA");
  }, [isOpen, editingCollection]);

  // ── Pair helpers (Notes mode) ──────────────────────────────────────────────
  const updatePair = (i: number, field: "english" | "target" | "transliteration", value: string) => {
    setPairs(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  };
  const setPairAudio = (i: number, audioUrl: string | undefined) => {
    setPairs(prev => prev.map((p, idx) => idx === i ? { ...p, audioUrl } : p));
  };
  const addPair = () => {
    setPairs(prev => [...prev, { english: "", target: "" }]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };
  const removePair = (i: number) => {
    setPairs(prev => prev.length === 1 ? [{ english: "", target: "" }] : prev.filter((_, idx) => idx !== i));
  };

  // ── Bulk parse ─────────────────────────────────────────────────────────────
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

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = () => {
    setError("");
    if (!title.trim()) { setError("Please enter a title"); return; }

    let entries: CollectionEntry[] = [];

    if (mode === "notes") {
      entries = pairs
        .filter(p => p.english.trim() && p.target.trim())
        .map(p => ({
          english: p.english.trim(),
          french: p.target.trim(),
          target: p.target.trim(),
          ...(p.transliteration?.trim() ? { transliteration: p.transliteration.trim() } : {}),
          ...(p.audioUrl ? { audioUrl: p.audioUrl } : {}),
        }));
      if (entries.length === 0 && !editingCollection) {
        setError("Add at least one complete pair");
        return;
      }
    } else {
      entries = importText.trim() ? parseImportText(importText) : [];
      if (!importText.trim() && !editingCollection) {
        setError("Add at least one entry (English | Target)");
        return;
      }
      if (importText.trim() && entries.length === 0) {
        setError("No valid entries found — use: English | French");
        return;
      }
    }

    setIsSaving(true);
    onSave({
      title: title.trim(),
      language: activeLanguage ?? "french",
      dialect: activeLanguage === "arabic" ? selectedDialect : undefined,
      category: selectedCategory,
      entries,
    });
    setTimeout(() => { setIsSaving(false); handleClose(); }, 500);
  };

  const handleClose = () => {
    (document.activeElement as HTMLElement)?.blur();
    setTitle(""); setImportText(""); setError(""); setIsSaving(false);
    setSelectedCategory(undefined); setPairs([{ english: "", target: "" }]); onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-[480px] rounded-t-[32px] overflow-hidden animate-slide-up-in"
        style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.07)', maxHeight: '92vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-0">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 20px)' }}>
          <div className="px-5 pt-5 pb-4 space-y-5">

            {/* Title heading */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-black text-white text-[1.9rem] leading-tight tracking-tight">
                  {editingCollection ? "Edit" : "New"} Collection
                </h3>
                <WavyLine className="mt-1.5 max-w-[160px]" />
              </div>
              <button
                onClick={handleClose}
                className="mt-1 p-2 rounded-full hover:bg-white/8 transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <X className="w-4 h-4 text-white/50" />
              </button>
            </div>

            {/* Collection name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white/40 text-sm font-medium pl-1">Name</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="La Vie en Rose, Weekend phrases…"
                autoFocus
                disabled={isSaving}
                className="w-full rounded-full px-5 py-4 text-white text-sm font-medium placeholder:text-white/25 outline-none"
                style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>

            {/* Category picker */}
            <div className="flex flex-col gap-2">
              <label className="text-white/40 text-sm font-medium pl-1">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {COLLECTION_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setSelectedCategory(selectedCategory === cat.value ? undefined : cat.value)}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-semibold transition-all"
                    style={selectedCategory === cat.value
                      ? { background: 'linear-gradient(135deg, #9b5cf6, #ec4899)', color: '#fff', border: '1px solid transparent' }
                      : { background: '#111111', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }
                    }
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Arabic dialect selector */}
            {activeLanguage === "arabic" && (
              <div className="flex flex-col gap-2">
                <label className="text-white/40 text-sm font-medium pl-1">Dialect</label>
                <div className="grid grid-cols-2 gap-2">
                  {ARABIC_DIALECTS.map(d => (
                    <button
                      key={d.code}
                      type="button"
                      onClick={() => setSelectedDialect(d.code)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all"
                      style={selectedDialect === d.code
                        ? { background: 'linear-gradient(135deg, #9b5cf6, #ec4899)', color: '#fff', border: '1px solid transparent' }
                        : { background: '#111111', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }
                      }
                    >
                      <span>{d.flag}</span><span>{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Entries ── */}
            {mode === "notes" ? (
              /* Notes mode — pair-by-pair */
              <div className="flex flex-col gap-2">
                <label className="text-white/40 text-sm font-medium pl-1">Pairs</label>
                <div className="flex flex-col gap-2">
                  {pairs.map((pair, i) => (
                    <div
                      key={i}
                      className="rounded-2xl p-3 flex flex-col gap-2"
                      style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white/25 w-14 flex-shrink-0">English</span>
                        <input
                          type="text"
                          value={pair.english}
                          onChange={e => updatePair(i, "english", e.target.value)}
                          placeholder="e.g. Hello"
                          disabled={isSaving}
                          className="flex-1 bg-transparent text-white text-sm placeholder:text-white/20 outline-none"
                        />
                        {pairs.length > 1 && (
                          <button
                            onClick={() => removePair(i)}
                            className="flex-shrink-0 p-1 rounded-lg hover:bg-white/8 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-white/25" />
                          </button>
                        )}
                      </div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white/25 w-14 flex-shrink-0">{targetLabel}</span>
                        <input
                          type="text"
                          value={pair.target}
                          onChange={e => updatePair(i, "target", e.target.value)}
                          placeholder="e.g. Bonjour"
                          disabled={isSaving}
                          className="flex-1 bg-transparent text-white text-sm placeholder:text-white/20 outline-none"
                        />
                      </div>
                      {activeLanguage === "arabic" && (
                        <>
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-white/25 w-14 flex-shrink-0">Translit.</span>
                            <input
                              type="text"
                              value={pair.transliteration ?? ""}
                              onChange={e => updatePair(i, "transliteration", e.target.value)}
                              placeholder="e.g. marḥaban"
                              disabled={isSaving}
                              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/20 outline-none"
                            />
                            {pair.target.trim() && (
                              <button
                                type="button"
                                onClick={() => updatePair(i, "transliteration", arabicToLatin(pair.target))}
                                disabled={isSaving}
                                title="Auto-generate from Arabic"
                                className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold flex-shrink-0"
                                style={{ background: "rgba(129,140,248,0.12)", color: "rgba(165,180,252,0.9)", border: "1px solid rgba(129,140,248,0.25)" }}
                              >
                                <Sparkles className="w-3 h-3" /> Auto
                              </button>
                            )}
                          </div>
                        </>
                      )}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white/25 w-14 flex-shrink-0">Audio</span>
                        <AudioRecorderInput
                          value={pair.audioUrl}
                          onChange={(uri) => setPairAudio(i, uri)}
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add pair button */}
                <button
                  type="button"
                  onClick={addPair}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-colors"
                  style={{ background: 'rgba(129,140,248,0.08)', border: '1px dashed rgba(129,140,248,0.25)', color: 'rgba(129,140,248,0.7)' }}
                >
                  <Plus className="w-4 h-4" />
                  Add pair
                </button>

                <div ref={bottomRef} />
              </div>
            ) : (
              /* Bulk mode — textarea */
              <div className="flex flex-col gap-1.5">
                <label className="text-white/40 text-sm font-medium pl-1">
                  {editingCollection ? "Edit entries" : "Entries"}
                </label>
                <textarea
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder={"One pair per line:\nHello | Bonjour\nGoodbye | Au revoir\nThank you | Merci"}
                  disabled={isSaving}
                  className="w-full h-40 rounded-3xl px-5 py-4 text-sm text-white placeholder:text-white/25 font-mono resize-none outline-none"
                  style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <p className="text-xs text-white/25 pl-1">
                  Format: <span className="text-white/45 font-mono">English | Target | Alt</span>
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

          </div>

          {/* Sticky Create button */}
          <div className="sticky bottom-0 px-5 pt-3 pb-7" style={{ background: '#050505' }}>
            <div className="p-[1.5px] rounded-full" style={{ background: 'linear-gradient(135deg, #9b5cf6, #ec4899)' }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 rounded-full font-bold text-white text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                style={{ background: '#0a0a0a' }}
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
