"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetchJson } from "@/lib/apiClient";

type TemperatureStats = {
  today: string;
  todayMyScore: number | null;
  partnerRatedToday: boolean;
  myAvg30: number | null;
  ourAvg30: number | null;
  totalCount30: number;
  trend7d: Array<{ date: string; avg: number | null; count: number }>;
};

export default function TemperatureCard(props: { partnerName?: string }) {
  const partnerName = props.partnerName || "TA";

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TemperatureStats | null>(null);
  const [score, setScore] = useState<number>(4);
  const [saving, setSaving] = useState(false);

  const displayScore = useMemo(() => {
    if (stats?.todayMyScore != null) return stats.todayMyScore;
    return score;
  }, [score, stats?.todayMyScore]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await apiFetchJson<TemperatureStats>("/api/temperature");
      setStats(data);
      if (data.todayMyScore != null) setScore(data.todayMyScore);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (saving) return;
    setSaving(true);
    try {
      const data = await apiFetchJson<TemperatureStats & { ok: true }>("/api/temperature", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ score }),
      });
      setStats(data);
    } catch (e) {
      console.error(e);
      alert("提交失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  const avg = stats?.ourAvg30;
  const avgText = avg == null ? "--" : avg.toFixed(1);

  const meterWidth = avg == null ? 0 : Math.min(100, Math.max(0, (avg / 5) * 100));

  const trendMax = 5;

  const nowHour = new Date().getHours();
  const showReminder = !loading && (stats?.todayMyScore == null) && nowHour >= 22;

  return (
    <div className="bg-gradient-to-br from-white to-rose-50/30 rounded-3xl p-5 border border-rose-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 via-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-300/30">
            <span className="text-white text-lg">🌡️</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-rose-800 text-lg">今日温度</h3>
              {showReminder && (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            <p className="text-xs text-rose-400">给 {partnerName} 打个分吧（1-5星）</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-black text-rose-700 leading-none">
            {loading ? "--" : avgText}
          </div>
          <div className="text-[11px] text-rose-400">30天平均</div>
        </div>
      </div>

      {!loading && stats?.trend7d?.length ? (
        <div className="mb-4">
          <div className="flex items-end gap-1.5 h-12">
            {stats.trend7d.map((d) => {
              const h = d.avg == null ? 8 : Math.max(8, Math.round((d.avg / trendMax) * 48));
              const active = d.date === stats.today;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end">
                  <div
                    className={`w-full rounded-xl transition-all ${
                      d.avg == null
                        ? "bg-slate-100"
                        : "bg-gradient-to-t from-rose-500 to-yellow-400"
                    } ${active ? "ring-2 ring-rose-300" : ""}`}
                    style={{ height: `${h}px` }}
                    title={`${d.date}: ${d.avg == null ? "--" : d.avg}`}
                  />
                  <div className={`mt-1 text-[10px] ${active ? "text-rose-600 font-semibold" : "text-rose-300"}`}>
                    {d.date.slice(5)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-rose-400">
            <span>近7天趋势</span>
            <span>{stats.partnerRatedToday ? "TA今天已打分" : "TA今天未打分"}</span>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div className="h-3 rounded-full bg-rose-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-yellow-400 to-rose-500 transition-all"
              style={{ width: `${meterWidth}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-rose-400 mt-1">
            <span>冷</span>
            <span>热</span>
          </div>
        </div>
      )}

      <div className="bg-white/70 rounded-2xl border border-rose-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-rose-800">你给 {partnerName} 的分</div>
          <div className="text-sm font-bold text-rose-700">{displayScore}/5</div>
        </div>

        {showReminder && (
          <div className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600 font-medium">
            今天还没打分喔～给 {partnerName} 一个小星星吧
          </div>
        )}

        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const v = i + 1;
            const filled = v <= displayScore;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setScore(v)}
                disabled={loading}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-60"
                aria-label={`rate-${v}`}
              >
                <span className={filled ? "text-yellow-400 text-2xl" : "text-slate-300 text-2xl"}>★</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-[11px] text-rose-400">
            {stats?.todayMyScore == null ? "今天还没打分" : `今天已打分（可修改）`}
          </div>
          <button
            onClick={submit}
            disabled={loading || saving}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-bold shadow-md shadow-rose-300/30 hover:shadow-lg hover:shadow-rose-300/40 transition-all disabled:opacity-60"
          >
            {saving ? "提交中..." : "提交"}
          </button>
        </div>
      </div>
    </div>
  );
}
