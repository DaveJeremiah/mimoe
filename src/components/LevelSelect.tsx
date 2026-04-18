import type { Level } from "@/lib/flashcardData";
import { Check } from "lucide-react";

interface LevelSelectProps {
  levels: Level[];
  completedLevelIds: string[];
  onSelectLevel: (levelId: string) => void;
}

export function LevelSelect({ levels, completedLevelIds, onSelectLevel }: LevelSelectProps) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      {levels.map((level, index) => {
        const isCompleted = completedLevelIds.includes(level.id);
        const emoji = ["🔤", "💬", "📚", "🎯", "⚡", "🌟"][index % 6];
        return (
          <button
            key={level.id}
            onClick={() => onSelectLevel(level.id)}
            className={`relative flex flex-col items-start justify-between p-4 rounded-2xl border transition-all duration-200 aspect-square text-left
              ${isCompleted
                ? "border-success/30 bg-success/10"
                : "border-border bg-card hover:bg-muted"
              } card-shadow active:scale-[0.97]`}
          >
            <span className="text-3xl">{emoji}</span>
            <div>
              <h3 className="font-semibold text-foreground text-sm leading-tight">{level.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{level.cards.length} cards</p>
            </div>
            {isCompleted && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-success flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
