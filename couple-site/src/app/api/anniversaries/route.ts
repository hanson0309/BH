import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/request";
import { CoupleModel } from "@/models/Couple";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectToDatabase();
  const couple = await CoupleModel.findById(session.coupleId).lean();
  if (!couple) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const anniversaries = (couple.anniversaries ?? []) as Array<{ title: string; date: Date; recurring?: boolean }>;

  return NextResponse.json({
    anniversaries: anniversaries.map((a, idx) => ({
      id: String(idx),
      title: a.title,
      date: a.date,
      recurring: a.recurring ?? false,
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { title?: string; date?: string; recurring?: boolean };
  
  const title = body.title?.trim();
  const dateStr = body.date?.trim();
  const recurring = body.recurring ?? false;
  
  if (!title || !dateStr) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  await connectToDatabase();
  const couple = await CoupleModel.findById(session.coupleId);
  if (!couple) return NextResponse.json({ error: "not_found" }, { status: 404 });

  couple.anniversaries = couple.anniversaries || [];
  couple.anniversaries.push({ title, date, recurring });
  await couple.save();

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const idxStr = searchParams.get("idx");
  const idx = idxStr ? Number(idxStr) : NaN;
  if (!Number.isFinite(idx)) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  await connectToDatabase();
  const couple = await CoupleModel.findById(session.coupleId);
  if (!couple) return NextResponse.json({ error: "not_found" }, { status: 404 });

  couple.anniversaries = couple.anniversaries || [];
  if (idx < 0 || idx >= couple.anniversaries.length) {
    return NextResponse.json({ error: "invalid_index" }, { status: 400 });
  }

  couple.anniversaries.splice(idx, 1);
  await couple.save();

  return NextResponse.json({ ok: true });
}
