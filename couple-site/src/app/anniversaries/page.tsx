"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// 爱心图标
function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  );
}

type Anniversary = {
  id: string;
  title: string;
  date: string;
};

function daysUntil(dateStr: string) {
  const now = new Date();
  const target = new Date(dateStr);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diff = startOfTarget.getTime() - startOfToday.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export default function AnniversariesPage() {
  const [items, setItems] = useState<Anniversary[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const res = await fetch("/api/anniversaries");
    if (!res.ok) {
      setError("unauthorized");
      return;
    }
    const data = (await res.json()) as { anniversaries: Anniversary[] };
    setItems(data.anniversaries);
  }

  useEffect(() => {
    refresh();
  }, []);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [items]);

  async function add() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/anniversaries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, date }),
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
      setDate("");
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function remove(idx: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/anniversaries?idx=${idx}`, { method: "DELETE" });
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
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center shadow-lg shadow-pink-200">
              <span className="text-xl">💕</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-rose-600 to-pink-500 bg-clip-text text-transparent">
              纪念日
            </h1>
          </div>
          <Link 
            className="text-sm text-pink-500 hover:text-pink-700 font-medium px-3 py-1.5 rounded-xl hover:bg-pink-50 transition-colors" 
            href="/"
          >
            返回
          </Link>
        </div>

        {/* 添加卡片 */}
        <div className="relative mb-6">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-200 to-pink-200 rounded-3xl blur opacity-50" />
          <div className="relative rounded-2xl bg-white border-2 border-pink-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HeartIcon className="w-5 h-5 text-pink-400" />
              <span className="text-sm font-medium text-pink-700">添加纪念日</span>
            </div>
            
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
              <label className="block">
                <div className="text-sm text-pink-600 mb-2">标题</div>
                <input
                  className="w-full rounded-xl border-2 border-pink-200 px-4 py-2.5 text-pink-900 placeholder-pink-300 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-50 transition-all bg-pink-50/30"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="比如：第一次见面、恋爱纪念日..."
                />
              </label>
              <label className="block">
                <div className="text-sm text-pink-600 mb-2">日期</div>
                <input
                  type="date"
                  className="w-full rounded-xl border-2 border-pink-200 px-4 py-2.5 text-pink-900 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-50 transition-all bg-pink-50/30"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
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
                className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-white font-semibold shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
                disabled={loading || !title.trim() || !date}
                onClick={add}
                type="button"
              >
                <span className="flex items-center gap-1.5">
                  <span>➕</span>
                  {loading ? "添加中..." : "添加纪念日"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 纪念日列表 */}
        <div className="space-y-4">
          {sorted.map((a, idx) => {
            const d = daysUntil(a.date);
            const isToday = d === 0;
            const isPast = d < 0;
            
            return (
              <div 
                key={`${a.id}-${idx}`} 
                className={`relative rounded-2xl border-2 p-5 transition-all ${
                  isToday 
                    ? "bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200" 
                    : "bg-white border-pink-100 hover:border-pink-200 shadow-sm"
                }`}
              >
                {isToday && (
                  <div className="absolute -top-3 left-4 px-3 py-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-md">
                    今天 💕
                  </div>
                )}
                
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-pink-800">{a.title}</div>
                    <div className="mt-1 text-xs text-pink-500">
                      {new Date(a.date).toLocaleDateString("zh-CN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      isToday ? "text-rose-500" : isPast ? "text-pink-300" : "text-pink-500"
                    }`}>
                      {isPast ? Math.abs(d) : d}
                    </div>
                    <div className="text-xs text-pink-400">
                      {isToday ? "就是今天" : isPast ? "天前" : "天后"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    className="text-xs text-pink-400 hover:text-rose-500 disabled:opacity-60 transition-colors"
                    disabled={loading}
                    onClick={() => remove(idx)}
                    type="button"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
          
          {sorted.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">💕</div>
              <p className="text-pink-500/80 text-sm">还没有纪念日，记录你们的甜蜜时刻吧～</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
