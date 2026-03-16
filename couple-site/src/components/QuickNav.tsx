"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useCallback } from "react";

const NAV_ITEMS = [
  { href: "/", label: "首页", icon: "🏠" },
  { href: "/profile", label: "个人", icon: "👤" },
  { href: "/diary", label: "日记", icon: "📔" },
  { href: "/anniversaries", label: "纪念日", icon: "💕" },
  { href: "/todos", label: "待办", icon: "📝" },
  { href: "/capsules", label: "胶囊", icon: "💌" },
  { href: "/photos", label: "相册", icon: "📷" },
];

export default function QuickNav() {
  const pathname = usePathname();
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const navigate = useCallback((href: string) => {
    // 关闭菜单
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
    // 预加载并导航
    router.prefetch(href);
    router.push(href);
  }, [router]);

  // 登录/进入页面不显示导航
  if (pathname === "/enter" || pathname === "/login") {
    return null;
  }

  function handleLogout() {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
    window.location.href = "/api/logout";
  }

  return (
    <div className="fixed top-4 left-4 z-50">
      <details ref={detailsRef} className="group rounded-xl bg-white/90 backdrop-blur-sm border border-pink-200 shadow-lg overflow-hidden">
        <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-pink-50/50 transition-colors select-none">
          <span className="text-lg">🧭</span>
          <svg
            className="w-4 h-4 text-pink-400 transition-transform group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="p-2 pt-0 grid grid-cols-3 gap-1 min-w-[180px]">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                  isActive 
                    ? "bg-gradient-to-br from-pink-100 to-rose-100 text-pink-700 shadow-sm" 
                    : "hover:bg-pink-50 text-pink-600"
                }`}
              >
                <span className={`text-xl ${isActive ? "scale-110" : ""} transition-transform`}>
                  {item.icon}
                </span>
                <span className={`text-[10px] mt-0.5 ${isActive ? "font-medium text-pink-700" : "text-pink-500"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="p-2 border-t border-pink-100">
          <button
            onClick={handleLogout}
            className="w-full text-xs text-pink-500 hover:text-pink-700 hover:bg-pink-50 py-1.5 rounded transition-colors"
          >
            退出登录
          </button>
        </div>
      </details>
    </div>
  );
}
