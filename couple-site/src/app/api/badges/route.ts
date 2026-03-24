import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/request";
import { connectToDatabase } from "@/lib/db";
import { CoupleModel } from "@/models/Couple";
import { UserBadgeModel, getAllBadgeDefinitions, getBadgeDefinition, type BadgeDefinition } from "@/models/Badge";
import { PhotoModel } from "@/models/Photo";
import { DiaryModel } from "@/models/Diary";
import { TodoModel } from "@/models/Todo";
import { CapsuleModel } from "@/models/Capsule";
import { DailyRatingModel } from "@/models/DailyRating";
import mongoose from "mongoose";

// 获取用户的所有徽章
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    // 获取用户已获得的徽章
    const userBadges = await UserBadgeModel.find({ coupleId: session.coupleId })
      .sort({ earnedAt: -1 })
      .lean();

    // 获取徽章定义并合并
    const badgeDefs = getAllBadgeDefinitions();
    const earnedBadgeIds = new Set(userBadges.map(ub => ub.badgeId));

    const badgesWithDetails = userBadges.map(ub => {
      const def = getBadgeDefinition(ub.badgeId);
      return {
        ...ub,
        definition: def || null,
      };
    });

    // 未获得的徽章（可选展示为锁定状态）
    const lockedBadges = badgeDefs.filter(b => !earnedBadgeIds.has(b.id));

    // 检查是否有新徽章（isNew = true 且未被查看过）
    const hasNewBadges = userBadges.some(b => (b as any).isNewBadge || (b as any).isNew);

    return NextResponse.json({
      earned: badgesWithDetails,
      locked: lockedBadges,
      hasNew: hasNewBadges,
    });
  } catch (error) {
    console.error("Get badges error:", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

// 检查并授予徽章（在登录或特定操作后调用）
export async function POST() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const couple = await CoupleModel.findById(session.coupleId).lean();
    if (!couple) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const role = session.role;
    const newlyEarnedBadges: BadgeDefinition[] = [];

    // 获取已获得的徽章
    const existingBadges = await UserBadgeModel.find({ coupleId: session.coupleId })
      .select("badgeId")
      .lean();
    const earnedIds = new Set(existingBadges.map(b => b.badgeId));

    // 获取统计数据
    const stats = await getCoupleStats(session.coupleId, couple, role);

    // 检查每个徽章条件
    const badgeDefs = getAllBadgeDefinitions();
    for (const badge of badgeDefs) {
      if (earnedIds.has(badge.id)) continue; // 已获得过

      const shouldAward = checkBadgeCondition(badge, stats, role);
      if (shouldAward) {
        // 授予徽章
        await UserBadgeModel.create({
          coupleId: session.coupleId,
          badgeId: badge.id,
          earnedByRole: role,
          isNewBadge: true,
        });
        newlyEarnedBadges.push(badge);
      }
    }

    return NextResponse.json({
      newBadges: newlyEarnedBadges,
      allStats: stats,
    });
  } catch (error) {
    console.error("Check badges error:", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

// 标记新徽章为已查看
export async function PUT() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    await UserBadgeModel.updateMany(
      { coupleId: session.coupleId, $or: [{ isNewBadge: true }, { isNew: true }] },
      { $set: { isNewBadge: false, viewedAt: new Date() }, $unset: { isNew: "" } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark badges viewed error:", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

// 获取统计数据
async function getCoupleStats(coupleId: string, couple: any, role: "A" | "B") {
  // 登录数据（直接从couple读取）
  const loginStreak = couple.loginStreak?.[role] || 0;
  const totalLoginDays = couple.totalLoginDays?.[role] || 0;

  // 照片统计
  const photoCountA = await PhotoModel.countDocuments({ coupleId, uploadedByRole: "A" });
  const photoCountB = await PhotoModel.countDocuments({ coupleId, uploadedByRole: "B" });
  const photoCount = role === "A" ? photoCountA : photoCountB;

  // 日记统计
  const diaryCountA = await DiaryModel.countDocuments({ coupleId, role: "A" });
  const diaryCountB = await DiaryModel.countDocuments({ coupleId, role: "B" });
  const diaryCount = role === "A" ? diaryCountA : diaryCountB;

  // 待办完成统计
  const todoCompletedA = await TodoModel.countDocuments({ 
    coupleId, 
    done: true, 
    doneByRole: "A" 
  });
  const todoCompletedB = await TodoModel.countDocuments({ 
    coupleId, 
    done: true, 
    doneByRole: "B" 
  });

  // 纪念日数量
  const anniversaryCount = couple.anniversaries?.length || 0;

  // 时光胶囊数量
  const capsuleCount = await CapsuleModel.countDocuments({ coupleId });

  // 在一起天数
  let daysTogether = 0;
  if (couple.togetherSince) {
    const togetherDate = new Date(couple.togetherSince);
    const now = new Date();
    daysTogether = Math.floor((now.getTime() - togetherDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // 心情统计 - 连续好心情天数（简化实现，取最近记录）
  const recentDiaries = await DiaryModel.find({ 
    coupleId, 
    role,
    date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  }).sort({ date: -1 }).lean();
  
  let moodStreak = 0;
  for (const diary of recentDiaries) {
    const moodNum = typeof diary.mood === "number" ? diary.mood : Number(diary.mood);
    const normalizedMood = Number.isFinite(moodNum) ? moodNum : 3;
    if (normalizedMood >= 4) {
      moodStreak++;
    } else {
      break;
    }
  }

  // 甜蜜时刻 = 照片 + 日记总数
  const sweetMoments = photoCount + diaryCount;

  // 当前时间（用于夜猫子/早起鸟徽章）
  const currentHour = new Date().getHours();
  const isNightOwl = currentHour >= 23 || currentHour < 3;
  const isEarlyBird = currentHour >= 6 && currentHour < 8;

  // 温度打分徽章统计
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d: Date, days: number) => {
    const next = new Date(d);
    next.setDate(next.getDate() + days);
    return next;
  };

  const today = startOfDay(new Date());
  const streakStart = startOfDay(addDays(today, -59));
  const streakEnd = addDays(today, 1);

  const recentRatings = await DailyRatingModel.find({
    coupleId,
    date: { $gte: streakStart, $lt: streakEnd },
  }).lean();

  const dayMap = new Map<string, { A?: number; B?: number }>();
  for (const r of recentRatings) {
    const key = startOfDay(new Date(r.date)).toISOString().split("T")[0];
    const cur = dayMap.get(key) || {};
    const from = r.fromRole as "A" | "B";
    cur[from] = r.score as number;
    dayMap.set(key, cur);
  }

  // 连续打分：只计算“我”是否每天都有给对方打分
  let tempRateStreak = 0;
  for (let i = 0; i < 60; i++) {
    const d = addDays(today, -i);
    const key = d.toISOString().split("T")[0];
    const v = dayMap.get(key);
    if (v && typeof v[role] === "number") tempRateStreak++;
    else break;
  }

  // 连续高温：当天双方都打分，且当天平均温度 >= 4.5
  let tempHotStreak = 0;
  for (let i = 0; i < 60; i++) {
    const d = addDays(today, -i);
    const key = d.toISOString().split("T")[0];
    const v = dayMap.get(key);
    const a = v?.A;
    const b = v?.B;
    if (typeof a === "number" && typeof b === "number") {
      const avg = (a + b) / 2;
      if (avg >= 4.5) tempHotStreak++;
      else break;
    } else {
      break;
    }
  }

  // 双方同日打分累计天数（全量统计）
  const coupleObjectId = new mongoose.Types.ObjectId(coupleId);
  const mutualAgg = await DailyRatingModel.aggregate([
    { $match: { coupleId: coupleObjectId } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$date",
          },
        },
        roles: { $addToSet: "$fromRole" },
      },
    },
    { $match: { $expr: { $eq: [{ $size: "$roles" }, 2] } } },
    { $count: "days" },
  ]);
  const tempMutualDays = mutualAgg?.[0]?.days || 0;

  return {
    loginStreak,
    totalLoginDays,
    photoCountA,
    photoCountB,
    photoCount,
    diaryCountA,
    diaryCountB,
    diaryCount,
    todoCompletedA,
    todoCompletedB,
    anniversaryCount,
    capsuleCount,
    daysTogether,
    moodStreak,
    sweetMoments,
    isNightOwl,
    isEarlyBird,
    tempRateStreak,
    tempHotStreak,
    tempMutualDays,
  };
}

// 检查徽章条件
function checkBadgeCondition(
  badge: BadgeDefinition, 
  stats: Awaited<ReturnType<typeof getCoupleStats>>,
  role: "A" | "B"
): boolean {
  const { type, value } = badge.condition;

  switch (type) {
    case "login_streak":
      return stats.loginStreak >= value;
    case "total_login":
      return stats.totalLoginDays >= value;
    case "photo_count":
      return stats.photoCount >= value;
    case "diary_count":
      return stats.diaryCount >= value;
    case "todo_completed":
      const todoCount = role === "A" ? stats.todoCompletedA : stats.todoCompletedB;
      return todoCount >= value;
    case "anniversary_count":
      return stats.anniversaryCount >= value;
    case "capsule_count":
      return stats.capsuleCount >= value;
    case "days_together":
      return stats.daysTogether >= value;
    // 首次体验徽章
    case "first_photo":
      return stats.photoCount >= 1;
    case "first_diary":
      return stats.diaryCount >= 1;
    case "first_capsule":
      return stats.capsuleCount >= 1;
    // 心情徽章
    case "mood_count":
      return stats.moodStreak >= value;
    // 时间魔法徽章
    case "night_owl":
      return stats.isNightOwl;
    case "early_bird":
      return stats.isEarlyBird;
    // 甜蜜时刻
    case "sweet_moments":
      return stats.sweetMoments >= value;
    // 活跃徽章（使用连续登录作为近似）
    case "active_days":
      return stats.loginStreak >= value;
    // 温度打分徽章
    case "temp_rate_streak":
      return stats.tempRateStreak >= value;
    case "temp_hot_streak":
      return stats.tempHotStreak >= value;
    case "temp_mutual_days":
      return stats.tempMutualDays >= value;
    default:
      return false;
  }
}
