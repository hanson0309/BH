import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/request";
import { PhotoModel } from "@/models/Photo";

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");

  await connectToDatabase();

  const query: Record<string, unknown> = { coupleId: session.coupleId };
  if (cursor) query._id = { $lt: cursor };

  const photos = await PhotoModel.find(query).sort({ _id: -1 }).limit(30).lean();

  return NextResponse.json({
    photos: photos.map((p) => ({
      id: p._id.toString(),
      uploadedByRole: p.uploadedByRole,
      caption: p.caption,
      tags: p.tags,
      takenAt: p.takenAt,
      contentType: p.contentType,
      base64: p.base64,
      width: p.width,
      height: p.height,
      createdAt: p.createdAt,
    })),
    nextCursor: photos.length > 0 ? photos[photos.length - 1]._id.toString() : null,
  });
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    caption?: string;
    tags?: string[];
    takenAt?: string | null;
    contentType?: string;
    base64?: string;
    width?: number | null;
    height?: number | null;
  };

  const contentType = body.contentType?.trim();
  const base64 = body.base64;
  const caption = (body.caption ?? "").trim();
  const tags = Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 10) : [];
  const takenAt = body.takenAt ? new Date(body.takenAt) : null;

  if (!contentType || !contentType.startsWith("image/")) {
    return NextResponse.json({ error: "invalid_content_type" }, { status: 400 });
  }
  if (!base64 || typeof base64 !== "string") {
    return NextResponse.json({ error: "invalid_base64" }, { status: 400 });
  }
  if (base64.length > 1_500_000) {
    return NextResponse.json({ error: "image_too_large" }, { status: 400 });
  }
  if (caption.length > 200) {
    return NextResponse.json({ error: "caption_too_long" }, { status: 400 });
  }

  await connectToDatabase();

  const photo = await PhotoModel.create({
    coupleId: session.coupleId,
    uploadedByRole: session.role,
    caption,
    tags,
    takenAt: takenAt && !Number.isNaN(takenAt.getTime()) ? takenAt : null,
    contentType,
    base64,
    width: body.width ?? null,
    height: body.height ?? null,
  });

  return NextResponse.json({ id: photo._id.toString() });
}

export async function DELETE(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  await connectToDatabase();
  const result = await PhotoModel.deleteOne({ _id: id, coupleId: session.coupleId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
