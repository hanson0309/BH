"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  name: string;
  birthday: string | null;
  avatar: string;
};

// 浮动爱心组件
function FloatingHeart({ delay, left, size = "1.5rem" }: { delay: string; left: string; size?: string }) {
  return (
    <div
      className="absolute text-pink-400/30 animate-pulse"
      style={{
        left,
        top: "10%",
        animationDelay: delay,
        fontSize: size,
        animationDuration: "3s",
      }}
    >
      💕
    </div>
  );
}

// 浮动粒子效果
function FloatingParticle({ delay, left, color }: { delay: string; left: string; color: string }) {
  return (
    <div
      className="absolute w-2 h-2 rounded-full animate-bounce"
      style={{
        left,
        bottom: "20%",
        backgroundColor: color,
        animationDelay: delay,
        animationDuration: "2s",
      }}
    />
  );
}

export default function EnterPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [role, setRole] = useState<"A" | "B">("A");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<{ A: Profile; B: Profile } | null>(null);
  const [hoveredRole, setHoveredRole] = useState<"A" | "B" | null>(null);

  // 加载资料
  useEffect(() => {
    async function loadProfiles() {
      try {
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ inviteCode: "0302" }),
        });
        if (res.ok) {
          const data = await res.json();
          setProfiles(data);
        }
      } catch {
        // 忽略错误，使用默认显示
      }
    }
    loadProfiles();
  }, []);

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 浮动爱心 */}
        <FloatingHeart delay="0s" left="10%" size="2rem" />
        <FloatingHeart delay="1s" left="20%" size="1.5rem" />
        <FloatingHeart delay="2s" left="80%" size="2.5rem" />
        <FloatingHeart delay="0.5s" left="90%" size="1.8rem" />
        <FloatingHeart delay="1.5s" left="70%" size="1.2rem" />
        <FloatingHeart delay="0.8s" left="30%" size="2rem" />
        
        {/* 渐变光晕 */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-pink-200/50 to-rose-200/50 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-rose-200/40 to-pink-300/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        {/* 浮动粒子 */}
        <FloatingParticle delay="0s" left="15%" color="#f9a8d4" />
        <FloatingParticle delay="0.5s" left="35%" color="#93c5fd" />
        <FloatingParticle delay="1s" left="65%" color="#f9a8d4" />
        <FloatingParticle delay="1.5s" left="85%" color="#93c5fd" />
      </div>

      {/* 主卡片 */}
      <div className="relative w-full max-w-lg mx-4">
        {/* 外发光 */}
        <div className="absolute -inset-2 bg-gradient-to-r from-pink-300 via-rose-300 to-pink-300 rounded-3xl blur-xl opacity-40 animate-pulse" />
        
        <div className="relative bg-white/80 backdrop-blur-md rounded-3xl border-2 border-pink-200 p-8 shadow-2xl">
          {/* 标题区 */}
          <div className="text-center mb-8">
            <div className="flex justify-center items-center gap-2 mb-4">
              <span className="text-3xl animate-bounce">💝</span>
              <span className="text-4xl">💕</span>
              <span className="text-3xl animate-bounce" style={{ animationDelay: "0.2s" }}>💝</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 bg-clip-text text-transparent mb-2">
              甜蜜小屋
            </h1>
            <p className="text-sm text-pink-600/80">
              选择你的身份，开启浪漫之旅 ✨
            </p>
          </div>

          {/* 情侣选择卡片 */}
          <div className="mb-6">
            <div className="flex justify-center items-center gap-4 mb-6">
              {/* A 卡片 */}
              <button
                type="button"
                onClick={() => setRole("A")}
                onMouseEnter={() => setHoveredRole("A")}
                onMouseLeave={() => setHoveredRole(null)}
                className={`relative flex-1 rounded-3xl border-4 p-6 text-center transition-all duration-300 transform ${
                  role === "A"
                    ? "border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100 scale-105 shadow-xl"
                    : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg"
                } ${hoveredRole === "A" && role !== "A" ? "scale-102" : ""}`}
              >
                {/* 选中标记 */}
                {role === "A" && (
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                
                <div className="mb-3 transform transition-transform duration-300">
                  {profiles?.A?.avatar ? (
                    <img
                      src={profiles.A.avatar}
                      alt="A"
                      className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl border-4 border-white shadow-lg bg-gradient-to-br from-blue-400 to-blue-600">👦</div>
                  )}
                </div>
                <div className={`font-bold text-lg mb-1 ${role === "A" ? "text-blue-700" : "text-gray-600"}`}>
                  {profiles?.A?.name || "大雄"}
                </div>
              </button>

              {/* VS / 爱心 中间 */}
              <div className="flex flex-col items-center">
                <div className="text-3xl animate-pulse">💕</div>
                <div className="text-xs text-pink-400 mt-1">&</div>
              </div>

              {/* B 卡片 */}
              <button
                type="button"
                onClick={() => setRole("B")}
                onMouseEnter={() => setHoveredRole("B")}
                onMouseLeave={() => setHoveredRole(null)}
                className={`relative flex-1 rounded-3xl border-4 p-6 text-center transition-all duration-300 transform ${
                  role === "B"
                    ? "border-pink-400 bg-gradient-to-br from-pink-50 to-rose-100 scale-105 shadow-xl"
                    : "border-gray-200 bg-white hover:border-pink-300 hover:shadow-lg"
                } ${hoveredRole === "B" && role !== "B" ? "scale-102" : ""}`}
              >
                {/* 选中标记 */}
                {role === "B" && (
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                
                <div className="mb-3 transform transition-transform duration-300">
                  {profiles?.B?.avatar ? (
                    <img
                      src={profiles.B.avatar}
                      alt="B"
                      className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl border-4 border-white shadow-lg bg-gradient-to-br from-pink-400 to-rose-500">👧</div>
                  )}
                </div>
                <div className={`font-bold text-lg mb-1 ${role === "B" ? "text-pink-700" : "text-gray-600"}`}>
                  {profiles?.B?.name || "静香"}
                </div>
              </button>
            </div>
          </div>

          {/* 邀请码输入 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-pink-700 mb-2 text-center">
              🔐 爱的密码
            </label>
            <div className="relative max-w-xs mx-auto">
              <input
                className={`w-full rounded-2xl border-2 px-4 py-3 text-center text-lg tracking-[0.3em] font-bold text-pink-800 placeholder-pink-300 focus:outline-none focus:ring-4 transition-all bg-white ${
                  error === "invalid_code"
                    ? "border-red-400 focus:border-red-500 focus:ring-red-100 animate-shake"
                    : "border-pink-200 focus:border-pink-400 focus:ring-pink-100"
                }`}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={10}
                placeholder=""
              />
              <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-xl ${error === "invalid_code" ? "text-red-400" : "text-pink-300"}`}>🔐</div>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="rounded-xl bg-red-50 border-2 border-red-200 px-4 py-3 text-sm text-red-600 text-center mb-4 animate-shake">
              {error === "invalid_code" ? "密码不对哦，再试一次吧～" : error === "role_taken" ? "TA已经在线啦！" : "出错了，请重试"}
            </div>
          )}

          {/* 进入按钮 */}
          <button
            className="w-full rounded-2xl bg-gradient-to-r from-rose-400 via-pink-500 to-rose-400 px-4 py-4 text-white font-bold text-lg shadow-xl shadow-pink-200 hover:shadow-2xl hover:shadow-pink-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed"
            disabled={loading || !code.trim()}
            onClick={submit}
            type="button"
          >
            <span className="flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  正在进入...
                </>
              ) : (
                <>
                  <span className="text-xl">💕</span>
                  进入我们的小天地
                  <span className="text-xl">💕</span>
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
