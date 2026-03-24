import mongoose, { Schema, type InferSchemaType } from "mongoose";

// 徽章定义（预设徽章列表）
export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji 或图标名称
  color: string; // 徽章颜色主题
  condition: {
    type: "login_streak" | "total_login" | "photo_count" | "diary_count" | "todo_completed" | "anniversary_count" | "capsule_count" | "days_together" | "first_photo" | "first_diary" | "first_capsule" | "mood_count" | "active_days" | "night_owl" | "early_bird" | "sweet_moments" | "temp_rate_streak" | "temp_hot_streak" | "temp_mutual_days";
    value: number; // 阈值
  };
  rarity: "common" | "rare" | "epic" | "legendary";
}

// 用户获得的徽章记录
const UserBadgeSchema = new Schema(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    badgeId: { type: String, required: true },
    earnedAt: { type: Date, default: Date.now },
    earnedByRole: { type: String, enum: ["A", "B"], required: true }, // 谁获得的（如果是共同徽章则记录当前登录者）
    isNewBadge: { type: Boolean, default: true }, // 是否为新获得（用于提示）
    viewedAt: { type: Date, default: null }, // 用户何时查看过
  },
  { timestamps: true }
);

// 复合索引确保同一个徽章不会重复获得
UserBadgeSchema.index({ coupleId: 1, badgeId: 1 }, { unique: true });

export type UserBadge = InferSchemaType<typeof UserBadgeSchema>;

export const UserBadgeModel =
  (mongoose.models.UserBadge as mongoose.Model<UserBadge>) ||
  mongoose.model<UserBadge>("UserBadge", UserBadgeSchema);

