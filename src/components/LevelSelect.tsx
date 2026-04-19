import type { Level } from "@/lib/flashcardData";
import { Check, Plus, Heart } from "lucide-react";

interface LevelSelectProps {
  levels: Level[];
  completedLevelIds: string[];
  onSelectLevel: (levelId: string) => void;
  onAddLevel?: () => void;
  bookmarkedCount?: number;
  onStudyBookmarked?: () => void;
}

export function LevelSelect({
  levels,
  completedLevelIds,
  onSelectLevel,
  onAddLevel,
  bookmarkedCount = 0,
  onStudyBookmarked,
}: LevelSelectProps) {
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

      {bookmarkedCount > 0 && onStudyBookmarked && (
        <button
          onClick={onStudyBookmarked}
          className="relative flex flex-col items-start justify-between p-4 rounded-2xl border border-red-400/30 bg-red-400/10 hover:bg-red-400/20 transition-all duration-200 aspect-square text-left card-shadow active:scale-[0.97]"
        >
          <Heart className="w-8 h-8 text-red-400 fill-red-400" />
          <div>
            <h3 className="font-semibold text-foreground text-sm leading-tight">Favorites</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{bookmarkedCount} cards</p>
          </div>
        </button>
      )}

      <button
        onClick={onAddLevel}
        className="relative flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-border bg-card/50 hover:bg-muted transition-all duration-200 aspect-square text-center active:scale-[0.97]"
      >
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
          <Plus className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-muted-foreground text-sm leading-tight">Add Level</h3>
      </button>
    </div>
  );
}
