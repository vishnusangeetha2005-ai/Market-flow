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

type Tab = "profile" | "subscription" | "activity" | "social";

interface ActivityData {
  login_logs: Array<{
    id: number; login_time: string; ip_address: string;
    device_type: string; browser: string; status: string;
  }>;
  total_tokens_used: number;
  total_banners: number;
  total_posts: number;
}

interface SocialToken {
  id: number;
  platform: string;
  account_name: string;
  access_token_preview: string;
  page_id: string | null;
  is_active: boolean;
  updated_at: string;
}

const PLATFORMS = [
  { id: "facebook",  label: "Facebook",               icon: "📘", placeholder_page: "Facebook Page ID" },
  { id: "instagram", label: "Instagram",               icon: "📸", placeholder_page: "Instagram Account ID" },
  { id: "linkedin",  label: "LinkedIn",                icon: "💼", placeholder_page: "LinkedIn Org ID (optional)" },
  { id: "google",    label: "Google Business Profile", icon: "🗺️", placeholder_page: "accounts/{id}/locations/{id}" },
];

const inputCls = `w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900
  placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all`;

export function ClientDrawer({ client, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("profile");
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  // Social accounts tab state
  const [socialTokens, setSocialTokens] = useState<SocialToken[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [tokenPlatform, setTokenPlatform] = useState("facebook");
  const [tokenAccountName, setTokenAccountName] = useState("");
  const [tokenAccessToken, setTokenAccessToken] = useState("");
  const [tokenPageId, setTokenPageId] = useState("");
  const [tokenSaving, setTokenSaving] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [tokenSuccess, setTokenSuccess] = useState("");

  useEffect(() => {
    if (tab === "activity") {
      clients.activity(client.id).then((data) => setActivity(data as ActivityData));
    }
    if (tab === "social") {
      setSocialLoading(true);
      clients.getSocialTokens(client.id)
        .then(setSocialTokens)
        .finally(() => setSocialLoading(false));
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

  const handleSaveToken = async () => {
    if (!tokenAccountName.trim() || !tokenAccessToken.trim()) {
      setTokenError("Account name and access token are required");
      return;
    }
    setTokenError("");
    setTokenSaving(true);
    try {
      const saved = await clients.saveSocialToken(client.id, {
        platform: tokenPlatform,
        account_name: tokenAccountName.trim(),
        access_token: tokenAccessToken.trim(),
        page_id: tokenPageId.trim() || undefined,
      });
      setSocialTokens((prev) => {
        const existing = prev.findIndex((t) => t.platform === tokenPlatform);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = saved;
          return next;
        }
        return [...prev, saved];
      });
      setTokenSuccess(`${tokenPlatform} connected successfully`);
      setShowTokenForm(false);
      setTokenAccountName("");
      setTokenAccessToken("");
      setTokenPageId("");
      setTimeout(() => setTokenSuccess(""), 3000);
    } catch (e: unknown) {
      setTokenError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setTokenSaving(false);
    }
  };

  const handleDeleteToken = async (platform: string) => {
    try {
      await clients.deleteSocialToken(client.id, platform);
      setSocialTokens((prev) => prev.filter((t) => t.platform !== platform));
    } catch (e: unknown) {
      setTokenError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const platformMeta = (id: string) => PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0];

  const TABS: { id: Tab; label: string }[] = [
    { id: "profile",      label: "Profile" },
    { id: "subscription", label: "Subscription" },
    { id: "activity",     label: "Activity" },
    { id: "social",       label: "Social Accounts" },
  ];

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
        <div className="flex border-b border-gray-100 shrink-0 px-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
                tab === t.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-400 hover:text-gray-700"
              }`}
            >
              {t.label}
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

          {/* ── Social Accounts Tab ── */}
          {tab === "social" && (
            <div className="space-y-5">
              {/* Info card */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                <p className="font-semibold mb-1">Owner-Managed Social Accounts</p>
                <p className="text-xs text-blue-600">
                  Connect social media accounts for this client. The system uses these tokens
                  automatically when auto-posting. Clients do not enter API keys themselves.
                </p>
              </div>

              {/* Connected tokens list */}
              {socialLoading ? (
                <div className="flex items-center justify-center h-24">
                  <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {PLATFORMS.map((p) => {
                    const token = socialTokens.find((t) => t.platform === p.id);
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between rounded-xl p-3.5 border ${
                          token
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{p.icon}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.label}</p>
                            {token ? (
                              <p className="text-xs text-gray-500">
                                {token.account_name} · {token.access_token_preview}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-400">Not connected</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {token ? (
                            <>
                              <span className="text-xs text-emerald-600 font-medium">✓ Connected</span>
                              <button
                                onClick={() => {
                                  setTokenPlatform(p.id);
                                  setTokenAccountName(token.account_name);
                                  setTokenAccessToken("");
                                  setTokenPageId(token.page_id || "");
                                  setShowTokenForm(true);
                                  setTokenError("");
                                }}
                                className="text-xs text-gray-400 hover:text-orange-500 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteToken(p.id)}
                                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                              >
                                Remove
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setTokenPlatform(p.id);
                                setTokenAccountName("");
                                setTokenAccessToken("");
                                setTokenPageId("");
                                setShowTokenForm(true);
                                setTokenError("");
                              }}
                              className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Connect
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add / Edit form */}
              {showTokenForm && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-gray-200 rounded-xl p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {platformMeta(tokenPlatform).icon} Connect {platformMeta(tokenPlatform).label}
                    </h3>
                    <button
                      onClick={() => { setShowTokenForm(false); setTokenError(""); }}
                      className="text-gray-400 hover:text-gray-700 text-xs"
                    >
                      Cancel
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Platform</label>
                    <select
                      value={tokenPlatform}
                      onChange={(e) => setTokenPlatform(e.target.value)}
                      className={inputCls}
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Account Name</label>
                    <input
                      type="text"
                      value={tokenAccountName}
                      onChange={(e) => setTokenAccountName(e.target.value)}
                      placeholder="e.g. My Business Page"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Access Token</label>
                    <input
                      type="password"
                      value={tokenAccessToken}
                      onChange={(e) => setTokenAccessToken(e.target.value)}
                      placeholder="Paste access token here"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">
                      {platformMeta(tokenPlatform).placeholder_page}
                    </label>
                    <input
                      type="text"
                      value={tokenPageId}
                      onChange={(e) => setTokenPageId(e.target.value)}
                      placeholder={platformMeta(tokenPlatform).placeholder_page}
                      className={inputCls}
                    />
                  </div>

                  {tokenError && <p className="text-red-500 text-xs">{tokenError}</p>}

                  <button
                    onClick={handleSaveToken}
                    disabled={tokenSaving}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {tokenSaving ? "Saving…" : "Save Connection"}
                  </button>
                </motion.div>
              )}

              {tokenSuccess && (
                <p className="text-emerald-600 text-xs text-center font-medium">{tokenSuccess}</p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
