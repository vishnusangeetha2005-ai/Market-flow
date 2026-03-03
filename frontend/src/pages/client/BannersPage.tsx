import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { banners } from "../../services/api";
import type { BannerTemplate, Banner } from "../../types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

function imgSrc(url: string) {
  return url.startsWith("/static/") ? `${API_BASE}${url}` : url;
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden animate-pulse shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="aspect-video bg-slate-200" />
      <div className="p-4 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 rounded-lg w-32" />
          <div className="h-3 bg-slate-100 rounded-lg w-20" />
        </div>
        <div className="h-8 bg-slate-200 rounded-xl w-24" />
      </div>
    </div>
  );
}

export function BannersPage() {
  const [tab, setTab] = useState<"owner" | "my">("owner");

  // Owner templates
  const [templates, setTemplates] = useState<BannerTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);

  // My banners
  const [myBanners, setMyBanners] = useState<Banner[]>([]);
  const [myLoading, setMyLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    banners.templates()
      .then(setTemplates)
      .finally(() => setTemplatesLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "my") {
      setMyLoading(true);
      banners.list()
        .then(setMyBanners)
        .finally(() => setMyLoading(false));
    }
  }, [tab]);

  const handleUpload = async (file: File) => {
    setUploadError("");
    setUploading(true);
    try {
      const result = await banners.upload(file);
      setMyBanners((prev) => [result, ...prev]);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleUpload(file);
  };

  const handleDelete = async (id: number) => {
    await banners.delete(id);
    setMyBanners((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-6">

      {/* ── Page Header ───────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Banners</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse ready-made banners or upload your own designs
          </p>
        </div>
        {tab === "my" && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600
                       text-white text-sm font-semibold rounded-xl
                       transition-all duration-150 shadow-sm hover:shadow-lg hover:shadow-orange-600/20"
          >
            ↑ Upload Banner
          </button>
        )}
      </div>

      {/* ── Tab Switcher ──────────────────────────────── */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1 w-fit shadow-sm">
        <button
          onClick={() => setTab("owner")}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
            tab === "owner"
              ? "bg-orange-500 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
          }`}
        >
          🖼️ Owner Banners
          {templates.length > 0 && (
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
              tab === "owner" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
            }`}>
              {templates.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("my")}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
            tab === "my"
              ? "bg-orange-500 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
          }`}
        >
          📤 My Banners
        </button>
      </div>

      {/* ── Owner Banners Tab ─────────────────────────── */}
      {tab === "owner" && (
        <>
          {templatesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : templates.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🖼️</span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">No banners available yet</h3>
              <p className="text-sm text-gray-500">
                Your owner will upload banner templates. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {templates.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.25 }}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden
                             hover:border-orange-200
                             hover:-translate-y-0.5
                             shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                             hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]
                             transition-all duration-200 group cursor-pointer"
                >
                  {/* Image */}
                  <div className="relative aspect-video overflow-hidden bg-slate-100">
                    <img
                      src={imgSrc(t.thumbnail_url || "")}
                      alt={t.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      onClick={() => setLightbox({ url: imgSrc(t.thumbnail_url || ""), name: t.name })}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://placehold.co/600x340/FFF7ED/F97316?text=Banner";
                      }}
                    />
                    {/* Hover overlay */}
                    <div
                      className="absolute inset-0 bg-orange-500/75 opacity-0 group-hover:opacity-100
                                 transition-opacity duration-200 flex items-center justify-center"
                    >
                      <button
                        onClick={() => setLightbox({ url: imgSrc(t.thumbnail_url || ""), name: t.name })}
                        className="bg-white text-orange-600 text-xs font-bold px-5 py-2.5 rounded-xl shadow-md
                                   hover:scale-105 transition-transform duration-150"
                      >
                        View Full Size
                      </button>
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{t.name}</p>
                      {t.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{t.description}</p>
                      )}
                    </div>
                    <a
                      href={imgSrc(t.thumbnail_url || "")}
                      download={`${t.name}.png`}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400
                                 text-white text-xs font-semibold px-3.5 py-2 rounded-xl
                                 transition-colors duration-150"
                    >
                      ↓ Download
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── My Banners Tab ────────────────────────────── */}
      {tab === "my" && (
        <div className="space-y-5">

          {/* Upload dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
                        transition-all duration-200 ${
              uploading
                ? "border-orange-500/50 bg-orange-50/30 cursor-wait"
                : dragging
                ? "border-orange-400 bg-orange-50 shadow-[0_0_24px_rgba(249,115,22,0.15)]"
                : "border-gray-200 bg-white hover:border-orange-400 hover:bg-orange-50/20"
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4
                            transition-all duration-200 ${
              dragging ? "bg-orange-100" :
              uploading ? "bg-orange-50" : "bg-orange-50"
            }`}>
              {uploading ? (
                <svg className="animate-spin w-6 h-6 text-orange-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <span className="text-2xl">{dragging ? "📥" : "↑"}</span>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-700">
              {uploading ? "Uploading your banner…" : dragging ? "Drop it right here!" : "Drag & drop your banner"}
            </p>
            <p className="text-xs text-gray-500 mt-1.5">
              {uploading ? "Please wait" : "or click to browse · JPG, PNG, GIF, WEBP"}
            </p>
            {uploading && (
              <div className="mt-5 h-1.5 bg-gray-100 rounded-full overflow-hidden w-40 mx-auto">
                <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full animate-pulse w-2/3" />
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />

          {uploadError && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="text-red-500 text-base leading-none">⚠</span>
              <p className="text-red-600 text-sm font-medium">{uploadError}</p>
            </div>
          )}

          {/* Gallery */}
          {myLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : myBanners.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🗂️</span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">No banners uploaded yet</h3>
              <p className="text-sm text-gray-500">Upload your first banner using the area above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {myBanners.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.25 }}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden
                             hover:border-orange-200
                             hover:-translate-y-0.5
                             shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                             hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]
                             transition-all duration-200 group"
                >
                  <div className="relative aspect-video overflow-hidden bg-slate-100">
                    <img
                      src={imgSrc(b.result_url)}
                      alt="My banner"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 cursor-pointer"
                      onClick={() => setLightbox({ url: imgSrc(b.result_url), name: "My Banner" })}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://placehold.co/600x340/FFF7ED/F97316?text=Banner";
                      }}
                    />
                    <div className="absolute inset-0 bg-orange-500/75 opacity-0 group-hover:opacity-100
                                    transition-opacity duration-200 flex items-center justify-center">
                      <button
                        onClick={() => setLightbox({ url: imgSrc(b.result_url), name: "My Banner" })}
                        className="bg-white text-orange-600 text-xs font-bold px-5 py-2.5 rounded-xl shadow-md
                                   hover:scale-105 transition-transform duration-150"
                      >
                        View Full Size
                      </button>
                    </div>
                  </div>

                  <div className="p-4 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-500 font-medium">
                      {new Date(b.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={imgSrc(b.result_url)}
                        download="my-banner.png"
                        className="inline-flex items-center gap-1 bg-orange-500 hover:bg-orange-400
                                   text-white text-xs font-semibold px-3 py-1.5 rounded-lg
                                   transition-colors duration-150"
                      >
                        ↓ Download
                      </a>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="inline-flex items-center gap-1 text-red-500 hover:text-red-600
                                   text-xs font-semibold px-3 py-1.5 rounded-lg
                                   border border-red-200 hover:border-red-300
                                   transition-all duration-150"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Lightbox ───────────────────────────────────── */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-6"
            onClick={() => setLightbox(null)}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-4xl w-full flex flex-col items-center gap-5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setLightbox(null)}
                className="absolute -top-10 right-0 w-8 h-8 flex items-center justify-center
                           text-white/60 hover:text-white bg-white/10 hover:bg-white/20
                           rounded-xl transition-all duration-150"
              >
                ✕
              </button>
              <img
                src={lightbox.url}
                alt={lightbox.name}
                className="w-full rounded-2xl shadow-2xl"
              />
              <div className="flex items-center gap-3">
                <p className="text-white/70 text-sm font-medium">{lightbox.name}</p>
                <a
                  href={lightbox.url}
                  download={`${lightbox.name}.png`}
                  className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600
                             text-white text-sm font-semibold px-6 py-2.5 rounded-xl
                             transition-colors duration-150 shadow-lg"
                >
                  ↓ Download
                </a>
                <button
                  onClick={() => setLightbox(null)}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20
                             text-white text-sm font-semibold px-6 py-2.5 rounded-xl
                             border border-white/20 transition-all duration-150"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
