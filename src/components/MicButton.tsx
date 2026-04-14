import { Mic, MicOff } from "lucide-react";

interface MicButtonProps {
  isListening: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function MicButton({ isListening, onClick, disabled }: MicButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
        isListening
          ? "bg-secondary mic-pulse scale-110"
          : "bg-primary hover:scale-105 active:scale-95"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {isListening ? (
        <MicOff className="w-7 h-7 text-secondary-foreground" />
      ) : (
        <Mic className="w-7 h-7 text-primary-foreground" />
      )}
    </button>
  );
}
