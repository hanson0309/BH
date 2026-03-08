import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/request";
import { CapsuleModel } from "@/models/Capsule";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectToDatabase();
  const now = new Date();
  const items = await CapsuleModel.find({ coupleId: session.coupleId }).sort({ unlockAt: 1 }).lean();

  return NextResponse.json({
    capsules: items.map((c) => {
      const unlocked = new Date(c.unlockAt).getTime() <= now.getTime();
      return {
        id: c._id.toString(),
        title: c.title,
        unlockAt: c.unlockAt,
        createdByRole: c.createdByRole,
        unlocked,
        content: unlocked ? c.content : null,
      };
    }),
  });
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { title?: string; content?: string; unlockAt?: string };
  const title = body.title?.trim();
  const content = body.content?.trim();
  const unlockAtStr = body.unlockAt?.trim();

  if (!title || !content || !unlockAtStr) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (title.length > 100) return NextResponse.json({ error: "title_too_long" }, { status: 400 });
  if (content.length > 5000) return NextResponse.json({ error: "content_too_long" }, { status: 400 });

  const unlockAt = new Date(unlockAtStr);
  if (Number.isNaN(unlockAt.getTime())) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  await connectToDatabase();
  const capsule = await CapsuleModel.create({
    coupleId: session.coupleId,
    title,
    content,
    unlockAt,
    createdByRole: session.role,
  });

  return NextResponse.json({ id: capsule._id.toString() });
}

export async function DELETE(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  await connectToDatabase();
  const result = await CapsuleModel.deleteOne({ _id: id, coupleId: session.coupleId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
