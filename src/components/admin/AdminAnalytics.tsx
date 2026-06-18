import { useEffect, useState } from "react";
import { adminDb, type SessionTrend, type AdminStats } from "@/lib/adminDb";

function BarChart({ data }: { data: SessionTrend[] }) {
  if (!data.length) return <div className="text-white/30 text-sm text-center py-10">No session data yet</div>;

  const maxSessions = Math.max(...data.map(d => d.sessions), 1);
  const chartH = 120;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        {/* Bars */}
        <svg width="100%" height={chartH + 28} viewBox={`0 0 ${data.length * 20} ${chartH + 28}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          {data.map((d, i) => {
            const barH = (d.sessions / maxSessions) * chartH;
            const userH = (d.active_users / maxSessions) * chartH;
            const x = i * 20 + 1;
            return (
              <g key={d.day}>
                <rect x={x} y={chartH - userH} width={7} height={userH} fill="url(#barGrad2)" rx={1.5} />
                <rect x={x + 9} y={chartH - barH} width={7} height={barH} fill="url(#barGrad)" rx={1.5} />
                {i % 7 === 0 && (
                  <text x={x + 8} y={chartH + 16} textAnchor="middle" fontSize={5} fill="rgba(255,255,255,0.25)">
                    {new Date(d.day).toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {/* Legend */}
        <div className="flex items-center gap-5 mt-1 text-xs text-white/40">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#9b5cf6" }} /> Sessions</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#3b82f6", opacity: 0.6 }} /> Active users</span>
        </div>
      </div>
    </div>
  );
}

export function AdminAnalytics() {
  const [trends, setTrends] = useState<SessionTrend[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = (d: number) => {
    setLoading(true);
    Promise.all([adminDb.getSessionTrends(d), adminDb.getStats()])
      .then(([t, s]) => { setTrends(t); setStats(s); })
      .catch(e => setErr(e.message ?? "Failed"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(days); }, []);

  const handleDaysChange = (d: number) => { setDays(d); load(d); };

  const totalSessions = trends.reduce((s, d) => s + d.sessions, 0);
  const totalUsers = [...new Set(trends.map(d => d.active_users))].length;
  const totalCorrect = trends.reduce((s, d) => s + (d.correct_cards as number), 0);

  if (loading) return <div className="text-white/40 text-sm p-8">Loading…</div>;
  if (err) return <div className="text-red-400 text-sm p-8">{err}</div>;

  return (
    <div className="space-y-6">
      {/* Period picker */}
      <div className="flex items-center gap-2">
        {[7, 14, 30].map(d => (
          <button key={d} onClick={() => handleDaysChange(d)}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
            style={days === d
              ? { background: "rgba(155,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(155,92,246,0.3)" }
              : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.07)" }
            }>
            {d}d
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Sessions", value: totalSessions },
          { label: "Correct cards", value: totalCorrect },
          { label: "Avg/day", value: trends.length ? Math.round(totalSessions / days) : 0 },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl p-4 text-center" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="text-xs text-white/35 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl p-5" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)" }}>
        <h3 className="text-sm font-bold text-white/60 mb-4">Daily activity — last {days} days</h3>
        <BarChart data={trends} />
      </div>

      {/* Top cards */}
      {stats?.top_cards?.length ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="text-sm font-bold text-white/60">Top studied cards (all time)</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-white/30 uppercase tracking-wider">
                <th className="px-5 py-2 text-left">Card</th>
                <th className="px-5 py-2 text-right">Language</th>
                <th className="px-5 py-2 text-right">Studies</th>
                <th className="px-5 py-2 text-right">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {stats.top_cards.map(card => (
                <tr key={card.card_id} className="border-t border-white/5">
                  <td className="px-5 py-3">
                    <div className="text-white/80 font-medium truncate max-w-[180px]">{card.english}</div>
                    <div className="text-white/35 text-[11px]">{card.target}</div>
                  </td>
                  <td className="px-5 py-3 text-right text-white/35 text-xs capitalize">{card.language}</td>
                  <td className="px-5 py-3 text-right text-white/60 font-mono">{card.study_count}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-xs font-bold ${card.accuracy_pct >= 70 ? "text-emerald-400" : "text-red-400"}`}>{card.accuracy_pct}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
