"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// 信封图标
function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

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

  const lockedCount = useMemo(() => items.filter(i => !i.unlocked).length, [items]);

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
    <div className="min-h-screen py-8 pt-16">
      <div className="mx-auto w-full max-w-2xl px-4">
        {/* 标题区 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 to-pink-400 flex items-center justify-center shadow-lg shadow-pink-200">
              <span className="text-xl">💌</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent">
                时光胶囊
              </h1>
              <p className="text-xs text-pink-500/80">
                {lockedCount} 个待开启 💕
              </p>
            </div>
          </div>
          <Link 
            className="text-sm text-pink-500 hover:text-pink-700 font-medium px-3 py-1.5 rounded-xl hover:bg-pink-50 transition-colors" 
            href="/"
          >
            返回
          </Link>
        </div>

        {/* 创建卡片 */}
        <div className="relative mb-6">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-200 to-pink-200 rounded-3xl blur opacity-50" />
          <div className="relative rounded-2xl bg-white border-2 border-pink-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <EnvelopeIcon className="w-5 h-5 text-pink-400" />
              <span className="text-sm font-medium text-pink-700">埋下一个时光胶囊</span>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <label className="block">
                <div className="text-sm text-pink-600 mb-2">标题</div>
                <input
                  className="w-full rounded-xl border-2 border-pink-200 px-4 py-2.5 text-pink-900 placeholder-pink-300 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-50 transition-all bg-pink-50/30"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="给未来的我们..."
                />
              </label>
              <label className="block">
                <div className="text-sm text-pink-600 mb-2">解锁时间</div>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border-2 border-pink-200 px-4 py-2.5 text-pink-900 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-50 transition-all bg-pink-50/30"
                  value={unlockAt}
                  onChange={(e) => setUnlockAt(e.target.value)}
                />
              </label>
              <label className="block">
                <div className="text-sm text-pink-600 mb-2">内容（解锁前对双方都不可见）</div>
                <textarea
                  className="w-full resize-none rounded-xl border-2 border-pink-200 px-4 py-3 text-pink-900 placeholder-pink-300 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-50 transition-all bg-pink-50/30"
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="写下想对未来说的悄悄话..."
                />
              </label>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mt-4">
                {error}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                className="rounded-xl bg-gradient-to-r from-pink-500 to-pink-500 px-5 py-2.5 text-white font-semibold shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
                disabled={loading || !title.trim() || !content.trim()}
                onClick={add}
                type="button"
              >
                <span className="flex items-center gap-1.5">
                  <span>💌</span>
                  {loading ? "埋下中..." : "埋下胶囊"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 胶囊列表 */}
        <div className="space-y-4">
          {sorted.map((c) => {
            const d = daysLeft(c.unlockAt);
            return (
              <div 
                key={c.id} 
                className={`relative rounded-2xl border-2 p-5 transition-all ${
                  c.unlocked 
                    ? "bg-gradient-to-br from-pink-50 to-pink-50 border-pink-200" 
                    : "bg-white border-pink-100 hover:border-pink-200 shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      c.unlocked ? "bg-gradient-to-br from-pink-400 to-pink-400" : "bg-pink-100"
                    }`}>
                      {c.unlocked ? "💌" : "🔒"}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-pink-800">{c.title}</div>
                      <div className="mt-1 text-xs text-pink-500">
                        {c.unlocked ? (
                          <span className="text-rose-500 font-medium">✓ 已解锁</span>
                        ) : (
                          <span>还要 {d} 天解锁</span>
                        )}
                        <span className="mx-1">·</span>
                        <span>{new Date(c.unlockAt).toLocaleString("zh-CN")}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-pink-400">
                        创建者：{c.createdByRole === "A" ? "👦 A" : "👧 B"}
                      </div>
                    </div>
                  </div>
                  <button
                    className="text-xs text-pink-400 hover:text-rose-500 disabled:opacity-60 transition-colors"
                    disabled={loading}
                    onClick={() => remove(c.id)}
                    type="button"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className={`mt-4 rounded-xl p-4 ${
                  c.unlocked 
                    ? "bg-white/80 border border-pink-100" 
                    : "bg-pink-50/50 border border-pink-100 border-dashed"
                }`}>
                  {c.unlocked ? (
                    <div className="whitespace-pre-wrap text-sm text-pink-900">{c.content}</div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-2xl mb-2">🔒</div>
                      <div className="text-sm text-pink-400">未到解锁时间，耐心等待哦～</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {sorted.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">💌</div>
              <p className="text-pink-500/80 text-sm">还没有胶囊，埋下第一个给未来的惊喜吧～</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
