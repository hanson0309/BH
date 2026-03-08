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

type Todo = {
  id: string;
  text: string;
  done: boolean;
  createdByRole: "A" | "B";
  doneByRole: "A" | "B" | null;
  doneAt: string | null;
  createdAt: string;
};

export default function TodosPage() {
  const [items, setItems] = useState<Todo[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const res = await fetch("/api/todos");
    if (!res.ok) {
      setError("unauthorized");
      return;
    }
    const data = (await res.json()) as { todos: Todo[] };
    setItems(data.todos);
  }

  useEffect(() => {
    refresh();
  }, []);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [items]);

  const completedCount = useMemo(() => items.filter(i => i.done).length, [items]);
  const totalCount = items.length;

  async function add() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
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
      setText("");
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function toggle(id: string, done: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/todos", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, done }),
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
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/todos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
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
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center shadow-lg shadow-pink-200">
              <span className="text-xl">📝</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent">
                甜蜜待办
              </h1>
              <p className="text-xs text-pink-500/80">
                {completedCount}/{totalCount} 已完成 💕
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

        {/* 添加卡片 */}
        <div className="relative mb-6">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-200 to-rose-200 rounded-3xl blur opacity-50" />
          <div className="relative rounded-2xl bg-white border-2 border-pink-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HeartIcon className="w-5 h-5 text-rose-400" />
              <span className="text-sm font-medium text-pink-700">添加新任务</span>
            </div>
            
            <label className="block mb-4">
              <input
                className="w-full rounded-xl border-2 border-pink-200 px-4 py-3 text-pink-900 placeholder-pink-300 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-50 transition-all bg-pink-50/30"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="比如：一起去看电影、周末做饭..."
              />
            </label>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-2.5 text-white font-semibold shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
                disabled={loading || !text.trim()}
                onClick={add}
                type="button"
              >
                <span className="flex items-center gap-1.5">
                  <span>➕</span>
                  {loading ? "添加中..." : "添加任务"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 待办列表 */}
        <div className="space-y-3">
          {sorted.map((t) => (
            <div 
              key={t.id} 
              className={`rounded-2xl border-2 p-4 transition-all ${
                t.done 
                  ? "bg-pink-50/50 border-pink-100" 
                  : "bg-white border-pink-100 hover:border-pink-200 shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="relative mt-0.5">
                    <input
                      className="peer sr-only"
                      type="checkbox"
                      checked={t.done}
                      disabled={loading}
                      onChange={(e) => toggle(t.id, e.target.checked)}
                    />
                    <div className={`w-5 h-5 rounded-lg border-2 transition-all ${
                      t.done
                        ? "bg-gradient-to-br from-pink-400 to-rose-500 border-transparent"
                        : "border-pink-300 peer-hover:border-pink-400"
                    }`}>
                      {t.done && (
                        <svg className="w-3 h-3 text-white m-auto mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className={`text-sm transition-all ${t.done ? "line-through text-pink-400" : "text-pink-900"}`}>
                      {t.text}
                    </div>
                    <div className="mt-1 text-xs text-pink-400">
                      创建者：{t.createdByRole === "A" ? "👦 A" : "👧 B"}
                      {t.done && t.doneByRole && (
                        <span className="ml-2 text-rose-500">
                          ✓ 完成者：{t.doneByRole === "A" ? "👦 A" : "👧 B"}
                        </span>
                      )}
                    </div>
                  </div>
                </label>

                <button
                  className="text-xs text-pink-400 hover:text-rose-500 disabled:opacity-60 transition-colors"
                  disabled={loading}
                  onClick={() => remove(t.id)}
                  type="button"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          
          {sorted.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-pink-500/80 text-sm">还没有待办，一起规划甜蜜的小目标吧～</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
