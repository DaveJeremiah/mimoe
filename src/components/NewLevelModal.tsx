import { useState } from "react";
import { X, Plus } from "lucide-react";

interface NewLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string) => void;
}

export function NewLevelModal({ isOpen, onClose, onSave }: NewLevelModalProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!title.trim()) {
      setError("Please enter a level title");
      return;
    }
    onSave(title.trim());
    setTitle("");
    setError("");
    onClose();
  };

  const handleClose = () => {
    setTitle("");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-2xl shadow-xl max-w-sm w-full border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">New Level</h3>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Level Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="e.g., Travel Phrases, Numbers 1-20"
              autoFocus
              className="w-full p-3 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
          </div>

          <p className="text-xs text-muted-foreground">
            An empty level will be created. Add cards to it using the card bank while studying.
          </p>

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Create Level
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
