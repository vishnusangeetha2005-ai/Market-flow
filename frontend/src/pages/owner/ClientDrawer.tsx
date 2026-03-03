import { useState, useEffect } from "react";
import { clients } from "../../services/api";
import type { Client, Plan } from "../../types";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { motion } from "framer-motion";

interface Props {
  client: Client;
  plans: Plan[];
  onClose: () => void;
}

type Tab = "profile" | "subscription" | "activity";

interface ActivityData {
  login_logs: Array<{
    id: number; login_time: string; ip_address: string;
    device_type: string; browser: string; status: string;
  }>;
  total_tokens_used: number;
  total_banners: number;
  total_posts: number;
}

const inputCls = `w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900
  placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all`;

export function ClientDrawer({ client, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("profile");
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (tab === "activity") {
      clients.activity(client.id).then((data) => setActivity(data as ActivityData));
    }
  }, [tab, client.id]);

  const handleResetPassword = async () => {
    if (!newPassword) return;
    try {
      await clients.resetPassword(client.id, newPassword);
      setMessage("Password reset successfully");
      setNewPassword("");
      setTimeout(() => setMessage(""), 3000);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Failed to reset");
    }
  };

  const TABS: Tab[] = ["profile", "subscription", "activity"];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-stretch justify-end z-50">
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full max-w-lg h-full bg-white flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold text-white">
              {client.name[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{client.name}</h2>
              <p className="text-xs text-gray-400">{client.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400
                       hover:text-gray-700 hover:bg-gray-100 transition-colors text-sm"
          >✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0 px-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3.5 text-sm font-medium capitalize transition-all border-b-2 -mb-px ${
                tab === t
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-400 hover:text-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── Profile Tab ── */}
          {tab === "profile" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Status",         value: <StatusBadge status={client.account_locked ? "locked" : client.status} /> },
                  { label: "Login Count",    value: client.login_count },
                  { label: "Failed Attempts",value: client.failed_attempts },
                  { label: "Member Since",   value: new Date(client.created_at).toLocaleDateString() },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3.5">
                    <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
                    <div className="text-sm font-semibold text-gray-900">{value}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-5
                              shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Reset Password</h3>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="New password (min 8 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputCls}
                  />
                  <button
                    onClick={handleResetPassword}
                    className="shrink-0 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    Reset
                  </button>
                </div>
                {message && (
                  <p className={`text-xs mt-2 font-medium ${message.includes("success") ? "text-emerald-600" : "text-red-500"}`}>
                    {message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Subscription Tab ── */}
          {tab === "subscription" && (
            <div className="space-y-3">
              {client.subscription ? (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Plan",     value: <span className="font-semibold text-gray-900">{client.subscription.plan_name}</span> },
                    { label: "Status",   value: <StatusBadge status={client.subscription.status} /> },
                    { label: "Payment",  value: <StatusBadge status={client.subscription.payment_status} /> },
                    { label: "Expires",  value: new Date(client.subscription.end_date).toLocaleDateString() },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-xl p-3.5">
                      <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
                      <div className="text-sm text-gray-900">{value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-10 text-center">
                  <span className="text-3xl">💳</span>
                  <p className="text-gray-500 text-sm mt-3">No active subscription</p>
                </div>
              )}
            </div>
          )}

          {/* ── Activity Tab ── */}
          {tab === "activity" && (
            <div className="space-y-5">
              {activity ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Tokens Used", value: activity.total_tokens_used.toLocaleString(), color: "text-orange-600" },
                      { label: "Banners",     value: activity.total_banners,                       color: "text-amber-500" },
                      { label: "Posts",       value: activity.total_posts,                          color: "text-emerald-600" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-slate-50 rounded-xl p-3.5 text-center">
                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                        <p className="text-xs text-gray-400 mt-1">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Login History</h3>
                    <div className="space-y-2">
                      {activity.login_logs.slice(0, 10).map((log) => (
                        <div key={log.id}
                          className="flex items-center justify-between bg-slate-50 border border-gray-100 rounded-xl p-3.5">
                          <div>
                            <p className="text-sm text-gray-900 font-medium">
                              {log.ip_address}
                              <span className="text-gray-400 font-normal"> · {log.browser}</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(log.login_time).toLocaleString()}
                            </p>
                          </div>
                          <StatusBadge status={log.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <div className="inline-block w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
