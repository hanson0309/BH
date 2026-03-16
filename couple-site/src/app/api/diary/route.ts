import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/request";
import { DiaryModel } from "@/models/Diary";

// 获取某个月的所有日记（按月份查询）
export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month"); // 0-11

  await connectToDatabase();

  const query: Record<string, unknown> = { coupleId: session.coupleId };

  // 如果指定了年月，筛选该月数据
  if (year && month !== null) {
    const y = Number(year);
    const m = Number(month);
    const startOfMonth = new Date(y, m, 1);
    const endOfMonth = new Date(y, m + 1, 1);
    query.date = { $gte: startOfMonth, $lt: endOfMonth };
  }

  const diaries = await DiaryModel.find(query).sort({ date: -1 }).lean();

  return NextResponse.json({
    diaries: diaries.map((d) => ({
      id: d._id.toString(),
      date: new Date(d.date).toISOString().split("T")[0],
      content: d.content,
      createdByRole: d.createdByRole,
      mood: d.mood || "",
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
  });
}

// 创建或更新日记（同一日期只能有一篇日记，重复则更新）
export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    date?: string; // YYYY-MM-DD
    content?: string;
    mood?: string;
  };

  const dateStr = body.date?.trim();
  const content = body.content?.trim();
  const mood = body.mood?.trim() || "";

  if (!dateStr || !content) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // 验证日期格式
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  // 内容长度限制
  if (content.length > 5000) {
    return NextResponse.json({ error: "content_too_long" }, { status: 400 });
  }

  await connectToDatabase();

  // 使用 upsert：如果该日期已有日记则更新，否则创建
  const diary = await DiaryModel.findOneAndUpdate(
    { coupleId: session.coupleId, date: { $gte: new Date(dateStr), $lt: new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000) } },
    {
      $set: {
        content,
        mood,
        createdByRole: session.role,
      },
      $setOnInsert: {
        coupleId: session.coupleId,
        date: new Date(dateStr),
      },
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({
    id: diary._id.toString(),
    date: new Date(diary.date).toISOString().split("T")[0],
    content: diary.content,
    mood: diary.mood || "",
  });
}

// 删除某天的日记
export async function DELETE(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date"); // YYYY-MM-DD

  if (!dateStr) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  await connectToDatabase();

  // 找到该日期的日记并删除
  const startOfDay = new Date(dateStr);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const result = await DiaryModel.deleteOne({
    coupleId: session.coupleId,
    date: { $gte: startOfDay, $lt: endOfDay },
  });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