// 预设徽章列表（客户端和服务器端共享）
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // 连续登录徽章
  { id: "login_streak_3", name: "初露锋芒", description: "连续登录 3 天", icon: "🔥", color: "from-orange-400 to-red-500", condition: { type: "login_streak", value: 3 }, rarity: "common" },
  { id: "login_streak_7", name: "坚持不懈", description: "连续登录 7 天", icon: "📅", color: "from-blue-400 to-indigo-500", condition: { type: "login_streak", value: 7 }, rarity: "common" },
  { id: "login_streak_30", name: "习惯养成", description: "连续登录 30 天", icon: "🌟", color: "from-purple-400 to-pink-500", condition: { type: "login_streak", value: 30 }, rarity: "rare" },
  { id: "login_streak_100", name: "百日之约", description: "连续登录 100 天", icon: "💯", color: "from-yellow-400 to-orange-500", condition: { type: "login_streak", value: 100 }, rarity: "epic" },
  
  // 累计登录徽章
  { id: "total_login_10", name: "初入爱河", description: "累计登录 10 天", icon: "🌱", color: "from-green-400 to-emerald-500", condition: { type: "total_login", value: 10 }, rarity: "common" },
  { id: "total_login_50", name: "情深意长", description: "累计登录 50 天", icon: "🌳", color: "from-teal-400 to-cyan-500", condition: { type: "total_login", value: 50 }, rarity: "common" },
  { id: "total_login_365", name: "周年之恋", description: "累计登录 365 天", icon: "🎂", color: "from-rose-400 to-pink-500", condition: { type: "total_login", value: 365 }, rarity: "epic" },
  
  // 功能使用徽章
  { id: "photo_10", name: "摄影师", description: "上传 10 张照片", icon: "📸", color: "from-pink-400 to-rose-500", condition: { type: "photo_count", value: 10 }, rarity: "common" },
  { id: "photo_50", name: "收藏家", description: "上传 50 张照片", icon: "🖼️", color: "from-purple-400 to-indigo-500", condition: { type: "photo_count", value: 50 }, rarity: "rare" },
  { id: "diary_10", name: "记录者", description: "写下 10 篇日记", icon: "📝", color: "from-amber-400 to-orange-500", condition: { type: "diary_count", value: 10 }, rarity: "common" },
  { id: "diary_30", name: "故事大王", description: "写下 30 篇日记", icon: "📖", color: "from-blue-400 to-violet-500", condition: { type: "diary_count", value: 30 }, rarity: "rare" },
  { id: "todo_20", name: "行动派", description: "完成 20 个待办", icon: "✅", color: "from-green-400 to-lime-500", condition: { type: "todo_completed", value: 20 }, rarity: "common" },
  { id: "todo_100", name: "效率达人", description: "完成 100 个待办", icon: "🚀", color: "from-cyan-400 to-blue-500", condition: { type: "todo_completed", value: 100 }, rarity: "rare" },
  { id: "anniversary_5", name: "记忆守护者", description: "记录 5 个纪念日", icon: "🎊", color: "from-rose-400 to-red-500", condition: { type: "anniversary_count", value: 5 }, rarity: "common" },
  { id: "capsule_3", name: "时光旅人", description: "创建 3 个时光胶囊", icon: "💊", color: "from-indigo-400 to-purple-500", condition: { type: "capsule_count", value: 3 }, rarity: "common" },
  { id: "capsule_10", name: "未来信使", description: "创建 10 个时光胶囊", icon: "⏳", color: "from-violet-400 to-fuchsia-500", condition: { type: "capsule_count", value: 10 }, rarity: "rare" },
  
  // 恋爱时长徽章
  { id: "days_30", name: "甜蜜起步", description: "在一起 30 天", icon: "🍬", color: "from-pink-300 to-rose-400", condition: { type: "days_together", value: 30 }, rarity: "common" },
  { id: "days_100", name: "百日纪念", description: "在一起 100 天", icon: "💐", color: "from-rose-300 to-pink-400", condition: { type: "days_together", value: 100 }, rarity: "rare" },
  { id: "days_365", name: "一周年快乐", description: "在一起 1 年", icon: "🎆", color: "from-yellow-300 to-orange-400", condition: { type: "days_together", value: 365 }, rarity: "epic" },
  { id: "days_1000", name: "千年之恋", description: "在一起 1000 天", icon: "💎", color: "from-blue-300 to-purple-400", condition: { type: "days_together", value: 1000 }, rarity: "legendary" },
  
  // 首次体验徽章（里程碑）
  { id: "first_photo", name: "初见定格", description: "上传第一张照片", icon: "📷", color: "from-pink-400 to-rose-500", condition: { type: "first_photo", value: 1 }, rarity: "common" },
  { id: "first_diary", name: "笔下生情", description: "写下第一篇日记", icon: "✍️", color: "from-amber-400 to-orange-500", condition: { type: "first_diary", value: 1 }, rarity: "common" },
  { id: "first_capsule", name: "时光初启", description: "创建第一个时光胶囊", icon: "🔮", color: "from-indigo-400 to-purple-500", condition: { type: "first_capsule", value: 1 }, rarity: "common" },
  
  // 心情徽章（正向情绪）
  { id: "mood_happy_5", name: "快乐使者", description: "连续 5 天记录好心情（4-5分）", icon: "😊", color: "from-yellow-400 to-orange-500", condition: { type: "mood_count", value: 5 }, rarity: "rare" },
  { id: "mood_happy_10", name: "阳光普照", description: "连续 10 天记录好心情", icon: "☀️", color: "from-orange-400 to-red-500", condition: { type: "mood_count", value: 10 }, rarity: "epic" },
  
  // 活跃徽章
  { id: "active_7", name: "热恋期", description: "连续 7 天都有互动（照片/日记/待办）", icon: "💕", color: "from-rose-400 to-pink-500", condition: { type: "active_days", value: 7 }, rarity: "rare" },
  { id: "active_30", name: "形影不离", description: "连续 30 天都有互动", icon: "👫", color: "from-purple-400 to-indigo-500", condition: { type: "active_days", value: 30 }, rarity: "epic" },
  
  // 时间魔法徽章（特定时间登录）
  { id: "night_owl", name: "夜猫子", description: "在 23:00-03:00 之间登录", icon: "🌙", color: "from-indigo-400 to-blue-600", condition: { type: "night_owl", value: 1 }, rarity: "common" },
  { id: "early_bird", name: "早起鸟", description: "在 06:00-08:00 之间登录", icon: "🐦", color: "from-sky-400 to-cyan-500", condition: { type: "early_bird", value: 1 }, rarity: "common" },
  
  // 甜蜜时刻徽章
  { id: "sweet_10", name: "甜蜜记录员", description: "记录 10 个美好瞬间（照片+日记）", icon: "🍭", color: "from-pink-400 to-purple-500", condition: { type: "sweet_moments", value: 10 }, rarity: "common" },
  { id: "sweet_50", name: "浪漫收藏家", description: "记录 50 个美好瞬间", icon: "🌹", color: "from-rose-400 to-red-500", condition: { type: "sweet_moments", value: 50 }, rarity: "rare" },
  { id: "sweet_100", name: "爱的见证者", description: "记录 100 个美好瞬间", icon: "💝", color: "from-red-400 to-pink-600", condition: { type: "sweet_moments", value: 100 }, rarity: "epic" },
  
  // 更多进阶徽章
  { id: "photo_100", name: "影像大师", description: "上传 100 张照片", icon: "🎬", color: "from-violet-400 to-purple-600", condition: { type: "photo_count", value: 100 }, rarity: "epic" },
  { id: "diary_100", name: "生活作家", description: "写下 100 篇日记", icon: "📚", color: "from-blue-500 to-indigo-600", condition: { type: "diary_count", value: 100 }, rarity: "epic" },
  { id: "capsule_20", name: "时光收藏家", description: "创建 20 个时光胶囊", icon: "🕰️", color: "from-amber-500 to-orange-600", condition: { type: "capsule_count", value: 20 }, rarity: "epic" },
  { id: "anniversary_10", name: "纪念日达人", description: "记录 10 个纪念日", icon: "🎉", color: "from-yellow-400 to-amber-500", condition: { type: "anniversary_count", value: 10 }, rarity: "rare" },

  // 温度打分徽章
  { id: "temp_rate_7", name: "暖心打分王", description: "连续 7 天给 TA 打分", icon: "⭐", color: "from-yellow-400 to-amber-500", condition: { type: "temp_rate_streak", value: 7 }, rarity: "rare" },
  { id: "temp_rate_30", name: "温度守护者", description: "连续 30 天给 TA 打分", icon: "🌡️", color: "from-orange-400 to-rose-500", condition: { type: "temp_rate_streak", value: 30 }, rarity: "epic" },
  { id: "temp_hot_3", name: "热恋升温", description: "连续 3 天双方都打分且平均温度 ≥ 4.5", icon: "🔥", color: "from-red-400 to-pink-600", condition: { type: "temp_hot_streak", value: 3 }, rarity: "rare" },
  { id: "temp_hot_7", name: "炙热如初", description: "连续 7 天双方都打分且平均温度 ≥ 4.5", icon: "❤️‍🔥", color: "from-rose-500 to-red-600", condition: { type: "temp_hot_streak", value: 7 }, rarity: "legendary" },
  { id: "temp_mutual_10", name: "默契满分", description: "双方同一天都打分累计 10 天", icon: "🤝", color: "from-sky-400 to-cyan-500", condition: { type: "temp_mutual_days", value: 10 }, rarity: "common" },
];

// 获取徽章定义
export function getBadgeDefinition(badgeId: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find(b => b.id === badgeId);
}

// 获取所有徽章定义
export function getAllBadgeDefinitions(): BadgeDefinition[] {
  return BADGE_DEFINITIONS;
}
