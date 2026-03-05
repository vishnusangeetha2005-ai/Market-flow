import { useState, useEffect } from "react";
import { generate, dashboard, bannerTemplates, posts } from "../../services/api";
import { TokenProgressBar } from "../../components/ui/TokenProgressBar";
import { motion } from "framer-motion";
import type { BannerTemplate } from "../../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const PLATFORMS = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "google", label: "Google Business" },
];

function imgSrc(url: string | null) {
  if (!url) return "";
  return url.startsWith("/static/") ? `${API_BASE}${url}` : url;
}

export function GeneratePage() {
  const [planName, setPlanName] = useState("");
  const [tokensUsed, setTokensUsed] = useState(0);
  const [tokensLimit, setTokensLimit] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  // Pro plan state
  const [generating, setGenerating] = useState(false);
  const [hookResult, setHookResult] = useState("");
  const [pickedBanner, setPickedBanner] = useState<BannerTemplate | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Post to social media state
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook"]);
  const [posting, setPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState("");
  const [postError, setPostError] = useState("");

  // Basic plan manual state
  const [manualHook, setManualHook] = useState("");
  const [manualCaption, setManualCaption] = useState("");
  const [copiedField, setCopiedField] = useState<"hook" | "caption" | null>(null);

  useEffect(() => {
    dashboard.clientStats().then((s) => {
      setPlanName(s.plan_name || "Starter");
      setTokensUsed(s.tokens_used);
      setTokensLimit(s.tokens_limit);
      setStatsLoading(false);
    });
  }, []);

  const isPro =
    planName.toLowerCase().includes("pro") ||
    planName.toLowerCase().includes("agency");

  const isAtLimit = tokensLimit > 0 && tokensUsed >= tokensLimit;

  const runGenerate = async () => {
    setError("");
    setPostSuccess("");
    setPostError("");
    setGenerating(true);
    try {
      const templates = await bannerTemplates.listPublic();
      let picked: BannerTemplate | null = null;
      if (templates.length > 0) {
        picked = templates[Math.floor(Math.random() * templates.length)];
        setPickedBanner(picked);
      } else {
        setPickedBanner(null);
      }
      // Use banner name/description as topic for a relevant hook
      const topic = picked
        ? picked.description || picked.name || "Digital Marketing"
        : "Digital Marketing";
      const res = await generate.hook({ topic, tone: "professional" });
      setHookResult(res.result_text);
      setTokensUsed((prev) => prev + res.tokens_used);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handlePublish = async () => {
    if (!hookResult) return;
    if (selectedPlatforms.length === 0) {
      setPostError("Select at least one platform.");
      return;
    }
    setPostError("");
    setPostSuccess("");
    setPosting(true);
    try {
      const post = await posts.create({
        caption: hookResult,
        banner_url: pickedBanner?.thumbnail_url || undefined,
        platforms: selectedPlatforms,
      });
      await posts.publish(post.id);
      setPostSuccess(`Posted to ${selectedPlatforms.join(", ")}!`);
    } catch (e: unknown) {
      setPostError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPosting(false);
    }
  };

  const copyManual = (text: string, field: "hook" | "caption") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Content Creator</h1>
        <p className="text-gray-500 text-sm mt-1">
          {isPro
            ? "AI picks a banner and generates a relevant hook — then post directly to social media"
            : "Write your own hooks and captions"}
        </p>
      </div>

      {/* ── BASIC / STARTER PLAN ── */}
      {!isPro && (
        <>
          {/* Upgrade banner */}
          <div className="bg-gradient-to-r from-purple-50 to-orange-50 border border-purple-200 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-purple-700 font-semibold text-sm">
                Upgrade to Pro to unlock AI generation
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Pro plan generates hooks, picks banners, and automates daily posting with AI
              </p>
            </div>
            <span className="text-2xl">✨</span>
          </div>

          {/* Manual write */}
          <div className="space-y-5">
            <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between">
                <h3 className="text-orange-600 font-semibold text-sm">✏️ Write Your Hook</h3>
                <button
                  onClick={() => copyManual(manualHook, "hook")}
                  disabled={!manualHook}
                  className="text-gray-500 hover:text-gray-700 text-xs disabled:opacity-40 transition-colors"
                >
                  {copiedField === "hook" ? "✓ Copied!" : "Copy"}
                </button>
              </div>
              <textarea
                value={manualHook}
                onChange={(e) => setManualHook(e.target.value)}
                placeholder="Write your attention-grabbing hook here... e.g. 🔥 Big summer sale starts NOW!"
                rows={4}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 resize-none transition-all"
              />
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-xs">{manualHook.length} characters</p>
                {manualHook && (
                  <button
                    onClick={() => setManualHook("")}
                    className="text-gray-400 hover:text-gray-600 text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between">
                <h3 className="text-purple-600 font-semibold text-sm">✏️ Write Your Caption</h3>
                <button
                  onClick={() => copyManual(manualCaption, "caption")}
                  disabled={!manualCaption}
                  className="text-gray-500 hover:text-gray-700 text-xs disabled:opacity-40 transition-colors"
                >
                  {copiedField === "caption" ? "✓ Copied!" : "Copy"}
                </button>
              </div>
              <textarea
                value={manualCaption}
                onChange={(e) => setManualCaption(e.target.value)}
                placeholder="Write your full post caption here... Include hashtags, emojis, CTA etc."
                rows={6}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 resize-none transition-all"
              />
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-xs">{manualCaption.length} characters</p>
                {manualCaption && (
                  <button
                    onClick={() => setManualCaption("")}
                    className="text-gray-400 hover:text-gray-600 text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <p className="text-gray-400 text-xs text-center">
              Topic: Digital Marketing · Tone: Professional
            </p>
          </div>
        </>
      )}

      {/* ── PRO / AGENCY PLAN ── */}
      {isPro && (
        <>
          {/* Fixed params display + generate button */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Banner Topic</p>
                <p className="text-gray-900 font-medium text-sm">
                  {pickedBanner
                    ? pickedBanner.description || pickedBanner.name
                    : "Auto-selected after generation"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Tone</p>
                <p className="text-gray-900 font-medium text-sm capitalize">Professional</p>
              </div>
            </div>

            {isAtLimit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-red-600 font-medium">Token limit reached</p>
                <p className="text-red-500 text-sm mt-1">
                  Contact your administrator to upgrade your plan.
                </p>
              </div>
            )}

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              onClick={runGenerate}
              disabled={generating || isAtLimit}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {generating ? "Generating…" : "✨ Generate Hook"}
            </button>
          </div>

          {/* Result card */}
          {(pickedBanner || hookResult) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-orange-200 rounded-xl p-6 space-y-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            >
              {pickedBanner && pickedBanner.thumbnail_url && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Selected Banner Template</p>
                  <img
                    src={imgSrc(pickedBanner.thumbnail_url)}
                    alt={pickedBanner.name}
                    className="w-full max-h-52 object-cover rounded-lg border border-gray-100"
                  />
                  <p className="text-xs text-gray-400 mt-1">{pickedBanner.name}</p>
                </div>
              )}

              {hookResult && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-orange-600 font-semibold text-sm">✨ Generated Hook</h3>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(hookResult);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-gray-500 hover:text-gray-700 text-xs"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                    {hookResult}
                  </p>
                </div>
              )}

              <button
                onClick={runGenerate}
                disabled={generating || isAtLimit}
                className="text-sm text-orange-500 hover:text-orange-600 font-medium disabled:opacity-50 transition-colors"
              >
                {generating ? "Generating…" : "🔄 Regenerate"}
              </button>
            </motion.div>
          )}

          {/* Post to Social Media */}
          {hookResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-100 rounded-xl p-6 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            >
              <h3 className="text-gray-900 font-semibold text-sm">🚀 Post to Social Media</h3>

              {/* Platform checkboxes */}
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      selectedPlatforms.includes(p.id)
                        ? "bg-orange-500 border-orange-500 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-orange-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {postError && <p className="text-red-500 text-xs">{postError}</p>}

              {postSuccess ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center gap-2">
                  <span className="text-emerald-600 text-sm font-medium">✓ {postSuccess}</span>
                </div>
              ) : (
                <button
                  onClick={handlePublish}
                  disabled={posting || selectedPlatforms.length === 0}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {posting ? "Publishing…" : "🚀 Publish Now"}
                </button>
              )}

              <p className="text-gray-400 text-xs">
                The generated hook and selected banner will be posted to your connected accounts.
              </p>
            </motion.div>
          )}

          {/* Token usage */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <TokenProgressBar used={tokensUsed} limit={tokensLimit} />
          </div>
        </>
      )}
    </div>
  );
}
