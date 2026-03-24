"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { globalCache, fetchProfiles } from "@/lib/globalCache";
import { apiFetchJson } from "@/lib/apiClient";

// 爱心图标
function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  );
}

type Profile = {
  name?: string;
  avatar?: string;
  nickname?: string;
};

type Photo = {
  id: string;
  uploadedByRole: "A" | "B";
  caption: string;
  tags: string[];
  takenAt: string | null;
  contentType: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  createdAt: string;
};

// 照片卡片组件（memo 优化，避免不必要的重渲染）
const PhotoCard = React.memo(function PhotoCard({
  photo,
  getAvatar,
  getDisplayName,
  onClick,
  onRemove,
  loading,
  compact,
}: {
  photo: Photo;
  getAvatar: (role: "A" | "B") => string | undefined;
  getDisplayName: (role: "A" | "B") => string;
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
  loading: boolean;
  compact?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const bounceAnimRef = useRef<Animation | null>(null);

  const setTransform = (transform: string, transition?: string) => {
    const el = cardRef.current;
    if (!el) return;
    bounceAnimRef.current?.cancel();
    el.style.transform = transform;
    el.style.transition = transition ?? "";
  };

  const reset = (immediate = false) => {
    const el = cardRef.current;
    if (!el) return;

    bounceAnimRef.current?.cancel();

    if (immediate) {
      el.style.transition = "";
      el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)";
      return;
    }

    // 可爱一点：回弹时带一点 overshoot + 轻微摇摆
    bounceAnimRef.current = el.animate(
      [
        { transform: el.style.transform || "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)" },
        { transform: "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(-6px) scale(1.06)" },
        { transform: "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(-3px) scale(0.99)" },
        { transform: "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)" },
      ],
      {
        duration: 520,
        easing: "cubic-bezier(0.18, 0.9, 0.22, 1.25)",
        fill: "forwards",
      }
    );
  };

  return (
    <div
      ref={cardRef}
      className="group relative rounded-2xl border-2 border-pink-100 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-pink-200 transition-all cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onPointerEnter={() => reset(true)}
      onPointerMove={(e) => {
        if (e.pointerType === "touch") return;
        const el = cardRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rotateY = (px - 0.5) * 10;
        const rotateX = (0.5 - py) * 10;
        setTransform(
          `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(
            2
          )}deg) translateY(-6px) scale(1.04)`,
          "transform 50ms linear"
        );
      }}
      onPointerDown={() => {
        setTransform(
          "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(0.96)",
          "transform 110ms cubic-bezier(0.2, 0.9, 0.2, 1)"
        );
      }}
      onPointerUp={() => reset()}
      onPointerCancel={() => reset()}
      onPointerLeave={() => reset()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{ transform: "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)", willChange: "transform" }}
    >
      <div className="relative">
        <img
          src={photo.imageUrl}
          alt={photo.caption || "photo"}
          className={compact ? "h-72 w-full object-cover" : "h-36 w-full object-cover"}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-pink-900/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {!compact && (
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            {getAvatar(photo.uploadedByRole) ? (
              <img
                src={getAvatar(photo.uploadedByRole)!}
                alt={getDisplayName(photo.uploadedByRole)}
                width={24}
                height={24}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                photo.uploadedByRole === "A" 
                  ? "bg-gradient-to-br from-pink-400 to-pink-500 text-white" 
                  : "bg-gradient-to-br from-pink-400 to-rose-500 text-white"
              }`}>
                {photo.uploadedByRole}
              </div>
            )}
            <div className="text-[11px] text-pink-400">
              {new Date(photo.createdAt).toLocaleDateString("zh-CN")}
            </div>
          </div>
          {photo.caption && <div className="text-sm text-pink-900 line-clamp-1 mb-2">{photo.caption}</div>}
          {photo.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {photo.tags.slice(0, 2).map((t: string) => (
                <span key={t} className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] text-pink-700">
                  {t}
                </span>
              ))}
              {photo.tags.length > 2 && (
                <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[10px] text-pink-500">
                  +{photo.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      <button
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-pink-400 hover:text-pink-600 hover:bg-white opacity-0 group-hover:opacity-100 transition-all"
        disabled={loading}
        onClick={onRemove}
        type="button"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
});

function fileToBase64(file: File): Promise<{ base64: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return reject(new Error("invalid_result"));
      const comma = result.indexOf(",");
      if (comma === -1) return reject(new Error("invalid_data_url"));
      const meta = result.slice(0, comma);
      const base64 = result.slice(comma + 1);
      const match = /data:(.+);base64/.exec(meta);
      const contentType = match?.[1] ?? "image/*";
      resolve({ base64, contentType });
    };
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

const PHOTOS_PER_PAGE = 9; // 每页显示 9 张照片（3x3 网格）

export default function PhotosPage() {
  const [items, setItems] = useState<Photo[]>([]);
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<{ A: Profile; B: Profile } | null>(null);
  const [displayCount, setDisplayCount] = useState(PHOTOS_PER_PAGE);
  const [activeIndex, setActiveIndex] = useState(0);
  const [stackCount, setStackCount] = useState(5);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const swipeRef = useRef<{ startX: number; startY: number; started: boolean }>({ startX: 0, startY: 0, started: false });
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeOutDir, setSwipeOutDir] = useState<-1 | 0 | 1>(0);
  const [dragOpacity, setDragOpacity] = useState(1);
  const swipePointerIdRef = useRef<number | null>(null);
  const draggedRef = useRef(false);
  const swipeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMoveRef = useRef<{ x: number; t: number }>({ x: 0, t: 0 });
  const lastPreviewTapRef = useRef(0);

  async function refresh(force = false) {
    if (!force && globalCache.photos) {
      setItems(globalCache.photos as Photo[]);
      return;
    }
    try {
      const data = await apiFetchJson<{ photos: Photo[] }>("/api/photos");
      globalCache.photos = data.photos;
      setItems(data.photos);
      setDisplayCount(PHOTOS_PER_PAGE);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unauthorized");
    }
  }

  // 获取用户资料（使用共享函数，自动处理重复请求）
  async function loadProfiles(force = false) {
    const profiles = await fetchProfiles(force);
    if (profiles) {
      setProfiles(profiles as { A: Profile; B: Profile });
    }
  }

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    refresh();
    loadProfiles();
  }, []);

  useEffect(() => {
    const compute = () => {
      const isDesktop = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(min-width: 640px)").matches;
      setStackCount(isDesktop ? 7 : 5);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  // 筛选变化时重置分页
  useEffect(() => {
    setDisplayCount(PHOTOS_PER_PAGE);
    setActiveIndex(0);
  }, [selectedTag, selectedMonth]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const p of items) {
      for (const t of p.tags ?? []) s.add(t);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const allMonths = useMemo(() => {
    const s = new Set<string>();
    for (const p of items) {
      const d = new Date(p.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      s.add(key);
    }
    return Array.from(s).sort((a, b) => b.localeCompare(a));
  }, [items]);

  const filtered = useMemo(() => {
    return sorted.filter((p) => {
      if (selectedTag !== "all" && !(p.tags ?? []).includes(selectedTag)) return false;
      if (selectedMonth !== "all") {
        const d = new Date(p.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (key !== selectedMonth) return false;
      }
      return true;
    });
  }, [sorted, selectedTag, selectedMonth]);

  // 分页显示的照片
  const displayedPhotos = useMemo(() => {
    return filtered.slice(0, displayCount);
  }, [filtered, displayCount]);

  const hasMore = displayedPhotos.length < filtered.length;

  useEffect(() => {
    if (!displayedPhotos.length) {
      if (activeIndex !== 0) setActiveIndex(0);
      return;
    }
    if (activeIndex > displayedPhotos.length - 1) {
      setActiveIndex(displayedPhotos.length - 1);
    }
  }, [displayedPhotos.length, activeIndex]);

  const activePhoto = useMemo(() => {
    return displayedPhotos[activeIndex] ?? null;
  }, [displayedPhotos, activeIndex]);

  const preview = useMemo(() => {
    if (!previewId) return null;
    return items.find((p) => p.id === previewId) ?? null;
  }, [items, previewId]);

  // 获取显示名字（useCallback 缓存函数引用）
  const getDisplayName = useMemo(() => {
    return (role: "A" | "B") => {
      const profile = profiles?.[role];
      return profile?.nickname || profile?.name || (role === "A" ? "👦 A" : "👧 B");
    };
  }, [profiles]);

  // 获取头像
  const getAvatar = useMemo(() => {
    return (role: "A" | "B") => {
      const profile = profiles?.[role];
      return profile?.avatar;
    };
  }, [profiles]);

  function goPrev() {
    setActiveIndex((prev) => Math.max(0, prev - 1));
  }

  function goNext() {
    setActiveIndex((prev) => Math.min(displayedPhotos.length - 1, prev + 1));
  }

  useEffect(() => {
    return () => {
      if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current);
    };
  }, []);

  function resetDrag(immediate = false) {
    draggedRef.current = false;
    swipePointerIdRef.current = null;
    swipeRef.current.started = false;
    setIsDragging(false);
    setSwipeOutDir(0);
    setDragOpacity(1);
    if (immediate) {
      setDragX(0);
      setDragY(0);
      return;
    }
    setDragX(0);
    setDragY(0);
  }

  function onStackPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (swipeOutDir !== 0) return;
    swipeRef.current = { startX: e.clientX, startY: e.clientY, started: true };
    swipePointerIdRef.current = e.pointerId;
    draggedRef.current = false;
    setIsDragging(true);
    setDragX(0);
    setDragY(0);
    setDragOpacity(1);
    lastMoveRef.current = { x: e.clientX, t: performance.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onStackPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!swipeRef.current.started) return;
    if (swipePointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - swipeRef.current.startX;
    const dy = e.clientY - swipeRef.current.startY;

    if (!draggedRef.current) {
      if (Math.abs(dy) > Math.abs(dx) + 6) {
        resetDrag(true);
        return;
      }
      if (Math.abs(dx) > 6) draggedRef.current = true;
    }

    setDragX(dx);
    setDragY(dy * 0.15);
    setDragOpacity(1 - Math.min(0.35, Math.abs(dx) / 520));
    lastMoveRef.current = { x: e.clientX, t: performance.now() };
  }

  function onStackPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!swipeRef.current.started) return;
    if (swipePointerIdRef.current !== e.pointerId) return;

    const dx = e.clientX - swipeRef.current.startX;
    const dy = e.clientY - swipeRef.current.startY;
    swipeRef.current.started = false;
    swipePointerIdRef.current = null;
    setIsDragging(false);

    if (Math.abs(dy) > Math.abs(dx) + 6) {
      resetDrag();
      return;
    }

    const threshold = 80;
    const now = performance.now();
    const dt = Math.max(1, now - lastMoveRef.current.t);
    const vx = (e.clientX - lastMoveRef.current.x) / dt; // px/ms
    const projected = dx + vx * 280; // inertia projection
    const dir: -1 | 0 | 1 = projected > threshold ? 1 : projected < -threshold ? -1 : 0;

    const canGoPrev = dir === 1 && activeIndex > 0;
    const canGoNext = dir === -1 && activeIndex < displayedPhotos.length - 1;
    if (canGoPrev || canGoNext) {
      const outDir: -1 | 1 = canGoPrev ? 1 : -1;
      setSwipeOutDir(outDir);
      const absOut = Math.min(720, Math.max(420, Math.abs(projected)));
      setDragX(outDir * absOut);
      setDragY(0);
      setDragOpacity(0);
      swipeTimeoutRef.current = setTimeout(() => {
        if (outDir === 1) goPrev();
        else goNext();
        resetDrag(true);
      }, 220);
      return;
    }

    resetDrag();
  }

  async function upload() {
    if (!file) {
      setError("no_file");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { base64, contentType } = await fileToBase64(file);
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10);

      await apiFetchJson<unknown>("/api/photos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caption,
          tags: tagList,
          contentType,
          base64,
        }),
      });

      setCaption("");
      setTags("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refresh(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    setLoading(true);
    setError(null);
    try {
      await apiFetchJson<unknown>(`/api/photos?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await refresh(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setLoading(false);
    }
  }

  function loadMore() {
    setDisplayCount((prev) => prev + PHOTOS_PER_PAGE);
  }

  return (
    <div className="min-h-screen py-8 pt-16">
      <div className="mx-auto w-full max-w-2xl px-4">
        {/* 标题区 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 to-pink-400 flex items-center justify-center shadow-lg shadow-pink-200">
              <span className="text-xl">📷</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent">
              甜蜜相册
            </h1>
          </div>
          <Link 
            className="text-sm text-pink-500 hover:text-pink-700 font-medium px-3 py-1.5 rounded-xl hover:bg-pink-50 transition-colors" 
            href="/"
          >
            返回
          </Link>
        </div>

        {/* 上传卡片 */}
        <div className="relative mb-6">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-200 to-pink-200 rounded-3xl blur opacity-50" />
          <div className="relative rounded-2xl bg-white border-2 border-pink-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HeartIcon className="w-5 h-5 text-rose-400" />
              <span className="text-sm font-medium text-pink-700">记录美好瞬间</span>
            </div>
            
            <label className="block mb-4">
              <div className="text-sm text-pink-600 mb-2">选择照片</div>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="w-full rounded-xl border-2 border-pink-200 px-4 py-3 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
              <label className="block">
                <div className="text-sm text-pink-600 mb-2">描述</div>
                <input
                  className="w-full rounded-xl border-2 border-pink-200 px-4 py-2.5 text-pink-900 placeholder-pink-300 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-50 transition-all bg-pink-50/30"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="写下照片背后的故事..."
                />
              </label>
              <label className="block">
                <div className="text-sm text-pink-600 mb-2">标签</div>
                <input
                  className="w-full rounded-xl border-2 border-pink-200 px-4 py-2.5 text-pink-900 placeholder-pink-300 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-50 transition-all bg-pink-50/30"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="旅行, 美食, 日常..."
                />
              </label>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                className="rounded-xl bg-gradient-to-r from-pink-500 to-pink-500 px-5 py-2.5 text-white font-semibold shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
                disabled={loading || !file}
                onClick={upload}
                type="button"
              >
                <span className="flex items-center gap-1.5">
                  <span>📷</span>
                  {loading ? "上传中..." : "上传照片"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 筛选区 */}
        {items.length > 0 && (
          <div className="relative mb-6">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-100 to-pink-100 rounded-2xl blur opacity-30" />
            <div className="relative rounded-2xl bg-white/80 border-2 border-pink-100 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <div className="text-sm text-pink-600 mb-2">按标签筛选</div>
                  <select
                    className="w-full rounded-xl border-2 border-pink-200 px-4 py-2.5 text-pink-900 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-50 transition-all bg-pink-50/30"
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                  >
                    <option value="all">全部标签</option>
                    {allTags.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <div className="text-sm text-pink-600 mb-2">按月份筛选</div>
                  <select
                    className="w-full rounded-xl border-2 border-pink-200 px-4 py-2.5 text-pink-900 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-50 transition-all bg-pink-50/30"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    <option value="all">全部时间</option>
                    {allMonths.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 照片网格 - 分页优化 */}
        {displayedPhotos.length > 0 && (
          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-pink-500/80">
                {activeIndex + 1}/{displayedPhotos.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-pink-100 hover:bg-pink-200 px-3 py-2 text-sm text-pink-700 font-medium transition-colors disabled:opacity-50"
                  disabled={loading || activeIndex <= 0}
                  onClick={goPrev}
                >
                  上一张
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-pink-100 hover:bg-pink-200 px-3 py-2 text-sm text-pink-700 font-medium transition-colors disabled:opacity-50"
                  disabled={loading || activeIndex >= displayedPhotos.length - 1}
                  onClick={goNext}
                >
                  下一张
                </button>
              </div>
            </div>

            <div className="relative h-[340px] w-full">
              {displayedPhotos
                .slice(activeIndex, activeIndex + stackCount)
                .map((p, idx) => {
                  const z = 50 - idx;
                  const scale = 1 - idx * 0.06;
                  const tx = idx * 18;
                  const rot = idx % 2 === 0 ? -6 - idx * 1.2 : 6 + idx * 1.2;
                  const ty = idx * 10;
                  const dragScale = idx === 0 ? (isDragging ? 1.02 : swipeOutDir !== 0 ? 1.01 : 1) : 1;
                  const dragRot = idx === 0 ? dragX * 0.03 : 0;
                  const dragTx = idx === 0 ? dragX : 0;
                  const dragTy = idx === 0 ? dragY : 0;
                  const transition = idx === 0 && isDragging ? "none" : "transform 320ms cubic-bezier(0.18, 0.9, 0.18, 1), opacity 260ms ease";
                  const opacity = idx === 0 ? dragOpacity : 1;

                  return (
                    <div
                      key={p.id}
                      className="absolute left-1/2 top-1/2 w-[88%] sm:w-[420px]"
                      onPointerDown={idx === 0 ? onStackPointerDown : undefined}
                      onPointerMove={idx === 0 ? onStackPointerMove : undefined}
                      onPointerUp={idx === 0 ? onStackPointerUp : undefined}
                      onPointerCancel={idx === 0 ? () => resetDrag(true) : undefined}
                      style={{
                        zIndex: z,
                        transform: `translate(-50%, -50%) translateX(${tx + dragTx}px) translateY(${ty + dragTy}px) rotate(${rot + dragRot}deg) scale(${scale * dragScale})`,
                        transformOrigin: "center",
                        transition,
                        opacity,
                        touchAction: idx === 0 ? "pan-y" : undefined,
                        cursor: idx === 0 ? (isDragging ? "grabbing" : "grab") : undefined,
                      }}
                    >
                      <PhotoCard
                        photo={p}
                        getAvatar={getAvatar}
                        getDisplayName={getDisplayName}
                        compact
                        onClick={() => {
                          if (idx === 0 && draggedRef.current) return;
                          setPreviewId(p.id);
                        }}
                        onRemove={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          remove(p.id);
                        }}
                        loading={loading}
                      />
                    </div>
                  );
                })}
            </div>

          </div>
        )}

        {/* 加载更多 */}
        {hasMore && (
          <div className="mt-6 text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="rounded-xl bg-pink-100 hover:bg-pink-200 px-6 py-2 text-sm text-pink-700 font-medium transition-colors disabled:opacity-60"
            >
              {loading ? "加载中..." : `加载更多 (${filtered.length - displayedPhotos.length} 张)`}
            </button>
          </div>
        )}

        {filtered.length === 0 && items.length > 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-pink-500/80 text-sm">没有符合筛选条件的照片</p>
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📷</div>
            <p className="text-pink-500/80 text-sm">还没有照片，上传第一张美好回忆吧～</p>
          </div>
        )}

        {/* 预览弹窗 */}
        {preview && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setPreviewId(null)}
            role="presentation"
          >
            <div
              className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="presentation"
            >
              <div className="flex items-center justify-between border-b border-pink-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <HeartIcon className="w-5 h-5 text-rose-400" />
                  <span className="font-semibold text-pink-800">照片预览</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2">
                <div
                  className="bg-gradient-to-br from-pink-50 to-pink-50 flex items-center justify-center"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    const now = Date.now();
                    if (now - lastPreviewTapRef.current < 320) {
                      lastPreviewTapRef.current = 0;
                      setPreviewId(null);
                      return;
                    }
                    lastPreviewTapRef.current = now;
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    const now = Date.now();
                    if (now - lastPreviewTapRef.current < 320) {
                      lastPreviewTapRef.current = 0;
                      setPreviewId(null);
                      return;
                    }
                    lastPreviewTapRef.current = now;
                  }}
                >
                  <img
                    src={preview.imageUrl}
                    alt={preview.caption || "photo"}
                    className="max-h-[60vh] w-auto object-contain"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    {getAvatar(preview.uploadedByRole) ? (
                      <img
                        src={getAvatar(preview.uploadedByRole)!}
                        alt={getDisplayName(preview.uploadedByRole)}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        preview.uploadedByRole === "A" 
                          ? "bg-gradient-to-br from-pink-400 to-pink-500 text-white" 
                          : "bg-gradient-to-br from-pink-400 to-rose-500 text-white"
                      }`}>
                        {preview.uploadedByRole}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-pink-800">
                        上传者：{getDisplayName(preview.uploadedByRole)}
                      </div>
                      <div className="text-xs text-pink-400">
                        {new Date(preview.createdAt).toLocaleString("zh-CN")}
                      </div>
                    </div>
                  </div>
                  
                  {preview.caption && (
                    <div className="mb-4">
                      <div className="text-xs text-pink-500 mb-1">描述</div>
                      <div className="whitespace-pre-wrap text-sm text-pink-900 bg-pink-50 rounded-xl p-3">
                        {preview.caption}
                      </div>
                    </div>
                  )}
                  
                  {preview.tags?.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-pink-500 mb-2">标签</div>
                      <div className="flex flex-wrap gap-2">
                        {preview.tags.map((t: string) => (
                          <button
                            key={t}
                            type="button"
                            className="rounded-full bg-pink-100 px-3 py-1 text-xs text-pink-700 hover:bg-pink-200 transition-colors"
                            onClick={() => {
                              setSelectedTag(t);
                              setPreviewId(null);
                            }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded-xl bg-gradient-to-r from-red-400 to-rose-400 px-4 py-2 text-sm text-white font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
                      disabled={loading}
                      onClick={async () => {
                        await remove(preview.id);
                        setPreviewId(null);
                      }}
                      type="button"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
