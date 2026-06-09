import { useState } from "react";
import { LogOut, BookOpen, Layers } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { WavyLine } from "./LevelSelect";
import type { User } from "@supabase/supabase-js";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  completedVocabCount: number;
  completedPhrasesCount: number;
  collectionsCount: number;
}

export function dicebearUrl(seed: string) {
  return `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent&baseColor=f9c9b6,ac6651&hair=dannyPhantom,full,pixie,short,mrT&facialHair=&eyes=eyes,round&mouth=smile,smirk,laughing`;
}

export function ProfileModal({
  isOpen, onClose, user,
  completedVocabCount, completedPhrasesCount, collectionsCount,
}: ProfileModalProps) {
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const avatarUrl = dicebearUrl(user.id);
  const email     = user.email ?? "";
  const handle    = email.split("@")[0];

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] rounded-t-[32px] overflow-hidden animate-slide-up-in"
        style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.07)', maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        <div className="px-5 pt-5 pb-8 flex flex-col gap-5">

          {/* Avatar + identity */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <div
              className="w-[88px] h-[88px] rounded-full overflow-hidden flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(129,140,248,0.25), rgba(168,85,247,0.25))',
                border: '2px solid rgba(129,140,248,0.35)',
              }}
            >
              <img src={avatarUrl} alt="" className="w-full h-full" draggable={false} />
            </div>
            <div className="text-center">
              <h2 className="font-display text-[1.4rem] font-black text-white leading-tight">{handle}</h2>
              <WavyLine className="mt-1 max-w-[100px] mx-auto" />
              <p className="text-xs text-white/35 mt-1.5">{email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { icon: <BookOpen className="w-4 h-4" />, value: completedVocabCount, label: "Vocab done" },
              { icon: <Layers    className="w-4 h-4" />, value: completedPhrasesCount, label: "Phrases done" },
              { icon: <span className="text-base leading-none">📚</span>, value: collectionsCount, label: "Collections" },
            ].map(({ icon, value, label }) => (
              <div
                key={label}
                className="rounded-2xl p-3.5 flex flex-col items-center gap-1.5"
                style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <span className="text-white/30">{icon}</span>
                <p className="text-xl font-black text-white leading-none">{value}</p>
                <p className="text-[9px] font-semibold text-white/30 text-center uppercase tracking-wider leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full py-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            style={{ background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.18)', color: 'rgba(255,100,100,0.8)' }}
          >
            {signingOut
              ? <><div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" /> Signing out…</>
              : <><LogOut className="w-4 h-4" /> Sign out</>
            }
          </button>

        </div>
      </div>
    </div>
  );
}
