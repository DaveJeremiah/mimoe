import { useState } from "react";
import { Trash2, Plus, X, BookOpen, Upload, Check } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FlashcardItem } from "@/lib/flashcardData";
import { BulkImportModal } from "./BulkImportModal";

function SortableItem({ item, editingId, handleEdit, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    position: isDragging ? "relative" as const : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 rounded-xl border ${editingId === item.id ? 'bg-indigo-50/50 border-indigo-200' : 'bg-background border-border'} ${isDragging ? 'shadow-lg ring-2 ring-primary/20 bg-card z-10' : ''}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 mr-1 text-muted-foreground hover:text-foreground touch-none">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
      </div>
      <div className="flex-1 min-w-0 pr-4">
        <span className="text-sm font-medium">{item.english}</span>
        <span className="text-muted-foreground mx-2">→</span>
        <span className="text-sm text-primary font-semibold">{item.french}</span>
        {item.alternatives && item.alternatives.length > 0 && (
          <span className="ml-2 text-xs text-muted-foreground italic">/ {item.alternatives.join(' / ')}</span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => handleEdit(item)}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          title="Edit entry"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="p-2 text-destructive/60 hover:text-destructive transition-colors shrink-0"
          title="Delete entry"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface WordBankProps {
  items: FlashcardItem[];
  onAdd: (english: string, french: string, alternatives?: string[]) => void;
  onUpdate?: (id: string, english: string, french: string, alternatives?: string[]) => void;
  onDelete: (id: string) => void;
  onBulkAdd: (entries: { english: string; french: string; alternatives?: string[] }[]) => void;
  onReorder?: (newOrderIds: string[]) => void;
  label: string;
}

export function WordBank({ items, onAdd, onUpdate, onDelete, onBulkAdd, onReorder, label }: WordBankProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [english, setEnglish] = useState("");
  const [french, setFrench] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      const newArray = arrayMove(items, oldIndex, newIndex);
      if (onReorder) {
        onReorder(newArray.map(i => i.id));
      }
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!english.trim() || !french.trim()) return;

    // Splitting by slash (and also pipe just in case)
    const frenchParts = french.split(/[\/|]/).map(p => p.trim()).filter(Boolean);
    const mainFrench = frenchParts[0] || french.trim();
    const alternatives = frenchParts.slice(1);

    if (editingId && onUpdate) {
      onUpdate(editingId, english.trim(), mainFrench, alternatives.length > 0 ? alternatives : undefined);
      setEditingId(null);
    } else {
      onAdd(english.trim(), mainFrench, alternatives.length > 0 ? alternatives : undefined);
    }
    setEnglish("");
    setFrench("");
  };

  const handleEdit = (item: FlashcardItem) => {
    setEditingId(item.id);
    setEnglish(item.english);
    const frenchVal = item.alternatives && item.alternatives.length > 0 
      ? `${item.french} / ${item.alternatives.join(" / ")}` 
      : item.french;
    setFrench(frenchVal);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
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
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={items.map(i => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {items.map((item) => (
                    <SortableItem key={item.id} item={item} editingId={editingId} handleEdit={handleEdit} onDelete={onDelete} />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            <div className="p-4 border-t border-border space-y-3 bg-muted/30">
              {/* Single Entry Form */}
              <form onSubmit={handleAdd} className="space-y-2">
                {editingId && (
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Editing Entry</span>
                    <button type="button" onClick={handleCancelEdit} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={english}
                    onChange={(e) => setEnglish(e.target.value)}
                    placeholder="English"
                    spellCheck={true}
                    autoCorrect="on"
                    className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="text"
                    value={french}
                    onChange={(e) => setFrench(e.target.value)}
                    placeholder="French (e.g. Bonjour / Salut)"
                    spellCheck={true}
                    autoCorrect="on"
                    className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    className={`rounded-xl px-4 py-2.5 text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center min-w-[44px] ${editingId ? 'bg-indigo-600' : 'bg-primary'}`}
                    title={editingId ? "Save changes" : "Add entry"}
                  >
                    {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
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
