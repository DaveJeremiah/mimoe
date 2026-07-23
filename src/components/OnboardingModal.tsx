import { useState, useRef, useEffect } from "react";
import { ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { dicebearUrl } from "./ProfileModal";
import logoLight from "@/assets/logo-light.png";

const AVATAR_SEEDS = [
  "mimoe-1","mimoe-2","mimoe-3","mimoe-4",
  "mimoe-5","mimoe-6","mimoe-7","mimoe-8",
  "luna","pixel","nova","ember",
];

const COUNTRY_CHIPS = [
  "Uganda","Nigeria","Kenya","Ghana","Ethiopia",
  "Egypt","Morocco","South Africa","France","UK","USA","Canada",
];

interface Props {
  user: User;
  onDone: () => void;
}

export function OnboardingModal({ user, onDone }: Props) {
  const emailHandle = (user.email ?? "").split("@")[0];
  const initialName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0]
    ?? (user.user_metadata?.nickname as string | undefined)
    ?? emailHandle;

  const [step, setStep]       = useState<0 | 1 | 2 | 3>(0);
  const [name, setName]       = useState(initialName);
  const [country, setCountry] = useState("");
  const [nativeLang, setNativeLang] = useState<string>("");
  const [targetLang, setTargetLang] = useState<string>("");
  const [seed, setSeed]       = useState<string>(user.id);
  const [saving, setSaving]   = useState(false);
  const [nameErr, setNameErr] = useState("");
  const [cntryErr, setCntryErr] = useState("");
  const [langErr, setLangErr] = useState("");

  const nameRef    = useRef<HTMLInputElement>(null);
  const countryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 0) setTimeout(() => nameRef.current?.focus(), 320);
    if (step === 1) setTimeout(() => countryRef.current?.focus(), 320);
  }, [step]);

  const goCountry = () => {
    const t = name.trim();
    if (!t) { setNameErr("What should we call you? ✨"); return; }
    if (t.length > 24) { setNameErr("Keep it under 24 characters"); return; }
    setNameErr("");
    setStep(1);
  };

  const goLanguage = () => {
    const t = country.trim();
    if (!t) { setCntryErr("Tell us where you're from! 🌍"); return; }
    setCntryErr("");
    setStep(2);
  };

  const goAvatar = () => {
    if (!nativeLang || !targetLang) { setLangErr("Please select both languages! 🗣️"); return; }
    if (nativeLang === targetLang) { setLangErr("Target language must be different! 🔄"); return; }
    setLangErr("");
    setStep(3);
  };

  const finish = async () => {
    setSaving(true);
    await supabase.auth.updateUser({
      data: {
        nickname:       name.trim(),
        country:        country.trim(),
        native_language: nativeLang,
        target_language: targetLang,
        avatar_seed:    seed,
        onboarding_done: true,
      },
    });
    setSaving(false);
    try {
      localStorage.setItem("mimoe-language", JSON.stringify(targetLang));
    } catch { /* ignore */ }
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "#050505" }}>

      {/* Logo */}
      <div className="flex justify-center pt-10 pb-2">
        <img src={logoLight} alt="mimoe" style={{ height: 30, width: "auto" }} />
      </div>

      {/* Step pills */}
      <div className="flex items-center justify-center gap-2 py-4">
        {[0,1,2,3].map(i => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width:  i === step ? 24 : 8,
              height: 8,
              background: i === step
                ? "linear-gradient(90deg,#7C3AED,#9B5CF6)"
                : i < step
                  ? "rgba(129,140,248,0.45)"
                  : "rgba(255,255,255,0.12)",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">

        {/* ── Step 0: Name ── */}
        {step === 0 && (
          <div className="flex flex-col items-center gap-6 w-full max-w-sm animate-fade-in">
            <div className="text-center">
              <div className="text-[3.5rem] leading-none mb-4">👋</div>
              <h1 className="text-[1.75rem] font-black text-white leading-tight">
                Welcome to mimoe!
              </h1>
              <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                Let's get you set up. What should we call you?
              </p>
            </div>

            <div className="w-full">
              <input
                ref={nameRef}
                value={name}
                onChange={e => { setName(e.target.value); setNameErr(""); }}
                onKeyDown={e => e.key === "Enter" && goCountry()}
                placeholder="Your first name"
                maxLength={24}
                className="w-full text-center text-2xl font-bold text-white bg-transparent outline-none py-3 border-b-2 placeholder:text-white/20"
                style={{ borderColor: nameErr ? "rgba(255,80,80,0.7)" : "rgba(129,140,248,0.5)" }}
              />
              {nameErr && <p className="text-xs text-red-400 text-center mt-2">{nameErr}</p>}
            </div>

            <button
              onClick={goCountry}
              className="w-full py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 active:opacity-70 transition-opacity"
              style={{ background: "linear-gradient(135deg,#7C3AED,#9B5CF6)", color: "#fff" }}
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Step 1: Country ── */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-5 w-full max-w-sm animate-fade-in">
            <div className="text-center">
              <div className="text-[3.5rem] leading-none mb-4">🌍</div>
              <h1 className="text-[1.75rem] font-black leading-tight">
                <span className="text-white">Nice to meet you, </span>
                <span style={{
                  background: "linear-gradient(135deg,#818CF8,#C084FC)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  {name.trim()}!
                </span>
              </h1>
              <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                Where in the world are you from?
              </p>
            </div>

            <div className="w-full">
              <input
                ref={countryRef}
                value={country}
                onChange={e => { setCountry(e.target.value); setCntryErr(""); }}
                onKeyDown={e => e.key === "Enter" && goLanguage()}
                placeholder="Your country"
                className="w-full text-center text-2xl font-bold text-white bg-transparent outline-none py-3 border-b-2 placeholder:text-white/20"
                style={{ borderColor: cntryErr ? "rgba(255,80,80,0.7)" : "rgba(129,140,248,0.5)" }}
              />
              {cntryErr && <p className="text-xs text-red-400 text-center mt-2">{cntryErr}</p>}
            </div>

            {/* Quick-pick chips */}
            <div className="flex flex-wrap justify-center gap-2">
              {COUNTRY_CHIPS.map(c => (
                <button
                  key={c}
                  onClick={() => { setCountry(c); setCntryErr(""); }}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background: country === c
                      ? "linear-gradient(135deg,#7C3AED,#9B5CF6)"
                      : "rgba(255,255,255,0.06)",
                    color: country === c ? "#fff" : "rgba(255,255,255,0.5)",
                    border: country === c
                      ? "1px solid transparent"
                      : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            <button
              onClick={goLanguage}
              className="w-full py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 active:opacity-70 transition-opacity"
              style={{ background: "linear-gradient(135deg,#7C3AED,#9B5CF6)", color: "#fff" }}
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Step 2: Languages ── */}
        {step === 2 && (
          <div className="flex flex-col items-center gap-6 w-full max-w-sm animate-fade-in">
            <div className="text-center">
              <div className="text-[3.5rem] leading-none mb-4">🗣️</div>
              <h1 className="text-[1.75rem] font-black text-white leading-tight">
                Language Journey
              </h1>
              <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                Tell us what you speak and what you want to learn.
              </p>
            </div>

            <div className="w-full space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider pl-2">I speak</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ id: "english", label: "English" }, { id: "french", label: "French" }, { id: "arabic", label: "Arabic" }].map(l => (
                    <button
                      key={l.id}
                      onClick={() => { setNativeLang(l.id); setLangErr(""); }}
                      className="py-2.5 rounded-xl font-bold text-sm transition-all"
                      style={{
                        background: nativeLang === l.id ? "rgba(129,140,248,0.2)" : "rgba(255,255,255,0.05)",
                        border: nativeLang === l.id ? "2px solid #818CF8" : "2px solid transparent",
                        color: nativeLang === l.id ? "#fff" : "rgba(255,255,255,0.6)"
                      }}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider pl-2">I want to learn</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ id: "english", label: "English" }, { id: "french", label: "French" }, { id: "arabic", label: "Arabic" }].map(l => (
                    <button
                      key={l.id}
                      onClick={() => { setTargetLang(l.id); setLangErr(""); }}
                      disabled={nativeLang === l.id}
                      className="py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        background: targetLang === l.id ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.05)",
                        border: targetLang === l.id ? "2px solid #A78BFA" : "2px solid transparent",
                        color: targetLang === l.id ? "#fff" : "rgba(255,255,255,0.6)"
                      }}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {langErr && <p className="text-xs text-red-400 text-center pt-2">{langErr}</p>}
            </div>

            <button
              onClick={goAvatar}
              className="w-full py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 active:opacity-70 transition-opacity mt-2"
              style={{ background: "linear-gradient(135deg,#7C3AED,#9B5CF6)", color: "#fff" }}
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Step 3: Avatar ── */}
        {step === 3 && (
          <div className="flex flex-col items-center gap-5 w-full max-w-sm animate-fade-in">
            <div className="text-center">
              <div className="text-[3.5rem] leading-none mb-4">🎨</div>
              <h1 className="text-[1.75rem] font-black text-white leading-tight">
                Pick your avatar
              </h1>
              <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                Choose how you'll appear in mimoe
              </p>
            </div>

            {/* Big preview */}
            <div
              className="w-20 h-20 rounded-full overflow-hidden"
              style={{
                border: "2.5px solid rgba(167,139,250,0.75)",
                background: "rgba(129,140,248,0.12)",
              }}
            >
              <img src={dicebearUrl(seed)} alt="" className="w-full h-full object-cover" draggable={false} />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-4 gap-3 w-full">
              {AVATAR_SEEDS.map(s => (
                <button
                  key={s}
                  onClick={() => setSeed(s)}
                  className="rounded-full overflow-hidden aspect-square transition-all active:scale-95"
                  style={{
                    border: s === seed
                      ? "2.5px solid rgba(167,139,250,0.9)"
                      : "2px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  <img src={dicebearUrl(s)} alt="" className="w-full h-full object-cover" draggable={false} />
                </button>
              ))}
            </div>

            <button
              onClick={finish}
              disabled={saving}
              className="w-full py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 active:opacity-70 transition-opacity disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#7C3AED,#9B5CF6)", color: "#fff" }}
            >
              {saving
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Check className="w-4 h-4" /> Let's go!</>
              }
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
