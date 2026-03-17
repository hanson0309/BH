"use client";

import { useEffect, useState } from "react";

interface TogetherTimerProps {
  since: string;
}

interface TimeDiff {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeDiff(since: string): TimeDiff {
  const start = new Date(since).getTime();
  const now = Date.now();
  const diff = now - start;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

function pad(num: number): string {
  return num.toString().padStart(2, "0");
}

export default function TogetherTimer({ since }: TogetherTimerProps) {
  const [time, setTime] = useState<TimeDiff | null>(null);
  const [mounted, setMounted] = useState(false);

  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };
    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    setMounted(true);
    setTime(calculateTimeDiff(since));

    // 页面不可见时不启动/暂停更新，减少耗电
    if (!isVisible) {
      return;
    }

    const timer = setInterval(() => {
      setTime(calculateTimeDiff(since));
    }, 1000);

    return () => clearInterval(timer);
  }, [since, isVisible]);

  // 避免 hydration mismatch，首次渲染显示占位符
  if (!mounted || !time) {
    return (
      <div className="grid grid-cols-4 gap-3 text-center">
        <div className="flex flex-col items-center">
          <div className="text-3xl sm:text-4xl font-bold text-pink-700">-</div>
          <div className="text-xs text-pink-500 mt-1">天</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-3xl sm:text-4xl font-bold text-pink-700">-</div>
          <div className="text-xs text-pink-500 mt-1">时</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-3xl sm:text-4xl font-bold text-pink-700">-</div>
          <div className="text-xs text-pink-500 mt-1">分</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-3xl sm:text-4xl font-bold text-pink-700">-</div>
          <div className="text-xs text-pink-500 mt-1">秒</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-3 text-center">
      <div className="flex flex-col items-center">
        <div className="text-3xl sm:text-4xl font-bold text-pink-700">{time.days}</div>
        <div className="text-xs text-pink-500 mt-1">天</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="text-3xl sm:text-4xl font-bold text-pink-700">{pad(time.hours)}</div>
        <div className="text-xs text-pink-500 mt-1">时</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="text-3xl sm:text-4xl font-bold text-pink-700">{pad(time.minutes)}</div>
        <div className="text-xs text-pink-500 mt-1">分</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="text-3xl sm:text-4xl font-bold text-pink-700">{pad(time.seconds)}</div>
        <div className="text-xs text-pink-500 mt-1">秒</div>
      </div>
    </div>
  );
}
