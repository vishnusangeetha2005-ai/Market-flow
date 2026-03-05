import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { automationContent, dashboard } from "../../services/api";
import type { AutomationContentItem } from "../../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_V1 = `${API_BASE}/api/v1`;

function clientToken() {
  return localStorage.getItem("access_token") || "";
}

async function getAutomation() {
  const res = await fetch(`${API_V1}/automation`, {
    headers: { Authorization: `Bearer ${clientToken()}` },
  });
  return res.json();
}

async function saveAutomation(data: object) {
  const res = await fetch(`${API_V1}/automation`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${clientToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

const ALL_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_SHORT: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed",
  thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun",
};
const ALL_PLATFORMS = ["facebook", "instagram", "linkedin"];
const PLATFORM_ICON: Record<string, string> = {
  facebook: "📘", instagram: "📸", linkedin: "💼",
};

function imgSrc(url: string | null) {
  if (!url) return "";
  return url.startsWith("/static/") ? `${API_BASE}${url}` : url;
}

// Determine mode from plan name
function modeFromPlan(planName: string): "basic" | "auto" {
  const name = planName.toLowerCase();
  if (name.includes("pro") || name.includes("agency")) return "auto";
  return "basic"; // Starter or anything else = basic
}

export function AutomationPage() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [mode, setMode] = useState<"basic" | "auto" | null>(null); // null = loading
  const [planName, setPlanName] = useState("Starter");

  // Schedule state
  const [enabled, setEnabled] = useState(false);
  const [postTime, setPostTime] = useState("10:00");
  const [postDays, setPostDays] = useState<string[]>(ALL_DAYS);
  const [platforms, setPlatforms] = useState<string[]>(["facebook", "instagram"]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Basic plan content state
  const [contentList, setContentList] = useState<AutomationContentItem[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [hookText, setHookText] = useState("");
  const [captionText, setCaptionText] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [addingContent, setAddingContent] = useState(false);
  const [addError, setAddError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load plan + automation settings together
    Promise.all([
      dashboard.clientStats(),
      getAutomation(),
    ]).then(([stats, s]) => {
      const plan = stats.plan_name || "Starter";
      const detectedMode = modeFromPlan(plan);
      setPlanName(plan);
      setMode(detectedMode);
      setSettings(s);
      setEnabled(s.enabled);
      setPostTime(s.post_time || "10:00");
      setPostDays(s.post_days || ALL_DAYS);
      setPlatforms(s.platforms || ["facebook", "instagram"]);

      // Sync mode to backend if it changed
      if ((s.automation_mode || "basic") !== detectedMode) {
        saveAutomation({
          enabled: s.enabled,
          post_time: s.post_time,
          post_days: s.post_days,
          platforms: s.platforms,
          automation_mode: detectedMode,
        });
      }
    });

    // Load content list for basic plan
    setContentLoading(true);
    automationContent.list()
      .then(setContentList)
      .finally(() => setContentLoading(false));
  }, []);

  const toggleDay = (day: string) =>
    setPostDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);

  const togglePlatform = (p: string) =>
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await saveAutomation({
        enabled, post_time: postTime, post_days: postDays, platforms, automation_mode: mode,
      });
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const toggleEnable = async () => {
    const newVal = !enabled;
    setEnabled(newVal);
    const updated = await saveAutomation({
      enabled: newVal, post_time: postTime, post_days: postDays, platforms, automation_mode: mode,
    });
    setSettings(updated);
  };

  const handleBannerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setBannerFile(file);
    if (file) setBannerPreview(URL.createObjectURL(file));
    else setBannerPreview("");
  };

  const handleAddContent = async () => {
    if (!hookText.trim()) { setAddError("Hook text is required"); return; }
    setAddError("");
    setAddingContent(true);
    try {
      const item = await automationContent.add({
        hook_text: hookText.trim(),
        caption_text: captionText.trim() || undefined,
        banner: bannerFile,
      });
      setContentList((prev) => [...prev, item]);
      setHookText("");
      setCaptionText("");
      setBannerFile(null);
      setBannerPreview("");
      setShowAddForm(false);
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAddingContent(false);
    }
  };

  const handleDeleteContent = async (id: number) => {
    await automationContent.delete(id);
    setContentList((prev) => prev.filter((c) => c.id !== id));
  };

  const totalAutoPosts = (settings?.total_auto_posts as number) || 0;

  // Loading state
  if (mode === null) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-500">Loading your plan…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auto Posting</h1>
          <p className="text-gray-500 text-sm mt-1">Set up once — system posts for you every day</p>
        </div>
        {/* Plan badge */}
        <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
          mode === "auto"
            ? "bg-purple-50 border-purple-200 text-purple-700"
            : "bg-orange-50 border-orange-200 text-orange-600"
        }`}>
          {mode === "auto" ? "✨ Pro Plan" : "🗓️ Basic Plan"} — {planName}
        </div>
      </div>

      {/* Status card */}
      {settings && (
        <div className={`rounded-xl border p-5 flex items-center justify-between ${
          enabled ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
        }`}>
          <div>
            <p className="text-gray-900 font-semibold">
              {enabled ? "Automation is ON" : "Automation is OFF"}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {enabled
                ? `${mode === "basic" ? "Basic" : "AI"} mode — posting daily at ${postTime} IST`
                : "Turn on to start auto-posting"}
            </p>
            {!!settings.last_posted_date && (
              <p className="text-xs text-gray-400 mt-1">
                Last posted: {new Date(String(settings.last_posted_date)).toLocaleDateString()}
              </p>
            )}
          </div>
          <button
            onClick={toggleEnable}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              enabled ? "bg-emerald-500" : "bg-gray-300"
            }`}
          >
            <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
              enabled ? "translate-x-7" : "translate-x-0.5"
            }`} />
          </button>
        </div>
      )}

      {/* ── BASIC PLAN UI ── */}
      {mode === "basic" && (
        <>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
            <h3 className="text-gray-900 font-medium mb-3">How it works</h3>
            <div className="space-y-2">
              {[
                { icon: "📤", text: "Upload your banners + write hooks in bulk below" },
                { icon: "🗓️", text: "Set your posting schedule once (time + days)" },
                { icon: "🔄", text: "System rotates through your content daily automatically" },
                { icon: "📲", text: "Posts to your selected platforms every scheduled day" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-gray-500">
                  <span>{item.icon}</span><span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Content list */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-900 font-semibold">Your Content List</h3>
                <p className="text-gray-500 text-xs mt-0.5">
                  {contentList.length} item{contentList.length !== 1 ? "s" : ""} — rotates daily
                </p>
              </div>
              <button
                onClick={() => { setShowAddForm(true); setAddError(""); }}
                className="bg-orange-500 hover:bg-orange-400 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                + Add Banner & Hook
              </button>
            </div>

            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4"
              >
                <h4 className="text-gray-900 font-medium text-sm">New Content Item</h4>

                <div>
                  <label className="block text-xs text-gray-500 mb-2">Banner Image (optional)</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-orange-500 transition-colors"
                  >
                    {bannerPreview ? (
                      <img src={bannerPreview} alt="preview" className="max-h-32 mx-auto rounded" />
                    ) : (
                      <p className="text-gray-500 text-xs">Click to upload banner image</p>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleBannerFile} className="hidden" />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-2">Hook Text <span className="text-red-500">*</span></label>
                  <textarea
                    value={hookText}
                    onChange={(e) => setHookText(e.target.value)}
                    placeholder="e.g. 🔥 Big summer sale — 50% off everything!"
                    rows={2}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 resize-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-2">Caption (optional)</label>
                  <textarea
                    value={captionText}
                    onChange={(e) => setCaptionText(e.target.value)}
                    placeholder="Full post caption with hashtags, emojis, CTA..."
                    rows={3}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 resize-none transition-all"
                  />
                </div>

                {addError && <p className="text-red-500 text-xs">{addError}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={handleAddContent}
                    disabled={addingContent}
                    className="flex-1 bg-orange-500 hover:bg-orange-400 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    {addingContent ? "Adding…" : "Add to List"}
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setHookText(""); setCaptionText(""); setBannerFile(null); setBannerPreview(""); }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {contentLoading ? (
              <p className="text-gray-500 text-sm">Loading…</p>
            ) : contentList.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-sm">No content added yet.</p>
                <p className="text-xs mt-1">Add at least 1 banner + hook to enable auto posting.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contentList.map((item, i) => (
                  <div key={item.id} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-orange-50 text-orange-500 text-xs flex items-center justify-center font-bold mt-0.5">
                      {i + 1}
                    </div>
                    {item.banner_url ? (
                      <img src={imgSrc(item.banner_url)} alt="banner" className="shrink-0 w-16 h-16 rounded-lg object-cover border border-gray-200" />
                    ) : (
                      <div className="shrink-0 w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-xs">No img</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 text-sm font-medium line-clamp-2">{item.hook_text}</p>
                      {item.caption_text && (
                        <p className="text-gray-500 text-xs mt-1 line-clamp-2">{item.caption_text}</p>
                      )}
                    </div>
                    <button onClick={() => handleDeleteContent(item.id)} className="shrink-0 text-gray-400 hover:text-red-500 text-xs transition-colors">🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── PRO PLAN UI ── */}
      {mode === "auto" && (
        <>
        {/* AI info highlight card */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5 flex items-start gap-4">
          <span className="text-2xl mt-0.5">🤖</span>
          <div>
            <p className="text-purple-700 font-semibold text-sm">AI-Powered Auto Posting</p>
            <p className="text-gray-600 text-sm mt-1">
              AI automatically picks a banner and generates a hook daily at your set time — no manual effort needed.
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <h3 className="text-gray-900 font-medium mb-3">How it works</h3>
          <div className="space-y-2">
            {[
              { icon: "🖼️", text: "System picks next owner banner template automatically (rotating)" },
              { icon: "✨", text: "AI generates hook + caption for that banner" },
              { icon: "🏢", text: "Your company name, phone & address are added automatically" },
              { icon: "📤", text: "Post is published to your selected platforms" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-gray-500">
                <span>{item.icon}</span><span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        </>
      )}

      {/* Schedule settings */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <h3 className="text-gray-900 font-semibold">Posting Schedule</h3>

        <div>
          <label className="block text-sm text-gray-500 mb-2">Post Time (IST)</label>
          <input
            type="time"
            value={postTime}
            onChange={(e) => setPostTime(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
          />
          <p className="text-xs text-gray-500 mt-1">System will post at this time every selected day</p>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-2">Posting Days ({postDays.length} selected)</label>
          <div className="flex flex-wrap gap-2">
            {ALL_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  postDays.includes(day)
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {DAY_SHORT[day]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-2">Post To</label>
          <div className="flex gap-3 flex-wrap">
            {ALL_PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  platforms.includes(p)
                    ? "border-orange-500 bg-orange-50 text-orange-600"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {PLATFORM_ICON[p]} {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-orange-500 hover:bg-orange-400 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Schedule"}
        </button>

        {saved && (
          <p className="text-emerald-600 text-xs text-center">
            Schedule saved — system will auto-post at {postTime} IST on selected days.
          </p>
        )}
      </div>

      {/* Stats */}
      {settings && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white border border-gray-100 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
        >
          <h3 className="text-gray-900 font-medium mb-3">Stats</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-orange-500">{totalAutoPosts}</p>
              <p className="text-xs text-gray-500 mt-1">Total Auto Posts</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-500">
                {mode === "basic" ? contentList.length : (settings.banner_rotation_index as number) || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">{mode === "basic" ? "Content Items" : "Banners Used"}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-500">{postDays.length}</p>
              <p className="text-xs text-gray-500 mt-1">Days / Week</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
