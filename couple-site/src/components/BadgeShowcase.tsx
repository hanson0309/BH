"use client";

import { useState, useEffect } from "react";
import { apiFetchJson } from "@/lib/apiClient";

interface Badge {
  _id: string;
  badgeId: string;
  earnedAt: string;
  earnedByRole: "A" | "B";
  isNewBadge?: boolean;
  isNew?: boolean;
  definition: {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    rarity: "common" | "rare" | "epic" | "legendary";
  } | null;
}

interface BadgeData {
  earned: Badge[];
  locked: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    rarity: string;
  }>;
  hasNew: boolean;
}

interface BadgeCheckResult {
  newBadges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: string;
  }>;
  allStats: Record<string, unknown>;
}

const rarityConfig: Record<string, { border: string; shadow: string; glow: string; label: string }> = {
  common: { 
    border: "border-slate-200", 
    shadow: "shadow-slate-200/50",
    glow: "from-slate-100 to-slate-200",
    label: "普通"
  },
  rare: { 
    border: "border-blue-300", 
    shadow: "shadow-blue-300/50",
    glow: "from-blue-100 to-cyan-100",
    label: "稀有"
  },
  epic: { 
    border: "border-purple-300", 
    shadow: "shadow-purple-300/50",
    glow: "from-purple-100 to-pink-100",
    label: "史诗"
  },
  legendary: { 
    border: "border-yellow-300", 
    shadow: "shadow-yellow-300/50",
    glow: "from-yellow-100 to-orange-100",
    label: "传说"
  },
};

