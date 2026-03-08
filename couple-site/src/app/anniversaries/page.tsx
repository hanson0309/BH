"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">纪念日倒计时</h1>
          <Link className="text-sm text-zinc-600 hover:text-zinc-900" href="/">
            返回
          </Link>
        </div>

        <div className="mt-4 rounded-2xl border bg-white p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="text-sm text-zinc-600">标题</div>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-600">日期</div>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
              添加
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {sorted.map((a, idx) => {
            const d = daysUntil(a.date);
            return (
              <div key={`${a.id}-${idx}`} className="rounded-2xl border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-zinc-900">{a.title}</div>
                    <div className="mt-1 text-xs text-zinc-500">{new Date(a.date).toLocaleDateString("zh-CN")}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{d}</div>
                    <div className="text-xs text-zinc-500">天</div>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    className="text-sm text-zinc-600 hover:text-zinc-900 disabled:opacity-60"
                    disabled={loading}
                    onClick={() => remove(idx)}
                    type="button"
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && <div className="text-sm text-zinc-600">还没有纪念日，先添加一个吧。</div>}
        </div>
      </div>
    </div>
  );
}
