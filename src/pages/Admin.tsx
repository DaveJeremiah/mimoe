import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminLevels } from "@/components/admin/AdminLevels";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { LayoutDashboard, Users, BookOpen, BarChart2, LogOut, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ADMIN_EMAIL = "davejayden49@gmail.com";

type AdminTab = "dashboard" | "users" | "levels" | "analytics";

const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { key: "users",     label: "Users",     icon: <Users className="w-4 h-4" /> },
  { key: "levels",    label: "Levels",    icon: <BookOpen className="w-4 h-4" /> },
  { key: "analytics", label: "Analytics", icon: <BarChart2 className="w-4 h-4" /> },
];

function AdminShell() {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-4 px-5 py-3 border-b border-white/6" style={{ background: "rgba(10,10,10,0.95)", backdropFilter: "blur(12px)" }}>
        <button onClick={() => navigate("/")} className="p-1.5 rounded-lg hover:bg-white/6 transition-colors text-white/40 hover:text-white/70">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-sm tracking-tight">mimoe</span>
          <span className="text-[10px] font-bold text-violet-400 bg-violet-400/10 border border-violet-400/20 rounded-full px-2 py-0.5 uppercase tracking-wider">Admin</span>
        </div>

        {/* Tab bar */}
        <nav className="hidden md:flex items-center gap-1 ml-6">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
              style={tab === t.key
                ? { background: "rgba(155,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(155,92,246,0.3)" }
                : { color: "rgba(255,255,255,0.4)" }
              }
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>

        <button
          onClick={() => signOut()}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white/35 hover:text-white/70 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </header>

      {/* Mobile tab bar */}
      <div className="flex md:hidden items-center gap-1 px-4 py-3 border-b border-white/5 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0"
            style={tab === t.key
              ? { background: "rgba(155,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(155,92,246,0.3)" }
              : { color: "rgba(255,255,255,0.4)" }
            }
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === "dashboard"  && <AdminDashboard />}
        {tab === "users"      && <AdminUsers />}
        {tab === "levels"     && <AdminLevels />}
        {tab === "analytics"  && <AdminAnalytics />}
      </main>
    </div>
  );
}

export default function Admin() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return <Navigate to="/" replace />;
  }

  return <AdminShell />;
}