export default function BadgeShowcase() {
  const [badges, setBadges] = useState<BadgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [showAll, setShowAll] = useState(false);

  const [newBadgeAlert, setNewBadgeAlert] = useState<BadgeCheckResult["newBadges"][0] | null>(null);

  const displayBadges = showAll ? badges?.earned : badges?.earned.slice(0, 4);
  const hasMore = badges && badges.earned.length > 4;

  useEffect(() => {
    loadBadges();
  }, []);

  async function loadBadges() {
    try {
      const data = await apiFetchJson<BadgeData>("/api/badges");
      setBadges(data);
      
      // 如果有新徽章，延迟后标记为已查看
      if (data.hasNew) {
        setTimeout(() => markAsViewed(), 3000);
      }
    } catch (err) {
      console.error("Load badges error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function markAsViewed() {
    try {
      await apiFetchJson("/api/badges", { method: "PUT" });
      if (badges) {
        setBadges({
          ...badges,
          hasNew: false,
          earned: badges.earned.map(b => ({ ...b, isNew: false, isNewBadge: false })),
        });
      }
    } catch (err) {
      console.error("Mark badges viewed error:", err);
    }
  }

  async function checkNewBadges() {
    try {
      const data = await apiFetchJson<BadgeCheckResult>("/api/badges", { method: "POST" });
      if (data.newBadges && data.newBadges.length > 0) {
        // 显示新徽章提示
        setNewBadgeAlert(data.newBadges[0]);
        // 重新加载徽章列表
        loadBadges();
      }
    } catch (err) {
      console.error("Check badges error:", err);
    }
  }

  // 首次加载时检查新徽章
  useEffect(() => {
    checkNewBadges();
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white to-pink-50/50 rounded-3xl p-5 border border-pink-100 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-300/30">
            <span className="text-white text-lg">🏅</span>
          </div>
          <div>
            <h3 className="font-bold text-pink-800 text-lg">徽章墙</h3>
            <p className="text-xs text-pink-400">加载中...</p>
          </div>
        </div>
        <div className="flex gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-20 h-20 rounded-2xl bg-pink-100/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-br from-white to-pink-50/30 rounded-3xl p-5 border border-pink-100 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 via-rose-500 to-purple-500 flex items-center justify-center shadow-lg shadow-pink-300/30">
              <span className="text-white text-lg">🏅</span>
            </div>
            <div>
              <h3 className="font-bold text-pink-800 text-lg">徽章墙</h3>
              <p className="text-xs text-pink-400">
                已获得 {badges?.earned.length || 0} 个徽章
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {badges?.hasNew && (
              <span className="px-3 py-1 bg-gradient-to-r from-red-400 to-pink-500 text-white text-xs font-bold rounded-full shadow-md shadow-red-300/50 animate-pulse">
                NEW!
              </span>
            )}
          </div>
        </div>

        {!badges || badges.earned.length === 0 ? (
          <div className="text-center py-8 bg-gradient-to-br from-pink-50/50 to-rose-50/30 rounded-2xl border border-pink-100/50">
            <div className="text-4xl mb-3">🌱</div>
            <p className="text-sm text-pink-600 font-medium">
              还没有徽章哦～
            </p>
            <p className="text-xs text-pink-400 mt-1">
              连续登录可获得首个徽章！
            </p>
          </div>
        ) : (
          <>
            {/* Badge Grid - 每行4个更大的徽章 */}
            <div className="grid grid-cols-4 gap-3">
              {displayBadges?.map((badge) => {
                const rarity = badge.definition?.rarity || "common";
                const config = rarityConfig[rarity];
                const isNew = Boolean((badge as any).isNewBadge ?? (badge as any).isNew);
                
                return (
                  <button
                    key={badge._id}
                    onClick={() => setSelectedBadge(badge)}
                    className={`group relative aspect-square rounded-2xl bg-gradient-to-br ${config.glow} 
                      border-2 ${config.border} ${isNew ? 'ring-2 ring-red-400 ring-offset-2' : ''}
                      shadow-md ${config.shadow} hover:shadow-xl hover:scale-105 
                      transition-all duration-300 flex flex-col items-center justify-center p-2`}
                  >
                    {/* 徽章图标 */}
                    <span className="text-3xl mb-1 drop-shadow-sm group-hover:scale-110 transition-transform">
                      {badge.definition?.icon || "🏅"}
                    </span>
                    
                    {/* 徽章名称 - 小字显示 */}
                    <span className="text-[10px] font-medium text-gray-600 text-center leading-tight line-clamp-2">
                      {badge.definition?.name}
                    </span>
                    
                    {/* 新徽章标记 */}
                    {isNew && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-red-400 to-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md animate-bounce">
                        !
                      </span>
                    )}
                    
                    {/* 稀有度光泽效果 */}
                    {rarity !== "common" && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* 查看更多 */}
            {hasMore && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full mt-4 py-3 bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700 text-sm font-medium rounded-2xl hover:from-pink-200 hover:to-rose-200 transition-all flex items-center justify-center gap-2"
              >
                <span>{showAll ? "收起徽章" : `查看全部 ${badges.earned.length} 个徽章`}</span>
                <span className={`transition-transform ${showAll ? 'rotate-180' : ''}`}>▼</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* 徽章详情弹窗 - 更精美的设计 */}
      {selectedBadge && (
        <div
          onClick={() => setSelectedBadge(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border-2 border-pink-100"
          >
            <div className="text-center">
              {/* 徽章大图 */}
              <div className={`w-28 h-28 mx-auto rounded-3xl bg-gradient-to-br ${rarityConfig[selectedBadge.definition?.rarity || "common"].glow} 
                border-3 ${rarityConfig[selectedBadge.definition?.rarity || "common"].border}
                shadow-xl flex items-center justify-center mb-5 relative overflow-hidden`}
              >
                <span className="text-6xl drop-shadow-md">
                  {selectedBadge.definition?.icon || "🏅"}
                </span>
                {/* 光泽效果 */}
                <div className="absolute top-0 right-0 w-14 h-14 bg-gradient-to-bl from-white/60 to-transparent rounded-bl-full" />
              </div>
              
              {/* 徽章信息 */}
              <div className={`inline-block px-4 py-1 rounded-full text-xs font-bold mb-3
                ${selectedBadge.definition?.rarity === "legendary" ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white" : 
                  selectedBadge.definition?.rarity === "epic" ? "bg-gradient-to-r from-purple-400 to-pink-500 text-white" :
                  selectedBadge.definition?.rarity === "rare" ? "bg-gradient-to-r from-blue-400 to-cyan-500 text-white" :
                  "bg-slate-100 text-slate-600"}`}
              >
                {rarityConfig[selectedBadge.definition?.rarity || "common"].label}
              </div>
              
              <h4 className="text-xl font-bold text-gray-800 mb-2">
                {selectedBadge.definition?.name}
              </h4>
              
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {selectedBadge.definition?.description}
              </p>
              
              <div className="text-xs text-pink-400 bg-pink-50 rounded-full py-2 px-4 inline-block">
                🎉 获得于 {new Date(selectedBadge.earnedAt).toLocaleDateString("zh-CN")}
              </div>
            </div>
            
            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full mt-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-2xl hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg shadow-pink-300/30"
            >
              太棒了！
            </button>
          </div>
        </div>
      )}

      {/* 新徽章获得提示 */}
      {newBadgeAlert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce">
            <span className="text-4xl">{newBadgeAlert.icon}</span>
            <div>
              <p className="font-bold text-lg">获得新徽章！</p>
              <p className="text-sm opacity-90">{newBadgeAlert.name}</p>
            </div>
            <button
              onClick={() => setNewBadgeAlert(null)}
              className="ml-2 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
