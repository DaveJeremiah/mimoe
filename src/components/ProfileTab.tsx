import { useState } from "react";
import { LogOut, BookOpen, Layers, Pencil, Check, X, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { WavyLine } from "./LevelSelect";
import type { User } from "@supabase/supabase-js";

interface ProfileTabProps {
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

export function ProfileTab({
  user,
  completedVocabCount, completedPhrasesCount, collectionsCount,
}: ProfileTabProps) {
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

  const [newPassword,     setNewPassword]     = useState("");
  const [settingPassword, setSettingPassword] = useState(false);
  const [passwordError,   setPasswordError]   = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

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

  /* ── password ── */
  const handleSetPassword = async () => {
    if (newPassword.length < 6) { setPasswordError("Minimum 6 characters"); return; }
    setPasswordError("");
    setSettingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSettingPassword(false);
    if (error) { setPasswordError(error.message); }
    else { setPasswordSuccess(true); setNewPassword(""); }
  };

  /* ── sign out ── */
  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  return (
    <div className="w-full flex flex-col pt-6 pb-32 px-5 max-w-[480px] mx-auto animate-fade-in">
      <h1 className="text-white text-3xl font-bold mb-8">Settings</h1>
      
      <div className="flex flex-col gap-8">
        
        {/* Identity Section */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col p-6 rounded-[28px] items-center gap-5 relative" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)' }}>
            
            {/* Avatar ring — tappable */}
            <div className="relative">
              <button
                onClick={() => setPickingAvatar(v => !v)}
                className="w-[96px] h-[96px] rounded-full overflow-hidden block active:opacity-70 transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, rgba(129,140,248,0.2), rgba(168,85,247,0.2))',
                  border: pickingAvatar ? '2px solid rgba(167,139,250,0.7)' : '2px solid rgba(129,140,248,0.35)',
                }}
              >
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" draggable={false} />
              </button>
              {/* Edit badge */}
              <div
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center pointer-events-none shadow-lg"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #9B5CF6)', border: '2.5px solid #111118' }}
              >
                <Pencil className="w-3 h-3 text-white" />
              </div>
            </div>

            {/* Avatar picker grid */}
            {pickingAvatar && (
              <div
                className="w-full rounded-2xl p-4 flex flex-col gap-3 animate-slide-up-in"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}
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
                <div className="flex flex-col items-center gap-3">
                  <input
                    autoFocus
                    value={nickDraft}
                    onChange={e => { setNickDraft(e.target.value); setNickError(""); }}
                    onKeyDown={e => { if (e.key === "Enter") handleSaveNick(); if (e.key === "Escape") handleCancelNick(); }}
                    maxLength={24}
                    className="w-full text-center text-xl font-black text-white bg-transparent outline-none border-b-2 pb-1.5"
                    style={{ borderColor: 'rgba(129,140,248,0.5)' }}
                    disabled={savingNick}
                  />
                  {nickError && <p className="text-xs text-red-400">{nickError}</p>}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveNick}
                      disabled={savingNick}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold transition-opacity disabled:opacity-50"
                      style={{ background: 'rgba(129,140,248,0.15)', color: 'rgba(167,139,250,0.9)', border: '1px solid rgba(129,140,248,0.25)' }}
                    >
                      {savingNick
                        ? <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                        : <Check className="w-4 h-4" />
                      }
                      Save
                    </button>
                    <button
                      onClick={handleCancelNick}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-2 justify-center group relative w-full">
                    <h2 className="font-display text-[1.5rem] font-black text-white leading-tight">{displayName}</h2>
                    <button
                      onClick={() => { setNickDraft(displayName); setEditingName(true); }}
                      className="absolute -right-8 p-1.5 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5 text-white/40 group-hover:text-white/80 transition-colors" />
                    </button>
                  </div>
                  <p className="text-sm text-white/40 mt-1">{user.email}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="flex flex-col gap-3">
          <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-widest px-2">Your Progress</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <BookOpen className="w-4 h-4" />, value: completedVocabCount,   label: "Vocab done"   },
              { icon: <Layers    className="w-4 h-4" />, value: completedPhrasesCount, label: "Phrases done" },
              { icon: <span className="text-base leading-none">📚</span>, value: collectionsCount, label: "Collections" },
            ].map(({ icon, value, label }) => (
              <div
                key={label}
                className="rounded-[20px] p-4 flex flex-col items-center gap-2"
                style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <span className="text-white/30 mb-1">{icon}</span>
                <p className="text-2xl font-black text-white leading-none">{value}</p>
                <p className="text-[10px] font-bold text-white/30 text-center uppercase tracking-widest leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Security Section */}
        <div className="flex flex-col gap-3">
          <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-widest px-2">Account Security</h2>
          <div className="flex flex-col gap-3 p-5 rounded-[24px]" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2.5 mb-1">
              <Lock className="w-4 h-4 text-white/50" />
              <h3 className="text-base font-bold text-white/90">Set Password</h3>
            </div>
            <p className="text-sm text-white/40 leading-relaxed mb-2">
              If you signed in with Google, you can set a password here to log in with email next time.
            </p>
            {passwordSuccess ? (
              <p className="text-sm text-green-400 font-semibold flex items-center gap-2 p-3 bg-green-500/10 rounded-xl border border-green-500/20"><Check className="w-4 h-4" /> Password updated successfully!</p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="New password (min 6)"
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setPasswordError(""); }}
                    disabled={settingPassword}
                    className="flex-1 bg-black/40 text-white text-sm outline-none px-4 py-3 rounded-xl focus:bg-black/60 transition-colors"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <button
                    onClick={handleSetPassword}
                    disabled={settingPassword || newPassword.length < 6}
                    className="px-5 py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                  >
                    {settingPassword ? "Saving..." : "Set"}
                  </button>
                </div>
                {passwordError && <p className="text-sm text-red-400 pl-1">{passwordError}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Sign out */}
        <div className="pt-2">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            style={{ background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.18)', color: 'rgba(255,100,100,0.9)' }}
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
