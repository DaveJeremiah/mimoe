import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import logoLight from "@/assets/logo-light.png";

function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <img src={logoLight} alt="Mimoe" style={{ height: size, width: "auto" }} className="flex-shrink-0" />
  );
}

function WavyLine() {
  return (
    <svg viewBox="0 0 320 36" fill="none" className="w-full max-w-[320px]" preserveAspectRatio="none">
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e05070" />
          <stop offset="100%" stopColor="#e07030" />
        </linearGradient>
      </defs>
      <path
        d="M0 22 C40 6, 80 34, 120 22 C160 10, 200 34, 240 22 C270 12, 300 28, 320 18"
        stroke="url(#wg)" strokeWidth="2.5" strokeLinecap="round" fill="none"
      />
    </svg>
  );
}

const GOOGLE_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// Instagram gradient icon
const INSTA_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="ig" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#f09433"/>
        <stop offset="25%" stopColor="#e6683c"/>
        <stop offset="50%" stopColor="#dc2743"/>
        <stop offset="75%" stopColor="#cc2366"/>
        <stop offset="100%" stopColor="#bc1888"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig)" strokeWidth="2"/>
    <circle cx="12" cy="12" r="4" stroke="url(#ig)" strokeWidth="2"/>
    <circle cx="17.5" cy="6.5" r="1.2" fill="url(#ig)"/>
  </svg>
);

const X_ICON = (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const TIKTOK_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
  </svg>
);

export default function Auth() {
  const { user, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Account created! You're signed in.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error("Google sign-in failed");
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center overflow-y-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="w-full max-w-md mx-auto flex flex-col pb-8">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-8 sm:pt-12 pb-2 sm:pb-4">
          <LogoMark size={38} />
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="flex items-center gap-2 text-white/70 text-sm font-medium hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </div>

        {/* Title */}
        <div className="flex flex-col items-center px-6 pt-4 sm:pt-6 pb-2">
          <h1 className="text-white font-black text-4xl sm:text-[2.6rem] leading-tight tracking-tight text-center mb-4">
            {isLogin ? "Sign In" : "Sign Up"}
          </h1>
          <WavyLine />
        </div>

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="flex-1 flex flex-col px-5 pt-6 sm:pt-10 gap-4 sm:gap-5">

          {/* Email */}
          <div className="flex flex-col gap-2">
            <label className="text-white/40 text-sm font-medium pl-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full rounded-full px-4 py-3 sm:px-5 sm:py-4 text-white text-sm font-medium placeholder:text-white/25 outline-none"
              style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label className="text-white/40 text-sm font-medium pl-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              minLength={6}
              className="w-full rounded-full px-4 py-3 sm:px-5 sm:py-4 text-white text-sm font-medium placeholder:text-white/30 outline-none"
              style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>

          {/* Submit — gradient border button */}
          <div className="mt-2 p-[1.5px] rounded-full" style={{ background: 'linear-gradient(135deg, #9b5cf6, #ec4899)' }}>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 sm:py-4 rounded-full font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
              style={{ background: '#0a0a0a' }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
              </svg>
              {submitting ? "…" : isLogin ? "Sign In" : "Create Account"}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-white/30 text-xs font-medium">or Sign In with</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Social icons */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {[
              { icon: GOOGLE_ICON,  label: "Google",    action: handleGoogleSignIn },
              { icon: INSTA_ICON,   label: "Instagram", action: () => toast.info("Instagram sign-in coming soon") },
              { icon: X_ICON,       label: "X",         action: () => toast.info("X sign-in coming soon") },
              { icon: TIKTOK_ICON,  label: "TikTok",    action: () => toast.info("TikTok sign-in coming soon") },
            ].map(({ icon, label, action }) => (
              <button
                key={label}
                type="button"
                onClick={action}
                aria-label={label}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-opacity hover:opacity-70 active:scale-95"
                style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {icon}
              </button>
            ))}
          </div>

        </form>
      </div>
    </div>
  );
}
