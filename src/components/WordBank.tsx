import { useState } from "react";
import { Plus, Check, Upload, GripVertical, X, Flag } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FlashcardItem } from "@/lib/flashcardData";
import { BulkImportModal } from "./BulkImportModal";

const SUGGEST_EMAIL = "davejayden49@gmail.com";

interface WordBankProps {
  items: FlashcardItem[];
  onAdd: (english: string, target: string, alternatives?: string[]) => void;
  onUpdate?: (id: string, english: string, target: string, alternatives?: string[]) => void;
  onDelete: (id: string) => void;
  onBulkAdd: (entries: { english: string; french: string; alternatives?: string[] }[]) => void;
  onReorder?: (newOrderIds: string[]) => void;
  label: string;
  targetLabel?: string;
  rtl?: boolean;
}

function targetOf(item: FlashcardItem): string {
  return item.target ?? item.french ?? "";
}

function SuggestRow({ item, rtl }: { item: FlashcardItem; rtl?: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const target = targetOf(item);

  const send = () => {
    const subject = encodeURIComponent(`Card suggestion: ${item.english} → ${target}`);
    const body = encodeURIComponent(
      `Card: ${item.english} → ${target}\n\nMy suggestion:\n${text}`
    );
    window.open(`mailto:${SUGGEST_EMAIL}?subject=${subject}&body=${body}`);
    setText("");
    setOpen(false);
  };

  return (
    <div
      style={{
        background: open ? 'rgba(155,92,246,0.08)' : '#111111',
        border: open ? '1px solid rgba(155,92,246,0.3)' : '1px solid rgba(255,255,255,0.07)',
        transition: 'background 0.15s, border-color 0.15s',
      }}
      className="flex flex-col rounded-2xl overflow-hidden"
    >
      <div className="flex items-center gap-2 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-white/85 font-medium">{item.english}</span>
            <span className="text-white/25 text-xs">→</span>
            <span dir={rtl ? "rtl" : "ltr"} className="text-sm font-bold" style={{ color: '#c4b5fd' }}>{target}</span>
          </div>
          {item.transliteration && (
            <div className="text-[11px] text-white/40 italic mt-0.5">{item.transliteration}</div>
          )}
          {item.alternatives && item.alternatives.length > 0 && (
            <div className="text-[11px] text-white/35 mt-0.5">alt: {item.alternatives.join(' · ')}</div>
          )}
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="p-2 text-white/25 hover:text-violet-400 transition-colors flex-shrink-0"
          title="Suggest a change"
        >
          <Flag className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Describe what should change…"
            rows={2}
            className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setOpen(false); setText(""); }}
              className="text-xs text-white/35 hover:text-white/60 px-3 py-1.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={send}
              disabled={!text.trim()}
              className="text-xs font-bold text-white px-4 py-1.5 rounded-full transition-opacity disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#9b5cf6,#ec4899)' }}
            >
              Send suggestion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableRow({
  item, rtl,
}: {
  item: FlashcardItem;
  rtl?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2">
      <button
        {...attributes} {...listeners}
        className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/40 touch-none flex-shrink-0 mt-3.5"
        aria-label="Reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <SuggestRow item={item} rtl={rtl} />
      </div>
    </div>
  );
}

export function WordBank({ items, onAdd, onUpdate, onDelete, onBulkAdd, onReorder, label, targetLabel = "Target", rtl }: WordBankProps) {
  const [english, setEnglish] = useState("");
  const [target, setTarget] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && onReorder) {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      onReorder(arrayMove(items, oldIndex, newIndex).map(i => i.id));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!english.trim() || !target.trim()) return;
    const parts = target.split(/[\/|]/).map(p => p.trim()).filter(Boolean);
    const main = parts[0] || target.trim();
    const alts = parts.slice(1);
    if (editingId && onUpdate) {
      onUpdate(editingId, english.trim(), main, alts.length ? alts : undefined);
      setEditingId(null);
    } else {
      onAdd(english.trim(), main, alts.length ? alts : undefined);
    }
    setEnglish("");
    setTarget("");
  };

  const cancelEdit = () => { setEditingId(null); setEnglish(""); setTarget(""); };

  return (
    <div className="flex flex-col gap-3">
      {/* Pair list with drag-to-reorder + suggest per card */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-white/35 text-sm">
          No pairs yet — add one below.
        </div>
      ) : onReorder ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {items.map(item => (
                <SortableRow
                  key={item.id}
                  item={item}
                  rtl={rtl}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map(item => (
            <div key={item.id} className="flex-1 min-w-0">
              <SuggestRow item={item} rtl={rtl} />
            </div>
          ))}
        </div>
      )}

      {/* Add / edit form */}
      <form onSubmit={submit} className="flex flex-col gap-2 pt-1">
        {editingId && (
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#c4b5fd' }}>Editing pair</span>
            <button type="button" onClick={cancelEdit} className="text-[11px] text-white/40 hover:text-white/70 flex items-center gap-1">
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={english}
            onChange={e => setEnglish(e.target.value)}
            placeholder="English"
            className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none"
            style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}
          />
          <input
            value={target}
            onChange={e => setTarget(e.target.value)}
            placeholder={`${targetLabel} (a / b for alternatives)`}
            dir={rtl ? "rtl" : "ltr"}
            className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none"
            style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}
          />
          <button
            type="submit"
            className="rounded-xl px-4 flex items-center justify-center text-white flex-shrink-0"
            style={{ background: editingId ? 'linear-gradient(135deg,#9b5cf6,#22c55e)' : 'linear-gradient(135deg,#9b5cf6,#ec4899)' }}
            title={editingId ? "Save changes" : "Add pair"}
          >
            {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </form>

      {/* Bulk import */}
      <button
        onClick={() => setIsBulkImportOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <Upload className="w-4 h-4" />
        Bulk import
      </button>

      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImport={onBulkAdd}
        existingItems={items}
      />
    </div>
  );
}
