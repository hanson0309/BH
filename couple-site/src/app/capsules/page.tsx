"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Capsule = {
  id: string;
  title: string;
  unlockAt: string;
  createdByRole: "A" | "B";
  unlocked: boolean;
  content: string | null;
};

function formatDateTimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function daysLeft(unlockAt: string) {
  const now = new Date();
  const target = new Date(unlockAt);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function CapsulesPage() {
  const [items, setItems] = useState<Capsule[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [unlockAt, setUnlockAt] = useState(() => formatDateTimeLocal(new Date(Date.now() + 1000 * 60 * 60 * 24)));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const res = await fetch("/api/capsules");
    if (!res.ok) {
      setError("unauthorized");
      return;
    }
    const data = (await res.json()) as { capsules: Capsule[] };
    setItems(data.capsules);
  }

  useEffect(() => {
    refresh();
  }, []);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => new Date(a.unlockAt).getTime() - new Date(b.unlockAt).getTime());
  }, [items]);

  async function add() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/capsules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, content, unlockAt: new Date(unlockAt).toISOString() }),
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
      setTitle("");
      setContent("");
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/capsules?id=${encodeURIComponent(id)}`, { method: "DELETE" });
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
          <h1 className="text-xl font-semibold">时光胶囊</h1>
          <Link className="text-sm text-zinc-600 hover:text-zinc-900" href="/">
            返回
          </Link>
        </div>

        <div className="mt-4 rounded-2xl border bg-white p-4">
          <div className="grid grid-cols-1 gap-3">
            <label className="block">
              <div className="text-sm text-zinc-600">标题</div>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-600">解锁时间</div>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={unlockAt}
                onChange={(e) => setUnlockAt(e.target.value)}
              />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-600">内容（解锁前对双方都不可见）</div>
              <textarea
                className="mt-1 w-full resize-none rounded-xl border px-3 py-2"
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </label>
          </div>

          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

          <div className="mt-3 flex justify-end">
            <button
              className="rounded-xl bg-black px-3 py-2 text-white disabled:opacity-60"
              disabled={loading}
              onClick={add}
              type="button"
            >
              埋下胶囊
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {sorted.map((c) => {
            const d = daysLeft(c.unlockAt);
            return (
              <div key={c.id} className="rounded-2xl border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-zinc-900">{c.title}</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      解锁：{new Date(c.unlockAt).toLocaleString("zh-CN")}（{c.unlocked ? "已解锁" : `还要 ${d} 天` }）
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">创建者：{c.createdByRole}</div>
                  </div>
                  <button
                    className="text-sm text-zinc-600 hover:text-zinc-900 disabled:opacity-60"
                    disabled={loading}
                    onClick={() => remove(c.id)}
                    type="button"
                  >
                    删除
                  </button>
                </div>

                <div className="mt-3 whitespace-pre-wrap text-sm text-zinc-900">
                  {c.unlocked ? c.content : "未到解锁时间"}
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && <div className="text-sm text-zinc-600">还没有胶囊，埋下第一个吧。</div>}
        </div>
      </div>
    </div>
  );
}
