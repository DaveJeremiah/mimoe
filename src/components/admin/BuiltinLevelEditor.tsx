import { useState, useEffect } from "react";
import { adminDb, type BuiltinOverrideRow } from "@/lib/adminDb";
import type { FlashcardItem } from "@/lib/flashcardData";
import { X, Plus, Eye, EyeOff, Save } from "lucide-react";

interface EditorCard {
  card_id: string;
  english: string;
  target: string;
  transliteration: string;
  hidden: boolean;
  isNew: boolean;
}

interface BuiltinLevel {
  id: string;
  title: string;
  language: string;
  cards: FlashcardItem[];
}

interface Props {
  level: BuiltinLevel;
  onClose: () => void;
  onSaved?: () => void;
}

function makeEditorCard(card: FlashcardItem): EditorCard {
  return {
    card_id: card.id,
    english: card.english,
    target: card.target ?? card.french ?? "",
    transliteration: card.transliteration ?? "",
    hidden: false,
    isNew: false,
  };
}

function applyOverrides(base: EditorCard[], overrides: BuiltinOverrideRow[]): EditorCard[] {
  const oMap = new Map(overrides.map(o => [o.card_id, o]));
  const existingIds = new Set(base.map(c => c.card_id));

  const result = base.map(c => {
    const o = oMap.get(c.card_id);
    if (!o) return c;
    return {
      ...c,
      english: o.english || c.english,
      target: o.target || c.target,
      transliteration: o.transliteration ?? c.transliteration,
      hidden: o.hidden,
    };
  });

  // New cards added via overrides (not in original level)
  for (const o of overrides) {
    if (!existingIds.has(o.card_id) && !o.hidden) {
      result.push({
        card_id: o.card_id,
        english: o.english,
        target: o.target,
        transliteration: o.transliteration ?? "",
        hidden: false,
        isNew: true,
      });
    }
  }

  return result;
}

export function BuiltinLevelEditor({ level, onClose, onSaved }: Props) {
  const [cards, setCards] = useState<EditorCard[]>(() => level.cards.map(makeEditorCard));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    adminDb.listBuiltinOverrides(level.id)
      .then(overrides => {
        setCards(applyOverrides(level.cards.map(makeEditorCard), overrides));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [level.id]);

  const update = (idx: number, field: keyof EditorCard, value: string | boolean) => {
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const addCard = () => {
    setCards(prev => [...prev, {
      card_id: crypto.randomUUID(),
      english: "",
      target: "",
      transliteration: "",
      hidden: false,
      isNew: true,
    }]);
  };

  const removeNew = (idx: number) => {
    setCards(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      // Only send cards that differ from the original OR are new
      // We send everything; the DB does an atomic replace
      const toSend = cards.filter(c => !c.isNew || !c.hidden); // skip "new but hidden" — they were never persisted
      await adminDb.saveBuiltinOverrides(level.id, toSend as BuiltinOverrideRow[]);
      onSaved?.();
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const isRtl = level.language === "arabic";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-0.5">Edit built-in level</p>
            <p className="text-white font-bold text-sm truncate">{level.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/6 text-white/35 hover:text-white/70 transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/25 uppercase tracking-wider text-[10px]">
                  <th className="py-2 text-left w-1/3">English</th>
                  <th className="py-2 text-left w-1/3">Target</th>
                  <th className="py-2 text-left hidden md:table-cell">Transliteration</th>
                  <th className="py-2 text-right w-10"></th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card, idx) => (
                  <tr
                    key={card.card_id}
                    className="border-t border-white/4"
                    style={card.hidden ? { opacity: 0.3 } : undefined}
                  >
                    <td className="py-1.5 pr-2">
                      <input
                        value={card.english}
                        onChange={e => update(idx, "english", e.target.value)}
                        disabled={card.hidden}
                        className="w-full bg-transparent text-white/80 outline-none focus:bg-white/5 rounded px-1.5 py-1 transition-colors"
                        placeholder="English"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        value={card.target}
                        onChange={e => update(idx, "target", e.target.value)}
                        disabled={card.hidden}
                        dir={isRtl ? "rtl" : "ltr"}
                        className="w-full bg-transparent text-white/80 outline-none focus:bg-white/5 rounded px-1.5 py-1 transition-colors"
                        placeholder="Target"
                      />
                    </td>
                    <td className="py-1.5 pr-2 hidden md:table-cell">
                      <input
                        value={card.transliteration}
                        onChange={e => update(idx, "transliteration", e.target.value)}
                        disabled={card.hidden}
                        className="w-full bg-transparent text-white/50 outline-none focus:bg-white/5 rounded px-1.5 py-1 transition-colors"
                        placeholder="—"
                      />
                    </td>
                    <td className="py-1.5 text-right">
                      {card.isNew ? (
                        <button
                          onClick={() => removeNew(idx)}
                          className="p-1 rounded text-white/25 hover:text-red-400 transition-colors"
                          title="Remove"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => update(idx, "hidden", !card.hidden)}
                          className="p-1 rounded text-white/25 hover:text-white/60 transition-colors"
                          title={card.hidden ? "Restore card" : "Hide card"}
                        >
                          {card.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            onClick={addCard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-white/60 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Plus className="w-3.5 h-3.5" /> Add card
          </button>
          {error && <p className="text-red-400 text-xs flex-1 truncate">{error}</p>}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-full text-xs font-bold text-white/40 hover:text-white/70 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white transition-opacity disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#9b5cf6,#ec4899)" }}
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
