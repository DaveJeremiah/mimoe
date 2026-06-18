import { useEffect, useState } from "react";
import { adminDb, type AdminStats } from "@/lib/adminDb";
import { Users, BookOpen, Flame, BarChart2 } from "lucide-react";

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-2" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-2 text-white/40 text-xs font-bold uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="text-3xl font-black text-white">{value}</div>
      {sub && <div className="text-xs text-white/35">{sub}</div>}
    </div>
  );
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    adminDb.getStats()
      .then(setStats)
      .catch(e => setErr(e.message ?? "Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white/40 text-sm p-8">Loading…</div>;
  if (err) return <div className="text-red-400 text-sm p-8">{err}</div>;
  if (!stats) return null;

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-3.5 h-3.5" />} label="Total users" value={stats.total_users} />
        <StatCard icon={<BarChart2 className="w-3.5 h-3.5" />} label="Sessions today" value={stats.sessions_today} sub={`${stats.sessions_this_week} this week`} />
        <StatCard icon={<BookOpen className="w-3.5 h-3.5" />} label="Total sessions" value={stats.total_sessions} />
        <StatCard icon={<Flame className="w-3.5 h-3.5" />} label="Active streaks" value={stats.streak_leaderboard?.length ?? 0} sub="users with streaks" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Streak leaderboard */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="text-sm font-bold text-white/70 flex items-center gap-2"><Flame className="w-4 h-4 text-orange-400" /> Streak Leaderboard</h3>
          </div>
          {!stats.streak_leaderboard?.length ? (
            <p className="text-white/30 text-sm p-5">No streaks yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-white/30 uppercase tracking-wider">
                  <th className="px-5 py-2 text-left">#</th>
                  <th className="px-5 py-2 text-left">User</th>
                  <th className="px-5 py-2 text-right">Current</th>
                  <th className="px-5 py-2 text-right">Best</th>
                </tr>
              </thead>
              <tbody>
                {stats.streak_leaderboard.map((row, i) => (
                  <tr key={row.user_id} className="border-t border-white/5">
                    <td className="px-5 py-3 text-white/30 text-xs">{i + 1}</td>
                    <td className="px-5 py-3">
                      <div className="text-white/80 font-medium truncate max-w-[160px]">{row.display_name || row.email}</div>
                      <div className="text-white/30 text-[11px] truncate max-w-[160px]">{row.email}</div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-orange-400 font-bold">{row.current_streak} 🔥</span>
                    </td>
                    <td className="px-5 py-3 text-right text-white/40 text-xs">{row.longest_streak}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top cards */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="text-sm font-bold text-white/70 flex items-center gap-2"><BookOpen className="w-4 h-4 text-violet-400" /> Most Studied Cards</h3>
          </div>
          {!stats.top_cards?.length ? (
            <p className="text-white/30 text-sm p-5">No card data yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-white/30 uppercase tracking-wider">
                  <th className="px-5 py-2 text-left">Card</th>
                  <th className="px-5 py-2 text-right">Studies</th>
                  <th className="px-5 py-2 text-right">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_cards.map((card) => (
                  <tr key={card.card_id} className="border-t border-white/5">
                    <td className="px-5 py-3">
                      <div className="text-white/80 font-medium truncate max-w-[180px]">{card.english}</div>
                      <div className="text-white/35 text-[11px] truncate max-w-[180px]">{card.target}</div>
                    </td>
                    <td className="px-5 py-3 text-right text-white/60 font-mono">{card.study_count}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-xs font-bold ${card.accuracy_pct >= 70 ? "text-emerald-400" : "text-red-400"}`}>
                        {card.accuracy_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
