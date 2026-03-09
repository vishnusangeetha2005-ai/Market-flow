import { useState, useEffect } from "react";
import { posts, banners } from "../../services/api";
import type { Post, Banner } from "../../types";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { motion } from "framer-motion";

const PLATFORMS = ["facebook", "instagram", "linkedin"];
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function bannerImgUrl(url: string) {
  return url.startsWith("/api/") ? `${API_BASE}${url}` : url;
}

export function SchedulePage() {
  const [postList, setPostList] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ caption: "", banner_url: "", platforms: [] as string[], scheduled_at: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [clientBanners, setClientBanners] = useState<Banner[]>([]);
  const [showBannerPicker, setShowBannerPicker] = useState(false);

  const load = () => posts.list().then(setPostList).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const togglePlatform = (p: string) => {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p],
    }));
  };

  const handleCreate = async (publishNow: boolean) => {
    if (!form.caption || form.platforms.length === 0) {
      setError("Caption and at least one platform required");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const post = await posts.create({
        caption: form.caption,
        banner_url: form.banner_url || undefined,
        platforms: form.platforms,
      });
      if (publishNow) {
        await posts.publish(post.id);
      } else if (form.scheduled_at) {
        await posts.schedule(post.id, new Date(form.scheduled_at).toISOString());
      }
      setShowForm(false);
      setShowBannerPicker(false);
      setForm({ caption: "", banner_url: "", platforms: [], scheduled_at: "" });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async (id: number) => {
    try {
      await posts.retry(id);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Retry failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Posts</h1>
          <p className="text-gray-500 text-sm mt-1">Create, schedule, and publish social media posts</p>
        </div>
        <button
          onClick={() => { setShowForm(true); banners.list().then(setClientBanners); }}
          className="bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-xl text-sm font-semibold
                     transition-all duration-150 shadow-sm hover:shadow-lg hover:shadow-orange-500/20"
        >
          + New Post
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-3">
          {postList.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white border border-gray-100 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 line-clamp-2">{post.caption}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <StatusBadge status={post.status} />
                    <span className="text-xs text-gray-500">
                      {post.platforms.join(", ")}
                    </span>
                    {post.scheduled_at && (
                      <span className="text-xs text-orange-500">
                        📅 {new Date(post.scheduled_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {/* Platform results */}
                  {post.results && post.results.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {post.results.map((r) => (
                        <span key={r.id} className={`text-xs px-2 py-0.5 rounded-full border ${
                          r.status === "success"
                            ? "border-emerald-200 text-emerald-700"
                            : "border-red-200 text-red-600"
                        }`}>
                          {r.platform}: {r.status}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(post.status === "failed" || post.status === "partial") && (
                    <button
                      onClick={() => handleRetry(post.id)}
                      className="text-xs text-amber-600 hover:text-amber-700 border border-amber-200 hover:border-amber-300 px-2 py-1 rounded-lg transition-colors"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    onClick={async () => { await posts.delete(post.id); await load(); }}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {postList.length === 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <p className="text-gray-500">No posts yet. Create your first post!</p>
            </div>
          )}
        </div>
      )}

      {/* Create Post Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-2xl p-6 w-full max-w-lg space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Create Post</h2>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Caption</label>
              <textarea
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                rows={4}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 resize-none transition-all"
                placeholder="Write your post caption..."
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Banner (optional)</label>
              {form.banner_url ? (
                <div className="flex items-center gap-3 p-2 border border-orange-200 rounded-lg bg-orange-50">
                  <img
                    src={bannerImgUrl(form.banner_url)}
                    alt="Selected banner"
                    className="h-14 w-24 object-cover rounded border border-orange-100"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <span className="flex-1 text-xs text-orange-700 truncate">Banner selected</span>
                  <button
                    type="button"
                    onClick={() => { setForm({ ...form, banner_url: "" }); setShowBannerPicker(false); }}
                    className="text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowBannerPicker((v) => !v)}
                  className="w-full border border-gray-200 hover:border-orange-300 text-gray-500 hover:text-orange-600 rounded-lg px-3 py-2 text-sm text-left transition-all"
                >
                  {showBannerPicker ? "Hide Banner Picker ▲" : "Pick a Banner ▼"}
                </button>
              )}
              {showBannerPicker && !form.banner_url && (
                <div className="mt-2 border border-gray-100 rounded-xl p-3 bg-gray-50 max-h-48 overflow-y-auto">
                  {clientBanners.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No banners yet. Generate one first.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {clientBanners.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setForm({ ...form, banner_url: b.result_url });
                            setShowBannerPicker(false);
                          }}
                          className="relative group rounded-lg overflow-hidden border border-gray-200 hover:border-orange-400 transition-all"
                        >
                          <img
                            src={bannerImgUrl(b.result_url)}
                            alt={`Banner ${b.id}`}
                            className="h-16 w-full object-cover"
                            onError={(e) => {
                              const el = e.target as HTMLImageElement;
                              el.style.display = "none";
                              if (el.nextElementSibling) (el.nextElementSibling as HTMLElement).style.display = "flex";
                            }}
                          />
                          <div className="hidden h-16 w-full items-center justify-center bg-gray-100 text-gray-400 text-xs">
                            No preview
                          </div>
                          <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/10 transition-all" />
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => { setForm({ ...form, banner_url: "" }); setShowBannerPicker(false); }}
                        className="h-16 rounded-lg border border-dashed border-gray-300 hover:border-gray-400 text-xs text-gray-400 hover:text-gray-500 transition-all"
                      >
                        No Banner
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-2">Platforms</label>
              <div className="flex gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${
                      form.platforms.includes(p)
                        ? "border-orange-500 text-orange-600 bg-orange-50"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Schedule for (optional)</label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setShowBannerPicker(false); }}
                className="flex-1 border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 py-2 rounded-lg text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreate(false)}
                disabled={submitting}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-lg text-sm disabled:opacity-50 transition-all"
              >
                {form.scheduled_at ? "Schedule" : "Save Draft"}
              </button>
              <button
                onClick={() => handleCreate(true)}
                disabled={submitting}
                className="flex-1 bg-orange-500 hover:bg-orange-400 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-all"
              >
                Publish Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
