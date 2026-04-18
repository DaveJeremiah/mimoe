import type { Level } from "@/lib/flashcardData";
import { Check, BookOpen, Trash2, Plus } from "lucide-react";

interface LevelSelectProps {
  levels: Level[];
  completedLevelIds: string[];
  customLevelIds?: string[];
  onSelectLevel: (levelId: string) => void;
  onDeleteLevel?: (levelId: string) => void;
  onCreateLevel?: () => void;
}

export function LevelSelect({
  levels,
  completedLevelIds,
  customLevelIds = [],
  onSelectLevel,
  onDeleteLevel,
  onCreateLevel,
}: LevelSelectProps) {
  return (
    <div className="grid gap-3 w-full">
      {levels.map((level, index) => {
        const isCompleted = completedLevelIds.includes(level.id);
        const isCustom = customLevelIds.includes(level.id);
        return (
          <div key={level.id} className="relative group">
            <button
              onClick={() => onSelectLevel(level.id)}
              className={`relative w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 text-left
                ${isCompleted
                  ? "border-success/30 bg-success/5 hover:bg-success/10"
                  : "border-border bg-card hover:bg-accent/50"
                } card-shadow hover:scale-[1.01] active:scale-[0.99]`}
            >
              <div className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold text-sm shrink-0
                ${isCompleted
                  ? "bg-success/20 text-success"
                  : isCustom
                  ? "bg-orange-100 text-orange-600"
                  : "bg-primary/10 text-primary"
                }`}>
                {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm">{level.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {level.cards.length} cards
                  {isCustom && <span className="ml-1 text-orange-500 font-medium">· Custom</span>}
                </p>
              </div>
              {isCompleted && (
                <span className="text-xs font-medium text-success">Complete</span>
              )}
            </button>

            {/* Delete button — only shown for custom levels */}
            {isCustom && onDeleteLevel && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteLevel(level.id); }}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                title="Delete level"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}

      {/* New Level button */}
      {onCreateLevel && (
        <button
          onClick={onCreateLevel}
          className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-200"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium">New Level</span>
        </button>
      )}
    </div>
  );
}
