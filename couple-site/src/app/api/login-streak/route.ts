import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/request";
import { connectToDatabase } from "@/lib/db";
import { CoupleModel } from "@/models/Couple";

// 更新登录追踪（连续登录天数）
export async function POST() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const couple = await CoupleModel.findById(session.coupleId);
    if (!couple) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const role = session.role;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 确保字段存在
    if (!couple.loginStreak) couple.loginStreak = { A: 0, B: 0 };
    if (!couple.lastLoginAt) couple.lastLoginAt = { A: null, B: null };
    if (!couple.totalLoginDays) couple.totalLoginDays = { A: 0, B: 0 };

    const lastLogin = couple.lastLoginAt[role];
    let newStreak = couple.loginStreak[role] || 0;
    let totalDays = couple.totalLoginDays[role] || 0;

    if (lastLogin) {
      const lastLoginDate = new Date(lastLogin);
      const lastDay = new Date(lastLoginDate.getFullYear(), lastLoginDate.getMonth(), lastLoginDate.getDate());
      const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // 今天已经登录过，不更新
        return NextResponse.json({
          streak: newStreak,
          totalDays: totalDays,
          isNewLogin: false,
        });
      } else if (diffDays === 1) {
        // 连续登录，+1
        newStreak += 1;
        totalDays += 1;
      } else {
        // 断签，重置
        newStreak = 1;
        totalDays += 1;
      }
    } else {
      // 首次登录
      newStreak = 1;
      totalDays = 1;
    }

    // 更新数据库
    couple.loginStreak[role] = newStreak;
    couple.lastLoginAt[role] = now;
    couple.totalLoginDays[role] = totalDays;
    await couple.save();

    return NextResponse.json({
      streak: newStreak,
      totalDays: totalDays,
      isNewLogin: true,
    });
  } catch (error) {
    console.error("Update login streak error:", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

// 获取当前登录统计
export async function GET() {
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
    const otherRole = role === "A" ? "B" : "A";

    return NextResponse.json({
      streak: couple.loginStreak?.[role] || 0,
      totalDays: couple.totalLoginDays?.[role] || 0,
      lastLogin: couple.lastLoginAt?.[role],
      partnerStreak: couple.loginStreak?.[otherRole] || 0,
    });
  } catch (error) {
    console.error("Get login stats error:", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
