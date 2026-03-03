import { useState, useEffect } from "react";
import { generate, dashboard } from "../../services/api";
import { TokenProgressBar } from "../../components/ui/TokenProgressBar";
import { motion } from "framer-motion";

const PLATFORMS = [
  { id: "facebook", label: "Facebook", icon: "📘" },
  { id: "instagram", label: "Instagram", icon: "📸" },
  { id: "linkedin", label: "LinkedIn", icon: "💼" },
];
const TONES = ["professional", "casual", "energetic", "humorous", "inspirational"];

export function GeneratePage() {
  const [mode, setMode] = useState<"ai" | "manual">("ai");

  // AI mode state
  const [topic, setTopic] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["instagram"]);
  const [tone, setTone] = useState("professional");
  const [includeCTA, setIncludeCTA] = useState(false);
  const [hookResult, setHookResult] = useState("");
  const [captionResult, setCaptionResult] = useState("");
  const [loading, setLoading] = useState<"hook" | "caption" | null>(null);
  const [error, setError] = useState("");

  // Manual mode state
  const [manualHook, setManualHook] = useState("");
  const [manualCaption, setManualCaption] = useState("");
  const [copied, setCopied] = useState<"hook" | "caption" | null>(null);

  // Token state
  const [tokensUsed, setTokensUsed] = useState(0);
  const [tokensLimit, setTokensLimit] = useState(0);

  useEffect(() => {
    dashboard.clientStats().then((s) => {
      setTokensUsed(s.tokens_used);
      setTokensLimit(s.tokens_limit);
    });
  }, []);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const generateHook = async () => {
    if (!topic) { setError("Enter a topic first"); return; }
    if (platforms.length === 0) { setError("Select at least one platform"); return; }
    setError("");
    setLoading("hook");
    try {
      const res = await generate.hook({ topic, platform: platforms[0], tone, include_cta: includeCTA });
      setHookResult(res.result_text);
      setTokensUsed((prev) => prev + res.tokens_used);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(null);
    }
  };

  const generateCaption = async () => {
    if (!topic) { setError("Enter a topic first"); return; }
    setError("");
    setLoading("caption");
    try {
      const res = await generate.caption({ topic, platform: platforms[0], tone, include_cta: includeCTA });
      setCaptionResult(res.result_text);
      setTokensUsed((prev) => prev + res.tokens_used);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(null);
    }
  };

  const copyToClipboard = (text: string, field: "hook" | "caption") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const isAtLimit = tokensLimit > 0 && tokensUsed >= tokensLimit;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Content Creator</h1>
        <p className="text-gray-500 text-sm mt-1">Generate AI content or write your own hooks and captions</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        <button
          onClick={() => setMode("ai")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "ai" ? "bg-orange-500 text-white" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          ✨ AI Generate
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "manual" ? "bg-purple-600 text-white" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          ✏️ Write Manually
        </button>
      </div>

      {/* ── AI MODE ── */}
      {mode === "ai" && (
        <>
          <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div>
              <label className="block text-sm text-gray-500 mb-2">Topic / Product</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Summer sale on Nike sneakers..."
                rows={3}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 resize-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-2">Platform (select all you want)</label>
                <div className="flex flex-col gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlatform(p.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        platforms.includes(p.id)
                          ? "border-orange-500 bg-orange-50 text-orange-600"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {p.icon} {p.label}
                      {platforms.includes(p.id) && <span className="ml-auto text-orange-500 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-2">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                >
                  {TONES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cta"
                checked={includeCTA}
                onChange={(e) => setIncludeCTA(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="cta" className="text-sm text-gray-500">Include Call-to-Action</label>
            </div>

            {isAtLimit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-red-600 font-medium">Token limit reached</p>
                <p className="text-red-500 text-sm mt-1">Contact your administrator to upgrade your plan.</p>
              </div>
            )}

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={generateHook}
                disabled={loading !== null || isAtLimit}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading === "hook" ? "Generating..." : "✨ Generate Hook"}
              </button>
              <button
                onClick={generateCaption}
                disabled={loading !== null || isAtLimit}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading === "caption" ? "Generating..." : "📝 Generate Caption"}
              </button>
            </div>
          </div>

          {/* AI Results */}
          {hookResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-orange-200 rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-orange-600 font-semibold text-sm">✨ Generated Hook</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(hookResult, "hook")}
                    className="text-gray-500 hover:text-gray-700 text-xs"
                  >
                    {copied === "hook" ? "Copied!" : "Copy"}
                  </button>
                  <button onClick={() => setHookResult("")} className="text-gray-400 hover:text-gray-600 text-xs">Clear</button>
                </div>
              </div>
              <p className="text-gray-900 text-sm leading-relaxed">{hookResult}</p>
              <button
                onClick={generateHook}
                disabled={loading !== null}
                className="mt-3 text-xs text-orange-500 hover:text-orange-600"
              >
                🔄 Regenerate
              </button>
            </motion.div>
          )}

          {captionResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-purple-200 rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-purple-600 font-semibold text-sm">📝 Generated Caption</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(captionResult, "caption")}
                    className="text-gray-500 hover:text-gray-700 text-xs"
                  >
                    {copied === "caption" ? "Copied!" : "Copy"}
                  </button>
                  <button onClick={() => setCaptionResult("")} className="text-gray-400 hover:text-gray-600 text-xs">Clear</button>
                </div>
              </div>
              <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">{captionResult}</p>
              <button
                onClick={generateCaption}
                disabled={loading !== null}
                className="mt-3 text-xs text-purple-500 hover:text-purple-600"
              >
                🔄 Regenerate
              </button>
            </motion.div>
          )}
        </>
      )}

      {/* ── MANUAL MODE ── */}
      {mode === "manual" && (
        <div className="space-y-5">
          {/* Manual Hook */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between">
              <h3 className="text-orange-600 font-semibold text-sm">✏️ Write Your Hook</h3>
              <button
                onClick={() => copyToClipboard(manualHook, "hook")}
                disabled={!manualHook}
                className="text-gray-500 hover:text-gray-700 text-xs disabled:opacity-40 transition-colors"
              >
                {copied === "hook" ? "✓ Copied!" : "Copy"}
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

          {/* Manual Caption */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between">
              <h3 className="text-purple-600 font-semibold text-sm">✏️ Write Your Caption</h3>
              <button
                onClick={() => copyToClipboard(manualCaption, "caption")}
                disabled={!manualCaption}
                className="text-gray-500 hover:text-gray-700 text-xs disabled:opacity-40 transition-colors"
              >
                {copied === "caption" ? "✓ Copied!" : "Copy"}
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

          <p className="text-gray-500 text-xs text-center">
            Use the copy buttons to copy your text and paste it wherever you need.
          </p>
        </div>
      )}

      {/* Token usage (AI mode only) */}
      {mode === "ai" && (
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <TokenProgressBar used={tokensUsed} limit={tokensLimit} />
        </div>
      )}
    </div>
  );
}
