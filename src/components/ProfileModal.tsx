import { useState } from "react";
import { LogOut, BookOpen, Layers, Pencil, Check, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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

// 12 hand-picked seeds that produce nice distinct micah avatars
const AVATAR_SEEDS = [
  "mimoe-1","mimoe-2","mimoe-3","mimoe-4",
  "mimoe-5","mimoe-6","mimoe-7","mimoe-8",
  "luna","pixel","nova","ember",
];

export function dicebearUrl(seed: string) {
  return `https://api.dicebear.com/9.x/micah/png?seed=${encodeURIComponent(seed)}&size=200`;
}

export function ProfileModal({
  isOpen, onClose, user,
  completedVocabCount, completedPhrasesCount, collectionsCount,
}: ProfileModalProps) {
  const { signOut } = useAuth();

  const emailHandle   = (user.email ?? "").split("@")[0];
  const savedNickname = (user.user_metadata?.nickname    as string | undefined) ?? emailHandle;
  const savedSeed     = (user.user_metadata?.avatar_seed as string | undefined) ?? user.id;

  const [signingOut,      setSigningOut]      = useState(false);
  const [editingName,     setEditingName]     = useState(false);
  const [nickDraft,       setNickDraft]       = useState(savedNickname);
  const [savingNick,      setSavingNick]      = useState(false);
  const [nickError,       setNickError]       = useState("");
  const [pickingAvatar,   setPickingAvatar]   = useState(false);
  const [previewSeed,     setPreviewSeed]     = useState(savedSeed);
  const [savingAvatar,    setSavingAvatar]    = useState(false);

  const avatarUrl    = dicebearUrl(previewSeed);
  const displayName  = savedNickname;

  /* ── nickname save ── */
  const handleSaveNick = async () => {
    const trimmed = nickDraft.trim();
    if (!trimmed)          { setNickError("Name can't be empty"); return; }
    if (trimmed.length > 24) { setNickError("Max 24 characters");   return; }
    setNickError("");
    setSavingNick(true);
    const { error } = await supabase.auth.updateUser({ data: { nickname: trimmed } });
    setSavingNick(false);
    if (error) { setNickError("Couldn't save — try again"); return; }
    setEditingName(false);
  };

  const handleCancelNick = () => {
    setNickDraft(savedNickname);
    setNickError("");
    setEditingName(false);
  };

  /* ── avatar picker ── */
  const handleSaveAvatar = async () => {
    setSavingAvatar(true);
    await supabase.auth.updateUser({ data: { avatar_seed: previewSeed } });
    setSavingAvatar(false);
    setPickingAvatar(false);
  };

  const handleCancelAvatar = () => {
    setPreviewSeed(savedSeed);
    setPickingAvatar(false);
  };

  /* ── sign out ── */
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
        style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.07)', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 20px)' }}>
          <div className="px-5 pt-5 pb-8 flex flex-col gap-5">

            {/* Avatar + identity */}
            <div className="flex flex-col items-center gap-3 pt-2">

              {/* Avatar ring — tappable */}
              <div className="relative">
                <button
                  onClick={() => setPickingAvatar(v => !v)}
                  className="w-[88px] h-[88px] rounded-full overflow-hidden block active:opacity-70 transition-opacity"
                  style={{
                    background: 'linear-gradient(135deg, rgba(129,140,248,0.2), rgba(168,85,247,0.2))',
                    border: pickingAvatar ? '2px solid rgba(167,139,250,0.7)' : '2px solid rgba(129,140,248,0.35)',
                  }}
                >
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                </button>
                {/* Edit badge */}
                <div
                  className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #9B5CF6)', border: '2px solid #050505' }}
                >
                  <Pencil className="w-2.5 h-2.5 text-white" />
                </div>
              </div>

              {/* Avatar picker grid */}
              {pickingAvatar && (
                <div
                  className="w-full rounded-2xl p-4 flex flex-col gap-3 animate-slide-up-in"
                  style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <p className="text-xs font-semibold text-white/40 text-center">Choose your avatar</p>
                  <div className="grid grid-cols-4 gap-3">
                    {AVATAR_SEEDS.map(seed => (
                      <button
                        key={seed}
                        onClick={() => setPreviewSeed(seed)}
                        className="rounded-full overflow-hidden aspect-square transition-all"
                        style={{
                          border: previewSeed === seed
                            ? '2.5px solid rgba(167,139,250,0.8)'
                            : '2px solid rgba(255,255,255,0.08)',
                          background: 'rgba(255,255,255,0.04)',
                        }}
                      >
                        <img src={dicebearUrl(seed)} alt="" className="w-full h-full object-cover" draggable={false} />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={handleSaveAvatar}
                      disabled={savingAvatar}
                      className="flex-1 py-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-opacity disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #7C3AED, #9B5CF6)', color: '#fff' }}
                    >
                      {savingAvatar
                        ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                        : <><Check className="w-3 h-3" /> Save</>
                      }
                    </button>
                    <button
                      onClick={handleCancelAvatar}
                      className="flex-1 py-2.5 rounded-full text-xs font-bold"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Name + edit */}
              <div className="text-center w-full max-w-[240px]">
                {editingName ? (
                  <div className="flex flex-col items-center gap-2">
                    <input
                      autoFocus
                      value={nickDraft}
                      onChange={e => { setNickDraft(e.target.value); setNickError(""); }}
                      onKeyDown={e => { if (e.key === "Enter") handleSaveNick(); if (e.key === "Escape") handleCancelNick(); }}
                      maxLength={24}
                      className="w-full text-center text-lg font-black text-white bg-transparent outline-none border-b-2 pb-1"
                      style={{ borderColor: 'rgba(129,140,248,0.5)' }}
                      disabled={savingNick}
                    />
                    {nickError && <p className="text-xs text-red-400">{nickError}</p>}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveNick}
                        disabled={savingNick}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-opacity disabled:opacity-50"
                        style={{ background: 'rgba(129,140,248,0.15)', color: 'rgba(167,139,250,0.9)', border: '1px solid rgba(129,140,248,0.25)' }}
                      >
                        {savingNick
                          ? <div className="w-3 h-3 border border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                          : <Check className="w-3 h-3" />
                        }
                        Save
                      </button>
                      <button
                        onClick={handleCancelNick}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-[1.4rem] font-black text-white leading-tight">{displayName}</h2>
                      <button
                        onClick={() => { setNickDraft(displayName); setEditingName(true); }}
                        className="p-1 rounded-lg hover:bg-white/8 transition-colors mt-0.5"
                      >
                        <Pencil className="w-3 h-3 text-white/30" />
                      </button>
                    </div>
                    <WavyLine className="max-w-[100px]" />
                    <p className="text-xs text-white/35 mt-0.5">{user.email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { icon: <BookOpen className="w-4 h-4" />, value: completedVocabCount,   label: "Vocab done"   },
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
    </div>
  );
}
