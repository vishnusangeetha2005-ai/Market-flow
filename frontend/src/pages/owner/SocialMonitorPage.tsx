import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { socialMonitor } from "../../services/api";

const PLATFORM_ICON: Record<string, string> = {
  facebook: "📘", instagram: "📸", linkedin: "💼",
};

const STATUS_STYLE: Record<string, string> = {
  published: "text-emerald-700 bg-emerald-50 border-emerald-200",
  partial:   "text-amber-700  bg-amber-50  border-amber-200",
  failed:    "text-red-600   bg-red-50   border-red-200",
  scheduled: "text-orange-600 bg-orange-50 border-orange-200",
  draft:     "text-slate-500 bg-slate-100 border-slate-200",
};

type MonitorData = Awaited<ReturnType<typeof socialMonitor.get>>;

export function SocialMonitorPage() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"posts" | "clients">("posts");

  useEffect(() => {
    socialMonitor.get()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const refresh = () => {
    setLoading(true);
    socialMonitor.get().then(setData).finally(() => setLoading(false));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Social Monitor</h1>
          <p className="text-gray-500 text-sm mt-1">All clients' auto-posting activity in one place</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-sm text-gray-500 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-400
                     px-4 py-2 rounded-xl transition-all shadow-sm disabled:opacity-50"
        >
          {loading ? "Loading…" : "🔄 Refresh"}
        </button>
      </div>

      {/* Stats row */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Auto Posts",    value: data.total_auto_posts,              color: "text-orange-600" },
            { label: "Active Automations",  value: data.active_automations,            color: "text-emerald-600" },
            { label: "Clients Monitored",   value: data.automation_overview.length,    color: "text-violet-600" },
            { label: "Recent Posts (50)",   value: data.recent_posts.length,           color: "text-amber-600" },
          ].map((s) => (
            <div key={s.label}
              className="bg-white border border-gray-100 rounded-2xl p-4 text-center
                         shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1 w-fit shadow-sm">
        <button
          onClick={() => setTab("posts")}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
            tab === "posts"
              ? "bg-orange-500 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
          }`}
        >
          📲 Recent Auto Posts
        </button>
        <button
          onClick={() => setTab("clients")}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
            tab === "clients"
              ? "bg-orange-500 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
          }`}
        >
          👥 Client Automations
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <div className="inline-block w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-gray-400 text-sm">Failed to load data</p>
        </div>
      ) : (
        <>
          {/* Recent Posts Tab */}
          {tab === "posts" && (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              {data.recent_posts.length === 0 ? (
                <div className="p-16 text-center">
                  <span className="text-4xl">📭</span>
                  <p className="text-gray-500 text-sm mt-3">No auto-posts yet.</p>
                  <p className="text-gray-400 text-xs mt-1">Clients need to enable automation first.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-slate-50">
                      {["Client", "Caption", "Platforms", "Status", "Posted"].map((h) => (
                        <th key={h} className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wide px-6 py-3.5">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_posts.map((post, i) => (
                      <motion.tr
                        key={post.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-gray-50 hover:bg-slate-50/80 transition-colors duration-100"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                              {post.client_name[0]?.toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{post.client_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-gray-500 text-xs truncate">{post.caption_preview}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1">
                            {post.platforms.map((p) => (
                              <span key={p} title={p}>{PLATFORM_ICON[p] || p}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded-full border font-semibold capitalize ${STATUS_STYLE[post.status] ?? STATUS_STYLE.draft}`}>
                            {post.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-xs whitespace-nowrap">
                          {post.published_at
                            ? new Date(post.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                            : new Date(post.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Client Automations Tab */}
          {tab === "clients" && (
            <div className="space-y-3">
              {data.automation_overview.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                  <span className="text-4xl">🤖</span>
                  <p className="text-gray-500 text-sm mt-3">No clients have set up automation yet.</p>
                </div>
              ) : (
                data.automation_overview.map((c, i) => (
                  <motion.div
                    key={c.client_id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`bg-white border rounded-2xl p-5 flex items-center justify-between
                                shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${
                      c.enabled ? "border-emerald-200" : "border-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {c.client_name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-gray-900 font-semibold text-sm">{c.client_name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
                            c.enabled
                              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                              : "text-slate-500 bg-slate-100 border-slate-200"
                          }`}>
                            {c.enabled ? "● Active" : "○ Inactive"}
                          </span>
                          <span className="text-xs text-gray-400">
                            {c.mode === "basic" ? "🗓️ Basic" : "✨ Pro (AI)"} · {c.post_time} IST
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-1 justify-end mb-1">
                        {c.connected_platforms.map((p) => (
                          <span key={p} title={p} className="text-base">{PLATFORM_ICON[p] || p}</span>
                        ))}
                        {c.connected_platforms.length === 0 && (
                          <span className="text-xs text-gray-400">No platforms</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{c.total_auto_posts} auto posts</p>
                      {c.last_posted_date && (
                        <p className="text-xs text-gray-400">
                          Last: {new Date(c.last_posted_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
