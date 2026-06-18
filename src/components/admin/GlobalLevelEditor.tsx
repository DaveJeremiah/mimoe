import { useState, useEffect } from "react";
import { adminDb, type AdminLevelRow, type CardPair } from "@/lib/adminDb";
import { X, Plus, Trash2 } from "lucide-react";

interface Props {
  level: AdminLevelRow | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyCard = (): CardPair => ({ english: "", target: "", alternatives: [], transliteration: "", position: 0 });

export function GlobalLevelEditor({ level, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(level?.title ?? "");
  const [tab, setTab] = useState<"vocabulary" | "phrases">(level?.tab ?? "vocabulary");
  const [language, setLanguage] = useState(level?.language ?? "french");
  const [cefr, setCefr] = useState<string>(level?.cefr ?? "");
  const [dialect, setDialect] = useState(level?.dialect ?? "");
  const [cards, setCards] = useState<CardPair[]>([emptyCard()]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [loadingCards, setLoadingCards] = useState(!!level);

  useEffect(() => {
    if (!level) return;
    setLoadingCards(true);
    adminDb.listAdminCards(level.id).then(items => {
      setCards(items.length > 0
        ? items.map(c => ({ english: c.english, target: c.target, alternatives: c.alternatives ?? [], transliteration: c.transliteration ?? "", position: 0 }))
        : [emptyCard()]
      );
    }).finally(() => setLoadingCards(false));
  }, [level]);

  const addCard = () => setCards(prev => [...prev, emptyCard()]);
  const removeCard = (i: number) => setCards(prev => prev.filter((_, idx) => idx !== i));
  const updateCard = (i: number, field: keyof CardPair, value: string) =>
    setCards(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));

  const handleSave = async () => {
    if (!title.trim()) { setErr("Title is required"); return; }
    const validCards = cards.filter(c => c.english.trim() && c.target.trim());
    if (validCards.length === 0) { setErr("Add at least one complete card pair"); return; }
    setSaving(true);
    setErr("");
    try {
      const levelId = await adminDb.upsertLevel({
        id: level?.id ?? null,
        title: title.trim(),
        tab,
        language,
        cefr: cefr || null,
        dialect: language === "arabic" ? (dialect || null) : null,
        position: level?.position ?? 999,
      });
      await adminDb.replaceCards(levelId, validCards.map((c, i) => ({ ...c, position: i })));
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl mx-0 md:mx-4 rounded-t-3xl md:rounded-3xl flex flex-col max-h-[90vh]"
        style={{ background: "#0e0e0e", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 flex-shrink-0">
          <h2 className="text-white font-bold text-base">{level ? "Edit Level" : "New Global Level"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/8 transition-colors">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-white/40 text-xs font-bold uppercase tracking-wider block mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. A1 · Greetings & basics"
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.08)" }}
              />
            </div>
            <div>
              <label className="text-white/40 text-xs font-bold uppercase tracking-wider block mb-1.5">Language</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <option value="french">French</option>
                <option value="arabic">Arabic</option>
              </select>
            </div>
            <div>
              <label className="text-white/40 text-xs font-bold uppercase tracking-wider block mb-1.5">Tab</label>
              <select
                value={tab}
                onChange={e => setTab(e.target.value as "vocabulary" | "phrases")}
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <option value="vocabulary">Vocabulary</option>
                <option value="phrases">Phrases</option>
              </select>
            </div>
            <div>
              <label className="text-white/40 text-xs font-bold uppercase tracking-wider block mb-1.5">CEFR Band</label>
              <select
                value={cefr}
                onChange={e => setCefr(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <option value="">None</option>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
              </select>
            </div>
            {language === "arabic" && (
              <div>
                <label className="text-white/40 text-xs font-bold uppercase tracking-wider block mb-1.5">Dialect</label>
                <select
                  value={dialect}
                  onChange={e => setDialect(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                  style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <option value="">Default (MSA)</option>
                  <option value="ar-SA">Saudi (ar-SA)</option>
                  <option value="ar-EG">Egyptian (ar-EG)</option>
                  <option value="ar-MA">Moroccan (ar-MA)</option>
                  <option value="ar-DZ">Algerian (ar-DZ)</option>
                </select>
              </div>
            )}
          </div>

          {/* Cards table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-white/40 text-xs font-bold uppercase tracking-wider">Cards ({cards.filter(c => c.english && c.target).length} complete)</label>
              <button type="button" onClick={addCard}
                className="flex items-center gap-1 text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add row
              </button>
            </div>

            {loadingCards ? (
              <div className="text-white/30 text-sm py-4">Loading cards…</div>
            ) : (
              <div className="space-y-2">
                <div className="grid gap-2 text-[11px] font-bold text-white/25 uppercase tracking-wider px-1"
                  style={{ gridTemplateColumns: "1fr 1fr 1fr 28px" }}>
                  <span>English</span>
                  <span>{language === "arabic" ? "Arabic" : "French"}</span>
                  <span>Transliteration</span>
                  <span />
                </div>
                {cards.map((card, i) => (
                  <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: "1fr 1fr 1fr 28px" }}>
                    <input
                      value={card.english}
                      onChange={e => updateCard(i, "english", e.target.value)}
                      placeholder="English"
                      className="rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none"
                      style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)" }}
                    />
                    <input
                      value={card.target}
                      onChange={e => updateCard(i, "target", e.target.value)}
                      placeholder={language === "arabic" ? "Arabic" : "French"}
                      dir={language === "arabic" ? "rtl" : "ltr"}
                      className="rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none"
                      style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)" }}
                    />
                    <input
                      value={card.transliteration}
                      onChange={e => updateCard(i, "transliteration", e.target.value)}
                      placeholder="e.g. merci"
                      className="rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none"
                      style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)" }}
                    />
                    <button type="button" onClick={() => removeCard(i)} className="flex items-center justify-center text-white/25 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {err && <p className="text-red-400 text-sm">{err}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-white/6 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white/50 hover:text-white/80 transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-opacity disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#9b5cf6,#ec4899)" }}>
            {saving ? "Saving…" : level ? "Save Changes" : "Create Level"}
          </button>
        </div>
      </div>
    </div>
  );
}
