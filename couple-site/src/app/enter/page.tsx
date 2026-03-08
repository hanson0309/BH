"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EnterPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [role, setRole] = useState<"A" | "B">("A");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/enter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, role }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as unknown;
        if (data && typeof data === "object" && "error" in data) {
          const err = (data as { error?: unknown }).error;
          setError(typeof err === "string" ? err : "error");
        } else {
          setError("error");
        }
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">进入情侣空间</h1>
        <p className="mt-2 text-sm text-zinc-600">输入固定邀请码，然后选择你的身份。</p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <div className="text-sm text-zinc-600">邀请码</div>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={role === "A"}
                onChange={() => setRole("A")}
                name="role"
              />
              我是 A
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={role === "B"}
                onChange={() => setRole("B")}
                name="role"
              />
              我是 B
            </label>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            className="w-full rounded-xl bg-black px-3 py-2 text-white disabled:opacity-60"
            disabled={loading}
            onClick={submit}
            type="button"
          >
            {loading ? "处理中..." : "进入"}
          </button>
        </div>
      </div>
    </div>
  );
}
