"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">共同待办</h1>
          <Link className="text-sm text-zinc-600 hover:text-zinc-900" href="/">
            返回
          </Link>
        </div>

        <div className="mt-4 rounded-2xl border bg-white p-4">
          <label className="block">
            <div className="text-sm text-zinc-600">新增待办</div>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="比如：一起去看电影 / 周末做饭..."
            />
          </label>

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
          {sorted.map((t) => (
            <div key={t.id} className="rounded-2xl border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <label className="flex items-start gap-3">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={t.done}
                    disabled={loading}
                    onChange={(e) => toggle(t.id, e.target.checked)}
                  />
                  <div>
                    <div className={`text-sm ${t.done ? "line-through text-zinc-500" : "text-zinc-900"}`}>
                      {t.text}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      创建者：{t.createdByRole}
                      {t.done && t.doneByRole ? `，完成者：${t.doneByRole}` : ""}
                    </div>
                  </div>
                </label>

                <button
                  className="text-sm text-zinc-600 hover:text-zinc-900 disabled:opacity-60"
                  disabled={loading}
                  onClick={() => remove(t.id)}
                  type="button"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
          {sorted.length === 0 && <div className="text-sm text-zinc-600">还没有待办，先添加一个吧。</div>}
        </div>
      </div>
    </div>
  );
}
