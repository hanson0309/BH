"use client";



import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";



interface PartnerPresence {

  isOnline: boolean;

  lastSeenText: string;

  partnerRole: "A" | "B";

  partnerName: string;

}



// 节流函数 - 限制函数执行频率

function throttle<T extends (...args: unknown[]) => unknown>(

  func: T,

  limit: number

): (...args: Parameters<T>) => void {

  let inThrottle = false;

  return (...args: Parameters<T>) => {

    if (!inThrottle) {

      func(...args);

      inThrottle = true;

      setTimeout(() => (inThrottle = false), limit);

    }

  };

}



export default function PresenceIndicator() {

  const [presence, setPresence] = useState<PartnerPresence | null>(null);

  const [error, setError] = useState<string | null>(null);

  const initialized = useRef(false);

  const lastHeartbeat = useRef<number>(0);

  const isVisible = useRef(true);

  const pathname = usePathname();

  // 登录页面不显示 PresenceIndicator

  if (pathname === "/enter") {

    return null;

  }



  // 发送心跳 - 更新自己的在线状态

  const sendHeartbeat = useCallback(async () => {

    try {

      await fetch("/api/presence", { method: "POST" });

      lastHeartbeat.current = Date.now();

    } catch (err) {

      console.error("Heartbeat failed:", err);

    }

  }, []);





  // 节流版心跳 - 最小间隔 2 分钟

  const throttledHeartbeat = useCallback(

    throttle(() => {

      // 只有距离上次心跳超过 1 分 50 秒才发送

      if (Date.now() - lastHeartbeat.current > 110000) {

        sendHeartbeat();

      }

    }, 120000),

    [sendHeartbeat]

  );





  // 获取伴侣的在线状态

  const checkPartnerStatus = useCallback(async () => {

    // 页面不可见时不检查

    if (!isVisible.current) return;

    

    try {

      const res = await fetch("/api/presence");

      if (!res.ok) {

        if (res.status === 401) return;

        throw new Error(`Failed to fetch: ${res.status}`);

      }

      const data = await res.json();

      setPresence(data);

      setError(null);

    } catch (err) {

      console.error("Failed to check partner status:", err);

    }

  }, []);





  useEffect(() => {

    if (initialized.current) return;

    initialized.current = true;

    

    // 立即执行一次

    sendHeartbeat();

    checkPartnerStatus();





    // 每2分钟轮询一次

    const heartbeatInterval = setInterval(() => {

      if (isVisible.current) {

        sendHeartbeat();

      }

    }, 120000);





    const checkInterval = setInterval(checkPartnerStatus, 120000);





    // 页面可见性变化

    const handleVisibilityChange = () => {

      const visible = document.visibilityState === "visible";

      isVisible.current = visible;

      if (visible) {

        sendHeartbeat();

        checkPartnerStatus();

      }

    };





    document.addEventListener("visibilitychange", handleVisibilityChange);





    // 页面活动事件 - 使用节流，最多每2分钟一次

    const handleActivity = () => {

      throttledHeartbeat();

    };





    window.addEventListener("click", handleActivity);

    window.addEventListener("keydown", handleActivity);

    window.addEventListener("scroll", handleActivity, { passive: true });





    return () => {

      clearInterval(heartbeatInterval);

      clearInterval(checkInterval);

      document.removeEventListener("visibilitychange", handleVisibilityChange);

      window.removeEventListener("click", handleActivity);

      window.removeEventListener("keydown", handleActivity);

      window.removeEventListener("scroll", handleActivity);

    };

  }, [sendHeartbeat, checkPartnerStatus, throttledHeartbeat]);





  if (!presence) {

    return (

      <div className="flex items-center gap-2 text-gray-400 text-sm">

        <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />

        <span>加载中...</span>

      </div>

    );

  }







  const displayName = presence.partnerName;





  return (

    <div className="flex items-center gap-2">

      {presence.isOnline ? (

        <>

          <span className="relative flex h-3 w-3">

            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />

            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />

          </span>

          <span className="text-green-600 text-sm font-medium">{displayName} 在线</span>

        </>

      ) : (

        <>

          <span className="w-2 h-2 rounded-full bg-gray-400" />

          <span className="text-gray-500 text-sm">

            {displayName} 离线 · {presence.lastSeenText || "未知"}

          </span>

        </>

      )}

    </div>

  );

}
