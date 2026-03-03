import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BannerTemplate } from "../../types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("owner_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchTemplates(): Promise<BannerTemplate[]> {
  const res = await fetch(`${API_BASE}/api/v1/banner-templates`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load");
  return res.json();
}

async function uploadTemplate(file: File): Promise<void> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`${API_BASE}/api/v1/banner-templates`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Upload failed");
  }
}

async function deleteTemplate(id: number): Promise<void> {
  await fetch(`${API_BASE}/api/v1/banner-templates/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)] animate-pulse">
      <div className="aspect-video bg-slate-200" />
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
          <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
        </div>
        <div className="h-8 bg-slate-200 rounded-lg w-16" />
      </div>
    </div>
  );
}

export function BannerTemplatesPage() {
  const [templates, setTemplates] = useState<BannerTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () =>
    fetchTemplates()
      .then(setTemplates)
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const pickFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) pickFile(f);
  };

  const openForm = () => {
    setFile(null); setPreview(null); setError("");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError("Please select an image"); return; }
    setSaving(true); setError("");
    try {
      await uploadTemplate(file);
      setShowForm(false);
      setLoading(true);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this template? Clients will no longer see it.")) return;
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    await deleteTemplate(id);
  };

  const imgUrl = (t: BannerTemplate) =>
    t.thumbnail_url?.startsWith("/static/") ? `${API_BASE}${t.thumbnail_url}` : t.thumbnail_url || "";

  return (
    <div className="space-y-6">

      {/* ── Page Header ───────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Banner Templates</h1>
            {!loading && templates.length > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-600
                               font-semibold border border-orange-100">
                {templates.length} {templates.length === 1 ? "template" : "templates"}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Upload banner images that your clients can browse and download
          </p>
        </div>
        <button
          onClick={openForm}
          className="inline-flex items-center gap-2 px-5 py-2.5
                     bg-orange-500 hover:bg-orange-600 text-white
                     text-sm font-semibold rounded-xl shadow-sm
                     transition-all duration-150 hover:shadow-lg hover:shadow-orange-600/20"
        >
          + Add Template
        </button>
      </div>

      {/* ── Grid ──────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center
                        shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">🎨</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates yet</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto mb-6">
            Upload your first banner template. Clients will see and download them from their portal.
          </p>
          <button
            onClick={openForm}
            className="inline-flex items-center gap-2 px-5 py-2.5
                       bg-orange-500 hover:bg-orange-600 text-white
                       text-sm font-semibold rounded-xl transition-colors duration-150"
          >
            + Upload First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              className="bg-white border border-gray-100 rounded-2xl overflow-hidden
                         shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                         hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]
                         hover:-translate-y-0.5 hover:border-orange-200
                         transition-all duration-200 group"
            >
              {/* Image */}
              <div className="relative aspect-video overflow-hidden bg-slate-100">
                <img
                  src={imgUrl(t)}
                  alt={t.name}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://placehold.co/600x340/FFF7ED/F97316?text=Banner";
                  }}
                />
                {/* Hover badge */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <span className="text-[10px] px-2 py-1 bg-white/90 text-gray-600 font-semibold rounded-lg shadow-sm">
                    Template
                  </span>
                </div>
              </div>

              {/* Card footer */}
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{t.name}</p>
                  {t.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{t.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-600
                             hover:bg-red-50 px-3 py-1.5 rounded-lg
                             border border-transparent hover:border-red-100
                             transition-all duration-150"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Add Template Modal ─────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ y: 16, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Add Banner Template</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Upload a banner image for your clients</p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl
                             text-gray-400 hover:text-gray-700 hover:bg-gray-100
                             transition-colors duration-150 text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Modal body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">

                {/* Drag-drop zone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Banner Image <span className="text-red-400">*</span>
                  </label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl cursor-pointer
                                transition-all duration-200 overflow-hidden ${
                      dragging
                        ? "border-orange-400 bg-orange-50 shadow-[0_0_20px_rgba(249,115,22,0.18)]"
                        : preview
                        ? "border-gray-200 hover:border-orange-300"
                        : "border-gray-200 hover:border-orange-400 hover:bg-orange-50/30"
                    }`}
                  >
                    {preview ? (
                      <div className="relative">
                        <img
                          src={preview}
                          alt="preview"
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center
                                        opacity-0 hover:opacity-100 transition-opacity duration-150">
                          <p className="text-white text-xs font-semibold bg-black/30 px-3 py-1.5 rounded-lg">
                            Click to change image
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-48 flex flex-col items-center justify-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                          dragging ? "bg-orange-100" : "bg-orange-50"
                        }`}>
                          <span className="text-2xl">{dragging ? "📥" : "↑"}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-700 text-center">
                            {dragging ? "Drop to upload!" : "Click or drag & drop"}
                          </p>
                          <p className="text-xs text-gray-400 text-center mt-0.5">
                            PNG, JPG, WEBP supported
                          </p>
                        </div>
                      </div>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
                    />
                  </div>
                  {preview && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                      className="text-xs text-gray-400 hover:text-red-500 mt-2 transition-colors duration-150"
                    >
                      ✕ Remove image
                    </button>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <span className="text-red-500 text-sm leading-none">⚠</span>
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600
                               hover:text-gray-900 hover:bg-gray-50 text-sm font-medium rounded-xl
                               transition-all duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !file}
                    className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white
                               text-sm font-semibold rounded-xl transition-all duration-150
                               disabled:opacity-50 disabled:cursor-not-allowed
                               hover:shadow-lg hover:shadow-orange-600/20"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10"
                                  stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Uploading…
                      </span>
                    ) : "Add Template"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
