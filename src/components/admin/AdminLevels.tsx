import { useState, useEffect } from "react";
import { adminDb, type AdminLevelRow } from "@/lib/adminDb";
import { vocabularyLevels, phraseLevels, arabicVocabularyLevels, arabicPhraseLevels } from "@/lib/flashcardData";
import { GlobalLevelEditor } from "./GlobalLevelEditor";
import { BuiltinLevelEditor } from "./BuiltinLevelEditor";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Globe } from "lucide-react";

// ── Built-in levels viewer ────────────────────────────────────────────────────

const ALL_BUILTIN = [
  ...vocabularyLevels.map(l => ({ ...l, language: "french", tab: "vocabulary" })),
  ...phraseLevels.map(l => ({ ...l, language: "french", tab: "phrases" })),
  ...arabicVocabularyLevels.map(l => ({ ...l, language: "arabic", tab: "vocabulary" })),
  ...arabicPhraseLevels.map(l => ({ ...l, language: "arabic", tab: "phrases" })),
];

type BuiltinLevel = typeof ALL_BUILTIN[0];

function BuiltInLevels() {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "french" | "arabic">("all");
  const [editing, setEditing] = useState<BuiltinLevel | null>(null);

  const levels = filter === "all" ? ALL_BUILTIN : ALL_BUILTIN.filter(l => l.language === filter);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(["all", "french", "arabic"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-colors"
            style={filter === f
              ? { background: "rgba(155,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(155,92,246,0.3)" }
              : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.07)" }
            }>
            {f}
          </button>
        ))}
        <span className="text-white/25 text-xs ml-auto">{levels.length} levels</span>
      </div>

      <div className="rounded-2xl overflow-hidden divide-y divide-white/5" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)" }}>
        {levels.map(level => {
          const isOpen = open.has(level.id);
          return (
            <div key={level.id}>
              <div className="flex items-center gap-3 px-5 py-3">
                <button
                  className="flex-1 flex items-center gap-3 text-left hover:bg-white/3 transition-colors rounded"
                  onClick={() => setOpen(prev => { const n = new Set(prev); isOpen ? n.delete(level.id) : n.add(level.id); return n; })}
                >
                  {isOpen ? <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />}
                  <span className="flex-1 text-white/80 text-sm font-medium">{level.title}</span>
                  <span className="text-white/25 text-xs">{level.language} · {level.tab}</span>
                  {level.cefr && <span className="text-[11px] font-bold text-white/40 bg-white/5 rounded px-1.5 py-0.5">{level.cefr}</span>}
                  <span className="text-white/30 text-xs ml-2">{level.cards.length} cards</span>
                </button>
                <button
                  onClick={() => setEditing(level)}
                  className="p-1.5 rounded-lg hover:bg-white/6 transition-colors text-white/30 hover:text-white/70 flex-shrink-0"
                  title="Edit cards"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              {isOpen && (
                <div className="px-5 pb-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-white/25 uppercase tracking-wider">
                        <th className="py-1.5 text-left">English</th>
                        <th className="py-1.5 text-left">Target</th>
                        <th className="py-1.5 text-left hidden md:table-cell">Transliteration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {level.cards.map(card => (
                        <tr key={card.id} className="border-t border-white/4">
                          <td className="py-1.5 text-white/60 pr-4">{card.english}</td>
                          <td className="py-1.5 text-white/60 pr-4" dir={level.language === "arabic" ? "rtl" : "ltr"}>{card.target}</td>
                          <td className="py-1.5 text-white/35 hidden md:table-cell">{card.transliteration ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <BuiltinLevelEditor
          level={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ── Global levels CRUD ────────────────────────────────────────────────────────

function GlobalLevels() {
  const [levels, setLevels] = useState<AdminLevelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminLevelRow | null | undefined>(undefined); // undefined = closed, null = new
  const [open, setOpen] = useState<Set<string>>(new Set());

  const load = () => {
    setLoading(true);
    adminDb.listAllAdminLevels()
      .then(setLevels)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (level: AdminLevelRow) => {
    if (!window.confirm(`Delete "${level.title}" and all its cards?`)) return;
    await adminDb.deleteLevel(level.id);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-white/35 text-xs">Global levels appear in every user's level list.</p>
        <button
          onClick={() => setEditing(null)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-white"
          style={{ background: "linear-gradient(135deg,#9b5cf6,#ec4899)" }}
        >
          <Plus className="w-3.5 h-3.5" /> New Level
        </button>
      </div>

      {loading ? (
        <div className="text-white/30 text-sm p-6">Loading…</div>
      ) : levels.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: "#111111", border: "1px dashed rgba(255,255,255,0.1)" }}>
          <Globe className="w-8 h-8 text-white/15 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No global levels yet</p>
          <p className="text-white/20 text-xs mt-1">Levels you create here will appear for all users.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden divide-y divide-white/5" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)" }}>
          {levels.map(level => {
            const isOpen = open.has(level.id);
            return (
              <div key={level.id}>
                <div className="flex items-center gap-3 px-5 py-3">
                  <button className="flex-1 flex items-center gap-3 text-left" onClick={() => setOpen(prev => { const n = new Set(prev); isOpen ? n.delete(level.id) : n.add(level.id); return n; })}>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
                    <span className="text-white/80 text-sm font-medium">{level.title}</span>
                    <span className="text-white/25 text-xs">{level.language} · {level.tab}</span>
                    {level.cefr && <span className="text-[11px] font-bold text-violet-400 bg-violet-400/10 rounded px-1.5 py-0.5">{level.cefr}</span>}
                  </button>
                  <button onClick={() => setEditing(level)} className="p-1.5 rounded-lg hover:bg-white/6 transition-colors text-white/30 hover:text-white/70">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(level)} className="p-1.5 rounded-lg hover:bg-red-400/10 transition-colors text-white/30 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {isOpen && <ExpandedCards levelId={level.id} language={level.language} />}
              </div>
            );
          })}
        </div>
      )}

      {editing !== undefined && (
        <GlobalLevelEditor
          level={editing}
          onClose={() => setEditing(undefined)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function ExpandedCards({ levelId, language }: { levelId: string; language: string }) {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminDb.listAdminCards(levelId).then(setCards).finally(() => setLoading(false));
  }, [levelId]);

  if (loading) return <div className="px-5 pb-3 text-white/30 text-xs">Loading cards…</div>;
  if (!cards.length) return <div className="px-5 pb-3 text-white/25 text-xs">No cards</div>;

  return (
    <div className="px-5 pb-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-white/25 uppercase tracking-wider">
            <th className="py-1.5 text-left">English</th>
            <th className="py-1.5 text-left">Target</th>
          </tr>
        </thead>
        <tbody>
          {cards.map(card => (
            <tr key={card.id} className="border-t border-white/4">
              <td className="py-1.5 text-white/60 pr-4">{card.english}</td>
              <td className="py-1.5 text-white/60" dir={language === "arabic" ? "rtl" : "ltr"}>{card.target}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AdminLevels() {
  const [tab, setTab] = useState<"global" | "builtin">("global");

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {([["global", "Global Levels"], ["builtin", "Built-in Levels"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-4 py-2 rounded-full text-sm font-bold transition-colors"
            style={tab === key
              ? { background: "rgba(155,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(155,92,246,0.3)" }
              : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.07)" }
            }>
            {label}
          </button>
        ))}
      </div>
      {tab === "global" ? <GlobalLevels /> : <BuiltInLevels />}
    </div>
  );
}
