import { X } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  onStart: () => void;
}

export function BottomSheet({ isOpen, onClose, title, subtitle, onStart }: BottomSheetProps) {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div 
        className="fixed bottom-0 left-0 right-0 z-[70] bg-[#1a1a24] rounded-t-[32px] p-6 pb-safe transition-transform animate-slide-up-in shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
        
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-white text-2xl font-bold mb-2 leading-tight">{title}</h2>
            <p className="text-white/60 text-sm leading-relaxed">{subtitle}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={onStart}
          className="w-full mt-6 py-4 rounded-2xl bg-[#B875FF] hover:bg-[#a65df0] active:scale-[0.98] transition-all text-white font-bold text-lg shadow-[0_4px_20px_rgba(184,117,255,0.4)]"
        >
          Start
        </button>
      </div>
    </>
  );
}
