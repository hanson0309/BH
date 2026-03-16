"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

// 爱心图标
function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

// 可用的心情表情
const MOODS = ["😊", "😢", "😠", "😍", "😴", "🥳", "😰", "🤔", "🤗", "😎"];

type Profile = {
  name?: string;
  avatar?: string;
  nickname?: string;
};

type Diary = {
  id: string;
  date: string; // YYYY-MM-DD
  content: string;
  createdByRole: "A" | "B";
  mood: string;
  createdAt: string;
  updatedAt: string;
};

// 获取某月有多少天
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// 获取某月第一天是星期几（0-6）
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 判断是否是今天
function isToday(dateStr: string): boolean {
  return dateStr === formatDate(new Date());
}

import { globalCache, fetchProfiles } from "@/lib/globalCache";

export default function DiaryPage() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-11

  // 当前选中的日期和编辑内容
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [selectedMood, setSelectedMood] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [profiles, setProfiles] = useState<{ A: Profile; B: Profile } | null>(null);

  // 获取缓存 key
  const getCacheKey = (year: number, month: number) => `${year}-${month}`;

  // 获取当前月的日记数据（带缓存）
  async function refresh(force = false) {
    const cacheKey = getCacheKey(currentYear, currentMonth);
    
    // 如果有缓存且不是强制刷新，直接使用缓存
    if (!force && globalCache.diary.has(cacheKey)) {
      setDiaries(globalCache.diary.get(cacheKey) as Diary[]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/diary?year=${currentYear}&month=${currentMonth}`);
      if (!res.ok) {
        setError("获取日记失败");
        return;
      }
      const data = (await res.json()) as { diaries: Diary[] };
      // 存入缓存
      globalCache.diary.set(cacheKey, data.diaries);
      setDiaries(data.diaries);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }

  // 获取用户资料（使用共享函数，自动处理重复请求）
  async function loadProfiles(force = false) {
    const profiles = await fetchProfiles(force);
    if (profiles) {
      setProfiles(profiles as { A: Profile; B: Profile });
    }
  }

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadProfiles();
  }, []);

  useEffect(() => {
    refresh();
  }, [currentYear, currentMonth]);

  // 获取显示名字
  const getDisplayName = (role: "A" | "B") => {
    const profile = profiles?.[role];
    return profile?.nickname || profile?.name || (role === "A" ? "👦 A" : "👧 B");
  };
  const diariesByDate = useMemo(() => {
    const map: Record<string, Diary> = {};
    for (const d of diaries) {
      map[d.date] = d;
    }
    return map;
  }, [diaries]);

  // 切换月份
  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  // 点击日期
  function handleDateClick(dateStr: string) {
    setSelectedDate(dateStr);
    const existing = diariesByDate[dateStr];
    if (existing) {
      setEditingContent(existing.content);
      setSelectedMood(existing.mood || "");
    } else {
      setEditingContent("");
      setSelectedMood("");
    }
    setIsModalOpen(true);
    setError(null);
  }

  // 保存日记
  async function saveDiary() {
    if (!selectedDate || !editingContent.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          content: editingContent.trim(),
          mood: selectedMood,
        }),
      });

      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null);
        if (data && typeof data === "object" && "error" in data) {
          setError((data as { error?: string }).error || "保存失败");
        } else {
          setError("保存失败");
        }
        return;
      }

      await refresh(true); // 强制刷新，更新当前月份缓存
      closeModal();
    } finally {
      setLoading(false);
    }
  }

  // 删除日记
  async function deleteDiary() {
    if (!selectedDate) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/diary?date=${selectedDate}`, {
        method: "DELETE",
      });

      if (!res.ok && res.status !== 404) {
        setError("删除失败");
        return;
      }

      await refresh(true); // 强制刷新，更新当前月份缓存
      closeModal();
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    setIsModalOpen(false);
    setSelectedDate(null);
    setEditingContent("");
    setSelectedMood("");
  }

  // 生成日历网格数据
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // 上个月的末尾几天（用于补齐日历）
    const prevMonthDays = getDaysInMonth(
      currentMonth === 0 ? currentYear - 1 : currentYear,
      currentMonth === 0 ? 11 : currentMonth - 1
    );
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const date = new Date(
        currentMonth === 0 ? currentYear - 1 : currentYear,
        currentMonth === 0 ? 11 : currentMonth - 1,
        d
      );
      days.push({ date: formatDate(date), day: d, isCurrentMonth: false });
    }

    // 当月的天数
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      days.push({ date: formatDate(date), day: i, isCurrentMonth: true });
    }

    // 下个月的开头几天（补齐到6行/42格）
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(
        currentMonth === 11 ? currentYear + 1 : currentYear,
        currentMonth === 11 ? 0 : currentMonth + 1,
        i
      );
      days.push({ date: formatDate(date), day: i, isCurrentMonth: false });
    }

    return days;
  }, [currentYear, currentMonth]);

  const monthNames = [
    "一月",
    "二月",
    "三月",
    "四月",
    "五月",
    "六月",
    "七月",
    "八月",
    "九月",
    "十月",
    "十一月",
    "十二月",
  ];

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className="min-h-screen py-8 pt-16">
      <div className="mx-auto w-full max-w-4xl px-4">
        {/* 标题区 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center shadow-lg shadow-pink-200">
              <span className="text-xl">📔</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent">
                甜蜜日记
              </h1>
              <p className="text-xs text-pink-500/80">
                记录每一天的美好 💕
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

        {/* 日历卡片 */}
        <div className="relative mb-6">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-200 to-rose-200 rounded-3xl blur opacity-50" />
          <div className="relative rounded-2xl bg-white border-2 border-pink-100 p-5 shadow-sm">
            {/* 月份导航 */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={prevMonth}
                className="w-10 h-10 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-600 flex items-center justify-center transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div className="text-center">
                <div className="text-lg font-bold text-pink-800">
                  {currentYear}年 {monthNames[currentMonth]}
                </div>
                <div className="text-xs text-pink-500">
                  {diaries.length} 篇日记
                </div>
              </div>
              <button
                onClick={nextMonth}
                className="w-10 h-10 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-600 flex items-center justify-center transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-pink-400 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 日历网格 */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, day, isCurrentMonth }) => {
                const diary = diariesByDate[date];
                const today = isToday(date);
                return (
                  <button
                    key={date}
                    onClick={() => handleDateClick(date)}
                    className={`
                      relative aspect-square rounded-xl p-1 transition-all
                      ${
                        isCurrentMonth
                          ? "bg-pink-50/50 hover:bg-pink-100"
                          : "bg-gray-50/50 text-gray-400"
                      }
                      ${today ? "ring-2 ring-pink-400 bg-pink-100" : ""}
                      ${diary ? "font-medium" : ""}
                    `}
                  >
                    <div className="h-full flex flex-col items-center justify-center">
                      <span
                        className={`
                        text-sm
                        ${today ? "text-pink-700 font-bold" : ""}
                        ${!isCurrentMonth ? "text-gray-400" : "text-pink-900"}
                      `}
                      >
                        {day}
                      </span>
                      {diary && (
                        <div className="mt-0.5 flex items-center gap-0.5">
                          {diary.mood && (
                            <span className="text-xs">{diary.mood}</span>
                          )}
                          <HeartIcon className="w-3 h-3 text-rose-400" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 提示文字 */}
            <div className="mt-4 text-center text-xs text-pink-400">
              💡 点击日期查看或写日记
            </div>
          </div>
        </div>

        {/* 最近日记列表 */}
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-200 to-rose-200 rounded-3xl blur opacity-50" />
          <div className="relative rounded-2xl bg-white border-2 border-pink-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HeartIcon className="w-5 h-5 text-rose-400" />
              <span className="text-sm font-medium text-pink-700">
                本月日记
              </span>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {diaries.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📝</div>
                  <p className="text-pink-500/80 text-sm">
                    这个月还没有写日记哦，快来记录美好的一天吧～
                  </p>
                </div>
              ) : (
                diaries.map((diary) => (
                  <button
                    key={diary.id}
                    onClick={() => handleDateClick(diary.date)}
                    className="w-full text-left rounded-xl border-2 border-pink-100 hover:border-pink-300 bg-pink-50/30 hover:bg-pink-50 p-4 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-pink-700">
                            {diary.date}
                          </span>
                          {diary.mood && (
                            <span className="text-lg">{diary.mood}</span>
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">
                            {diary.createdByRole === "A" ? getDisplayName("A") : getDisplayName("B")}
                          </span>
                        </div>
                        <p className="text-sm text-pink-800 line-clamp-2">
                          {diary.content}
                        </p>
                      </div>
                      <HeartIcon className="w-5 h-5 text-rose-300 flex-shrink-0" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 编辑弹窗 */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* 弹窗内容 */}
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border-2 border-pink-200">
            {/* 头部 */}
            <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📔</span>
                <div>
                  <h3 className="font-bold text-white">
                    {diariesByDate[selectedDate] ? "编辑日记" : "写日记"}
                  </h3>
                  <p className="text-pink-100 text-xs">{selectedDate}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* 内容 */}
            <div className="p-5 space-y-4">
              {/* 心情选择 */}
              <div>
                <label className="block text-sm font-medium text-pink-700 mb-2">
                  今天的心情
                </label>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((mood) => (
                    <button
                      key={mood}
                      onClick={() =>
                        setSelectedMood(selectedMood === mood ? "" : mood)
                      }
                      className={`
                        w-10 h-10 rounded-xl text-xl transition-all
                        ${
                          selectedMood === mood
                            ? "bg-pink-400 text-white ring-2 ring-pink-400 ring-offset-2"
                            : "bg-pink-50 hover:bg-pink-100"
                        }
                      `}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              {/* 日记内容 */}
              <div>
                <label className="block text-sm font-medium text-pink-700 mb-2">
                  写下今天的故事
                </label>
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  placeholder="今天发生了什么有趣的事情？一起来记录这份甜蜜吧..."
                  rows={8}
                  className="w-full rounded-xl border-2 border-pink-200 px-4 py-3 text-pink-900 placeholder-pink-300 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-50 transition-all bg-pink-50/30 resize-none"
                />
                <div className="mt-1 text-right text-xs text-pink-400">
                  {editingContent.length}/5000
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* 按钮组 */}
              <div className="flex items-center justify-between pt-2">
                {diariesByDate[selectedDate] ? (
                  <button
                    onClick={deleteDiary}
                    disabled={loading}
                    className="text-sm text-rose-500 hover:text-rose-700 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-60"
                  >
                    {loading ? "删除中..." : "删除日记"}
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-3">
                  <button
                    onClick={closeModal}
                    disabled={loading}
                    className="text-sm text-pink-500 hover:text-pink-700 px-4 py-2 rounded-xl hover:bg-pink-50 transition-colors disabled:opacity-60"
                  >
                    取消
                  </button>
                  <button
                    onClick={saveDiary}
                    disabled={loading || !editingContent.trim()}
                    className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-2 text-white font-semibold shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    {loading ? "保存中..." : "保存日记"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
