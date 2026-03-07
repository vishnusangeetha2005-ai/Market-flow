import { useAuth } from "../../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { dashboard, profile, socialTokens } from "../../services/api";
import type { ClientStats } from "../../types";
import { StatusBadge } from "../../components/ui/StatusBadge";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function getFacebookOAuthUrl(): Promise<string> {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}/api/v1/auth/facebook/connect`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to get OAuth URL");
  const data = await res.json();
  return data.auth_url;
}

function imgSrc(url: string | null) {
  if (!url) return "";
  return url.startsWith("/static/") ? `${API_BASE}${url}` : url;
}

const PLATFORMS = [
  { id: "facebook",  label: "Facebook",               icon: "📘", tokenLabel: "Page Access Token", idLabel: "Page ID",          idHelp: "Facebook Page → About → Page ID" },
  { id: "instagram", label: "Instagram",               icon: "📸", tokenLabel: "Access Token",      idLabel: "Instagram Account ID", idHelp: "Facebook Business Manager → Instagram Accounts" },
  { id: "linkedin",  label: "LinkedIn",                icon: "💼", tokenLabel: "Access Token",      idLabel: "Organization ID",  idHelp: "linkedin.com/company/[ID]" },
  { id: "google",    label: "Google Business Profile", icon: "🗺️", tokenLabel: "OAuth Access Token", idLabel: "Location Name",   idHelp: "accounts/{accountId}/locations/{locationId}" },
];

type TokenMap = Record<string, { account_name: string; access_token_preview: string; page_id: string | null; updated_at: string } | null>;
type FormState = Record<string, { account_name: string; access_token: string; page_id: string; open: boolean; saving: boolean; saved: boolean; error: string }>;

const emptyForm = { account_name: "", access_token: "", page_id: "", open: false, saving: false, saved: false, error: "" };

export function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [fbSuccess, setFbSuccess] = useState("");
  const [fbError, setFbError] = useState("");

  // Company details
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone]             = useState("");
  const [address, setAddress]         = useState("");
  const [website, setWebsite]         = useState("");
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  // Logo
  const [logoUrl, setLogoUrl]           = useState<string | null>(null);
  const [logoPreview, setLogoPreview]   = useState<string | null>(null);
  const [logoFile, setLogoFile]         = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoSaved, setLogoSaved]       = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Social tokens
  const [tokens, setTokens] = useState<TokenMap>(
    Object.fromEntries(PLATFORMS.map((p) => [p.id, null]))
  );
  const [forms, setForms] = useState<FormState>(
    Object.fromEntries(PLATFORMS.map((p) => [p.id, { ...emptyForm }]))
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("facebook_connected")) {
      const pageName = params.get("page_name") || "your page";
      setFbSuccess(`✓ Facebook connected: ${pageName}`);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("facebook_error")) {
      setFbError(params.get("facebook_error") === "no_pages" ? "No Facebook Pages found. Please create a Facebook Page first." : "Facebook connection failed. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    }
    dashboard.clientStats().then(setStats);
    profile.get().then((p) => {
      setCompanyName(p.company_name || "");
      setPhone(p.phone || "");
      setAddress(p.address || "");
      setWebsite(p.website || "");
      setLogoUrl(p.logo_url || null);
    });
    socialTokens.list().then((list) => {
      const map: TokenMap = Object.fromEntries(PLATFORMS.map((p) => [p.id, null]));
      list.forEach((t) => { map[t.platform] = t; });
      setTokens(map);
    }).catch(() => {});
  }, []);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await profile.update({ company_name: companyName, phone, address, website });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    if (file) setLogoPreview(URL.createObjectURL(file));
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return;
    setLogoUploading(true);
    try {
      const res = await profile.uploadLogo(logoFile);
      setLogoUrl(res.logo_url);
      setLogoPreview(null);
      setLogoFile(null);
      setLogoSaved(true);
      setTimeout(() => setLogoSaved(false), 3000);
    } finally {
      setLogoUploading(false);
    }
  };

  const setForm = (platform: string, patch: Partial<FormState[string]>) =>
    setForms((prev) => ({ ...prev, [platform]: { ...prev[platform], ...patch } }));

  const openForm = (platform: string) => {
    const existing = tokens[platform];
    setForm(platform, {
      open: true,
      account_name: existing?.account_name || "",
      access_token: "",
      page_id: existing?.page_id || "",
      error: "",
      saved: false,
    });
  };

  const handleSaveToken = async (platform: string) => {
    const f = forms[platform];
    if (!f.account_name.trim()) { setForm(platform, { error: "Account name is required" }); return; }
    if (!f.access_token.trim()) { setForm(platform, { error: "Access token is required" }); return; }
    setForm(platform, { saving: true, error: "" });
    try {
      await socialTokens.save({
        platform,
        account_name: f.account_name.trim(),
        access_token: f.access_token.trim(),
        page_id: f.page_id.trim() || undefined,
      });
      const list = await socialTokens.list();
      const map: TokenMap = Object.fromEntries(PLATFORMS.map((p) => [p.id, null]));
      list.forEach((t) => { map[t.platform] = t; });
      setTokens(map);
      setForm(platform, { saving: false, saved: true, open: false });
      setTimeout(() => setForm(platform, { saved: false }), 3000);
    } catch (err: unknown) {
      setForm(platform, { saving: false, error: err instanceof Error ? err.message : "Failed to save" });
    }
  };

  const handleDisconnect = async (platform: string) => {
    await socialTokens.delete(platform);
    setTokens((prev) => ({ ...prev, [platform]: null }));
  };

  const inputCls = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all";

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile & Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account, company details and social connections</p>
      </div>

      {/* Account info */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center text-xl font-bold text-white">
            {user?.name?.[0]?.toUpperCase() || "C"}
          </div>
          <div>
            <p className="text-gray-900 font-medium">{user?.name}</p>
            <p className="text-gray-500 text-sm">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Logo upload */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <h3 className="text-gray-900 font-semibold mb-1">Business Logo</h3>
        <p className="text-gray-500 text-xs mb-4">
          Auto-placed on banners via <code className="bg-gray-100 px-1 rounded text-orange-600">{`{{logo}}`}</code>
        </p>
        <div className="flex items-center gap-5">
          <div
            onClick={() => fileRef.current?.click()}
            className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-400 flex items-center justify-center cursor-pointer overflow-hidden transition-colors"
          >
            {logoPreview || logoUrl ? (
              <img src={logoPreview || imgSrc(logoUrl)} alt="logo" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center"><p className="text-2xl">🖼️</p><p className="text-xs text-gray-400 mt-1">Upload</p></div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
            <button onClick={() => fileRef.current?.click()}
              className="w-full border border-gray-200 hover:border-orange-400 text-gray-600 hover:text-orange-600 py-2 rounded-lg text-sm transition-colors">
              {logoUrl ? "Change Logo" : "Choose Logo"}
            </button>
            {logoFile && (
              <button onClick={handleUploadLogo} disabled={logoUploading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {logoUploading ? "Uploading…" : "Save Logo"}
              </button>
            )}
            {logoSaved && <p className="text-emerald-600 text-xs text-center">✓ Logo saved!</p>}
            <p className="text-gray-400 text-xs">PNG, JPG, WebP — max 5 MB</p>
          </div>
        </div>
      </div>

      {/* Company details */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <h3 className="text-gray-900 font-semibold mb-1">Company Details</h3>
        <p className="text-gray-500 text-xs mb-4">Auto-inserted into AI-generated banners and hooks.</p>
        <form onSubmit={handleSaveCompany} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Business Name</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Nike India" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Phone / WhatsApp</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +91 9876543210" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Website</label>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="e.g. nikeIndia.com" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. MG Road, Chennai 600001" className={inputCls} />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Company Details"}
          </button>
          {saved && <p className="text-emerald-600 text-xs text-center">Saved — banners will use updated info.</p>}
        </form>
      </div>

      {/* Social Media Connections */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <h3 className="text-gray-900 font-semibold mb-1">Social Media Connections</h3>
        <p className="text-gray-500 text-xs mb-5">
          Connect your accounts so the system can post banners automatically.
        </p>
        {fbSuccess && <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">{fbSuccess}</div>}
        {fbError && <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{fbError}</div>}

        <div className="space-y-4">
          {PLATFORMS.map((p) => {
            const connected = tokens[p.id];
            const form = forms[p.id];
            return (
              <div key={p.id} className={`rounded-xl border p-4 ${connected ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-white"}`}>
                {/* Platform row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{p.icon}</span>
                    <div>
                      <p className="text-gray-900 font-medium text-sm">{p.label}</p>
                      {connected
                        ? <p className="text-emerald-600 text-xs">✓ Connected — {connected.account_name}</p>
                        : <p className="text-gray-500 text-xs">Not connected</p>
                      }
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {connected && !form.open && (
                      <button onClick={() => handleDisconnect(p.id)}
                        className="text-xs text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-300 transition-colors">
                        Disconnect
                      </button>
                    )}
                    {!form.open && (
                      <button onClick={() => openForm(p.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                          connected
                            ? "text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-400"
                            : "text-white bg-orange-500 hover:bg-orange-600"
                        }`}>
                        {connected ? "Update" : "Connect"}
                      </button>
                    )}
                    {form.saved && <span className="text-emerald-600 text-xs">✓ Saved!</span>}
                  </div>
                </div>

                {/* Connect form */}
                {form.open && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 space-y-3 border-t border-gray-200 pt-4"
                  >
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Account / Page Name</label>
                      <input value={form.account_name} onChange={(e) => setForm(p.id, { account_name: e.target.value })}
                        placeholder={`e.g. My Business ${p.label} Page`}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{p.tokenLabel}</label>
                      <input type="password" value={form.access_token} onChange={(e) => setForm(p.id, { access_token: e.target.value })}
                        placeholder="Paste your access token here"
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{p.idLabel}</label>
                      <input value={form.page_id} onChange={(e) => setForm(p.id, { page_id: e.target.value })}
                        placeholder={p.idHelp}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all" />
                      <p className="text-gray-400 text-xs mt-1">{p.idHelp}</p>
                    </div>
                    {form.error && <p className="text-red-500 text-xs">{form.error}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveToken(p.id)} disabled={form.saving}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                        {form.saving ? "Saving…" : "Save Connection"}
                      </button>
                      <button onClick={() => setForm(p.id, { open: false, error: "" })}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm transition-colors">
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Token preview when connected */}
                {connected && !form.open && (
                  <div className="mt-3 pt-3 border-t border-emerald-200 flex gap-6 text-xs text-gray-500">
                    <span>Token: {connected.access_token_preview}</span>
                    {connected.page_id && <span>ID: {connected.page_id}</span>}
                    <span>Updated: {new Date(connected.updated_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Subscription */}
      {stats && (
        <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <h3 className="text-gray-900 font-semibold">Subscription</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-gray-500">Plan</p><p className="text-gray-900 font-medium">{stats.plan_name}</p></div>
            <div><p className="text-xs text-gray-500">Status</p><StatusBadge status={stats.subscription_status} /></div>
            <div><p className="text-xs text-gray-500">Expires</p><p className="text-sm text-gray-900">{stats.subscription_end_date ? new Date(stats.subscription_end_date).toLocaleDateString() : "N/A"}</p></div>
            <div><p className="text-xs text-gray-500">Tokens Used</p><p className="text-sm text-gray-900">{stats.tokens_used.toLocaleString()}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
