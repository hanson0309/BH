"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Photo = {
  id: string;
  uploadedByRole: "A" | "B";
  caption: string;
  tags: string[];
  takenAt: string | null;
  contentType: string;
  base64: string;
  width: number | null;
  height: number | null;
  createdAt: string;
};

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function refresh() {
    const res = await fetch("/api/photos");
    if (!res.ok) {
      setError("unauthorized");
      return;
    }
    const data = (await res.json()) as { photos: Photo[] };
    setItems(data.photos);
  }

  useEffect(() => {
    refresh();
  }, []);

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

  const preview = useMemo(() => {
    if (!previewId) return null;
    return items.find((p) => p.id === previewId) ?? null;
  }, [items, previewId]);

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
      await refresh();
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
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">相册</h1>
          <Link className="text-sm text-zinc-600 hover:text-zinc-900" href="/">
            返回
          </Link>
        </div>

        <div className="mt-4 rounded-2xl border bg-white p-4">
          <label className="block">
            <div className="text-sm text-zinc-600">选择照片（Base64 存储，建议小图）</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="mt-1 w-full"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="text-sm text-zinc-600">描述</div>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-600">标签（逗号分隔）</div>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="旅行, 夜景..."
              />
            </label>
          </div>

          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

          <div className="mt-3 flex justify-end">
            <button
              className="rounded-xl bg-black px-3 py-2 text-white disabled:opacity-60"
              disabled={loading}
              onClick={upload}
              type="button"
            >
              上传
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border bg-white p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="text-sm text-zinc-600">按标签筛选</div>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
              >
                <option value="all">全部</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <div className="text-sm text-zinc-600">按月份筛选</div>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="all">全部</option>
                {allMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border bg-white overflow-hidden text-left"
              role="button"
              tabIndex={0}
              onClick={() => setPreviewId(p.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setPreviewId(p.id);
                }
              }}
            >
              <Image
                src={`data:${p.contentType};base64,${p.base64}`}
                alt={p.caption || "photo"}
                className="h-36 w-full object-cover"
                width={600}
                height={400}
              />
              <div className="p-3">
                <div className="text-xs text-zinc-500">{p.uploadedByRole === "A" ? "A" : "B"}</div>
                {p.caption && <div className="mt-1 text-sm text-zinc-900 line-clamp-2">{p.caption}</div>}
                {p.tags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.tags.map((t) => (
                      <span key={t} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex justify-between items-center">
                  <div className="text-[11px] text-zinc-500">{new Date(p.createdAt).toLocaleDateString("zh-CN")}</div>
                  <button
                    className="text-xs text-zinc-600 hover:text-zinc-900 disabled:opacity-60"
                    disabled={loading}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      remove(p.id);
                    }}
                    type="button"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-6 text-sm text-zinc-600">没有符合筛选条件的照片。</div>
        )}

        {preview && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setPreviewId(null)}
            role="presentation"
          >
            <div
              className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white"
              onClick={(e) => e.stopPropagation()}
              role="presentation"
            >
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="text-sm font-medium text-zinc-900">预览</div>
                <button
                  className="text-sm text-zinc-600 hover:text-zinc-900"
                  type="button"
                  onClick={() => setPreviewId(null)}
                >
                  关闭
                </button>
              </div>
              <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
                <div className="bg-zinc-50">
                  <Image
                    src={`data:${preview.contentType};base64,${preview.base64}`}
                    alt={preview.caption || "photo"}
                    width={1200}
                    height={900}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="p-4">
                  <div className="text-xs text-zinc-500">上传者：{preview.uploadedByRole}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    时间：{new Date(preview.createdAt).toLocaleString("zh-CN")}
                  </div>
                  {preview.caption && (
                    <div className="mt-3 whitespace-pre-wrap text-sm text-zinc-900">{preview.caption}</div>
                  )}
                  {preview.tags?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {preview.tags.map((t) => (
                        <button
                          key={t}
                          type="button"
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 hover:bg-zinc-200"
                          onClick={() => {
                            setSelectedTag(t);
                            setPreviewId(null);
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex justify-end">
                    <button
                      className="text-sm text-zinc-600 hover:text-zinc-900 disabled:opacity-60"
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
