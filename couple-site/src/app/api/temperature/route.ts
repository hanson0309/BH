import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/request";
import { DailyRatingModel } from "@/models/DailyRating";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

async function getStats(coupleId: string, role: "A" | "B") {
  const today = startOfDay(new Date());
  const rangeStart = startOfDay(addDays(today, -29));
  const rangeEnd = addDays(today, 1);
  const otherRole: "A" | "B" = role === "A" ? "B" : "A";

  const trendStart = startOfDay(addDays(today, -6));
  const trendEnd = rangeEnd;

  const [todayMine, todayPartner, last30, last7] = await Promise.all([
    DailyRatingModel.findOne({ coupleId, date: { $gte: today, $lt: rangeEnd }, fromRole: role }).lean(),
    DailyRatingModel.findOne({ coupleId, date: { $gte: today, $lt: rangeEnd }, fromRole: otherRole }).lean(),
    DailyRatingModel.find({ coupleId, date: { $gte: rangeStart, $lt: rangeEnd } }).lean(),
    DailyRatingModel.find({ coupleId, date: { $gte: trendStart, $lt: trendEnd } }).lean(),
  ]);

  const mine = last30.filter((r) => r.fromRole === role);

  const avg = (arr: Array<{ score: number }>) => {
    if (!arr.length) return null;
    const sum = arr.reduce((s, x) => s + (x.score || 0), 0);
    return Math.round((sum / arr.length) * 10) / 10;
  };

  const ourAvg30 = avg(last30);
  const myAvg30 = avg(mine);

  const byDay = new Map<string, { sum: number; count: number }>();
  for (const r of last7) {
    const key = startOfDay(new Date(r.date)).toISOString().split("T")[0];
    const cur = byDay.get(key) || { sum: 0, count: 0 };
    cur.sum += r.score || 0;
    cur.count += 1;
    byDay.set(key, cur);
  }

  const trend7d = Array.from({ length: 7 }).map((_, idx) => {
    const d = addDays(trendStart, idx);
    const key = d.toISOString().split("T")[0];
    const v = byDay.get(key);
    const avgScore = v && v.count ? Math.round((v.sum / v.count) * 10) / 10 : null;
    return { date: key, avg: avgScore, count: v?.count ?? 0 };
  });

  return {
    today: today.toISOString().split("T")[0],
    todayMyScore: todayMine?.score ?? null,
    partnerRatedToday: Boolean(todayPartner),
    myAvg30,
    ourAvg30,
    totalCount30: last30.length,
    trend7d,
  };
}

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectToDatabase();

  const stats = await getStats(session.coupleId, session.role);
  return NextResponse.json(stats);
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { score?: unknown };
  const scoreNum = typeof body.score === "number" ? body.score : Number(body.score);
  if (!Number.isFinite(scoreNum) || scoreNum < 1 || scoreNum > 5) {
    return NextResponse.json({ error: "invalid_score" }, { status: 400 });
  }

  await connectToDatabase();

  const role = session.role as "A" | "B";
  const otherRole: "A" | "B" = role === "A" ? "B" : "A";
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  await DailyRatingModel.findOneAndUpdate(
    { coupleId: session.coupleId, date: { $gte: today, $lt: tomorrow }, fromRole: role },
    {
      $set: {
        toRole: otherRole,
        score: scoreNum,
      },
      $setOnInsert: {
        coupleId: session.coupleId,
        date: today,
        fromRole: role,
      },
    },
    { upsert: true, new: true }
  );

  const stats = await getStats(session.coupleId, role);
  return NextResponse.json({ ok: true, ...stats });
}

export async function PATCH() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  }

  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectToDatabase();

  const filter = { coupleId: session.coupleId, score: { $gt: 5 } };

  const res = await DailyRatingModel.updateMany(
    filter,
    [
      {
        $set: {
          score: { $ceil: { $divide: ["$score", 2] } },
        },
      },
    ] as any
  );

  const stats = await getStats(session.coupleId, session.role);
  return NextResponse.json({
    ok: true,
    matched: (res as any).matchedCount ?? (res as any).n ?? 0,
    modified: (res as any).modifiedCount ?? (res as any).nModified ?? 0,
    ...stats,
  });
}
