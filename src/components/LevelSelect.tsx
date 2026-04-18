import type { Level } from "@/lib/flashcardData";
import { Check, BookOpen, Plus } from "lucide-react";

interface LevelSelectProps {
  levels: Level[];
  completedLevelIds: string[];
  onSelectLevel: (levelId: string) => void;
  onAddLevel?: () => void;
}

export function LevelSelect({ levels, completedLevelIds, onSelectLevel, onAddLevel }: LevelSelectProps) {
  return (
    <div className="grid gap-3 w-full">
      {levels.map((level, index) => {
        const isCompleted = completedLevelIds.includes(level.id);
        return (
          <button
            key={level.id}
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
                : "bg-primary/10 text-primary"
              }`}>
              {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm">{level.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {level.cards.length} cards
              </p>
            </div>
            {isCompleted && (
              <span className="text-xs font-medium text-success">Complete</span>
            )}
          </button>
        );
      })}
      
      {onAddLevel && (
        <button
          onClick={onAddLevel}
          className="relative w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-dashed border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold text-sm">Add custom level</span>
        </button>
      )}
    </div>
  );
}
