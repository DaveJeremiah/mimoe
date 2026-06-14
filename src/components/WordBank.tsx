import { useState } from "react";
import { Trash2, Plus, Check, Upload, Pencil, GripVertical, X } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FlashcardItem } from "@/lib/flashcardData";
import { BulkImportModal } from "./BulkImportModal";

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

function SortableRow({
  item, editingId, onEdit, onDelete, rtl,
}: {
  item: FlashcardItem;
  editingId: string | null;
  onEdit: (item: FlashcardItem) => void;
  onDelete: (id: string) => void;
  rtl?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
  };
  const isEditing = editingId === item.id;
  const target = targetOf(item);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: isEditing ? 'rgba(155,92,246,0.12)' : '#111111',
        border: isEditing ? '1px solid rgba(155,92,246,0.4)' : '1px solid rgba(255,255,255,0.07)',
        boxShadow: isDragging ? '0 12px 28px rgba(0,0,0,0.5)' : undefined,
      }}
      className="flex items-center gap-2 p-3 rounded-2xl"
    >
      <button
        {...attributes} {...listeners}
        className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/40 touch-none flex-shrink-0"
        aria-label="Reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

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

      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button onClick={() => onEdit(item)} className="p-2 text-white/35 hover:text-white/80 transition-colors" title="Edit">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(item.id)} className="p-2 text-red-400/50 hover:text-red-400 transition-colors" title="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
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

  const startEdit = (item: FlashcardItem) => {
    setEditingId(item.id);
    setEnglish(item.english);
    const t = targetOf(item);
    setTarget(item.alternatives?.length ? `${t} / ${item.alternatives.join(" / ")}` : t);
  };

  const cancelEdit = () => { setEditingId(null); setEnglish(""); setTarget(""); };

  return (
    <div className="flex flex-col gap-3">
      {/* Pair list */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-white/35 text-sm">
          No pairs yet — add one below.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {items.map(item => (
                <SortableRow
                  key={item.id}
                  item={item}
                  editingId={editingId}
                  onEdit={startEdit}
                  onDelete={onDelete}
                  rtl={rtl}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
