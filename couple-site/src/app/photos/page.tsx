"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

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
}: {
  photo: Photo;
  getAvatar: (role: "A" | "B") => string | undefined;
  getDisplayName: (role: "A" | "B") => string;
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
  loading: boolean;
}) {
  return (
    <div
      className="group relative rounded-2xl border-2 border-pink-100 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-pink-200 transition-all cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="relative">
        <Image
          src={photo.imageUrl}
          alt={photo.caption || "photo"}
          className="h-36 w-full object-cover"
          width={600}
          height={400}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-pink-900/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          {getAvatar(photo.uploadedByRole) ? (
            <Image
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

import { globalCache, fetchProfiles } from "@/lib/globalCache";

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function refresh(force = false) {
    if (!force && globalCache.photos) {
      setItems(globalCache.photos as Photo[]);
      return;
    }
    const res = await fetch("/api/photos");
    if (!res.ok) {
      setError("unauthorized");
      return;
    }
    const data = (await res.json()) as { photos: Photo[] };
    globalCache.photos = data.photos;
    setItems(data.photos);
    setDisplayCount(PHOTOS_PER_PAGE);
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

  // 筛选变化时重置分页
  useEffect(() => {
    setDisplayCount(PHOTOS_PER_PAGE);
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

      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caption,
          tags: tagList,
          contentType,
          base64,
        }),
      });

      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null);
        if (data && typeof data === "object" && "error" in data) {
          const err = (data as { error?: unknown }).error;
          setError(typeof err === "string" ? err : "error");
        } else {
          setError("error");
        }
        return;
      }

      setCaption("");
      setTags("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refresh(true);
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/photos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null);
        if (data && typeof data === "object" && "error" in data) {
          const err = (data as { error?: unknown }).error;
          setError(typeof err === "string" ? err : "error");
        } else {
          setError("error");
        }
        return;
      }
      await refresh(true);
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {displayedPhotos.map((p) => (
            <PhotoCard
              key={p.id}
              photo={p}
              getAvatar={getAvatar}
              getDisplayName={getDisplayName}
              onClick={() => setPreviewId(p.id)}
              onRemove={(e) => {
                e.preventDefault();
                e.stopPropagation();
                remove(p.id);
              }}
              loading={loading}
            />
          ))}
        </div>

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
                <button
                  className="w-8 h-8 rounded-full hover:bg-pink-50 flex items-center justify-center text-pink-500 transition-colors"
                  type="button"
                  onClick={() => setPreviewId(null)}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2">
                <div className="bg-gradient-to-br from-pink-50 to-pink-50 flex items-center justify-center">
                  <Image
                    src={preview.imageUrl}
                    alt={preview.caption || "photo"}
                    width={1200}
                    height={900}
                    className="max-h-[60vh] w-auto object-contain"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    {getAvatar(preview.uploadedByRole) ? (
                      <Image
                        src={getAvatar(preview.uploadedByRole)!}
                        alt={getDisplayName(preview.uploadedByRole)}
                        width={40}
                        height={40}
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
                      className="rounded-xl px-4 py-2 text-sm text-pink-600 hover:bg-pink-50 transition-colors"
                      onClick={() => setPreviewId(null)}
                      type="button"
                    >
                      关闭
                    </button>
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
