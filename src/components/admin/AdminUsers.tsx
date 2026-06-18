import { useEffect, useState } from "react";
import { adminDb, type AdminUser } from "@/lib/adminDb";
import { X, Flame, BookOpen, Star, Layers } from "lucide-react";

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Avatar({ name, email }: { name: string; email: string }) {
  const letter = (name || email || "?")[0].toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black text-white"
      style={{ background: "linear-gradient(135deg,#9b5cf6,#ec4899)" }}>
      {letter}
    </div>
  );
}

function UserDetailPanel({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md mx-4 rounded-3xl p-6 space-y-5"
        style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/8 transition-colors">
          <X className="w-4 h-4 text-white/40" />
        </button>

        <div className="flex items-center gap-3">
          <Avatar name={user.display_name} email={user.email} />
          <div>
            <div className="text-white font-bold">{user.display_name || "(no nickname)"}</div>
            <div className="text-white/40 text-sm">{user.email}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <Flame className="w-4 h-4 text-orange-400" />, label: "Current streak", value: `${user.current_streak} days` },
            { icon: <Flame className="w-4 h-4 text-white/30" />, label: "Best streak", value: `${user.longest_streak} days` },
            { icon: <BookOpen className="w-4 h-4 text-violet-400" />, label: "Study sessions", value: user.session_count },
            { icon: <Star className="w-4 h-4 text-yellow-400" />, label: "Bookmarks", value: user.bookmarks_count },
            { icon: <Layers className="w-4 h-4 text-sky-400" />, label: "Collections", value: user.collections_count },
            { icon: <Layers className="w-4 h-4 text-emerald-400" />, label: "Custom levels", value: user.custom_levels_count },
          ].map(({ icon, label, value }) => (
            <div key={label} className="rounded-xl p-3" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-1.5 text-white/40 text-[11px] font-bold uppercase tracking-wider mb-1">{icon}{label}</div>
              <div className="text-white font-bold text-lg">{value}</div>
            </div>
          ))}
        </div>

        <div className="space-y-1.5 text-[12px] text-white/30">
          {user.country && <div>Country: <span className="text-white/60">{user.country}</span></div>}
          <div>Joined: <span className="text-white/60">{formatDate(user.created_at)}</span></div>
          <div>Last active: <span className="text-white/60">{formatDate(user.last_sign_in_at)}</span></div>
        </div>
      </div>
    </div>
  );
}

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    adminDb.getAllUsers()
      .then(setUsers)
      .catch(e => setErr(e.message ?? "Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white/40 text-sm p-8">Loading…</div>;
  if (err) return <div className="text-red-400 text-sm p-8">{err}</div>;

  const filtered = search
    ? users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()) || u.display_name.toLowerCase().includes(search.toLowerCase()))
    : users;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">{users.length} users</h2>
        <input
          type="text"
          placeholder="Search by email or name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-full px-4 py-2 text-sm text-white placeholder:text-white/25 outline-none w-64"
          style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.08)" }}
        />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-white/30 uppercase tracking-wider border-b border-white/5">
              <th className="px-5 py-3 text-left">User</th>
              <th className="px-5 py-3 text-right">Streak</th>
              <th className="px-5 py-3 text-right">Sessions</th>
              <th className="px-5 py-3 text-right hidden md:table-cell">Last active</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => (
              <tr
                key={user.id}
                className="border-t border-white/5 hover:bg-white/3 cursor-pointer transition-colors"
                onClick={() => setSelected(user)}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={user.display_name} email={user.email} />
                    <div>
                      <div className="text-white/80 font-medium">{user.display_name || <span className="text-white/30 italic">No name</span>}</div>
                      <div className="text-white/30 text-[11px]">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  {user.current_streak > 0
                    ? <span className="text-orange-400 font-bold">{user.current_streak} 🔥</span>
                    : <span className="text-white/25">—</span>
                  }
                </td>
                <td className="px-5 py-3 text-right text-white/50 font-mono">{user.session_count}</td>
                <td className="px-5 py-3 text-right text-white/30 text-xs hidden md:table-cell">{formatDate(user.last_sign_in_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-white/30 text-sm text-center py-10">No users match your search</div>
        )}
      </div>

      {selected && <UserDetailPanel user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
