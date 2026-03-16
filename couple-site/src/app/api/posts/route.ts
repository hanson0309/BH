import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/request";
import { PostModel } from "@/models/Post";

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");

  await connectToDatabase();

  const query: Record<string, unknown> = { coupleId: session.coupleId };
  if (cursor) query._id = { $lt: cursor };

  const posts = await PostModel.find(query)
    .sort({ _id: -1 })
    .limit(20)
    .lean();

  return NextResponse.json({
    posts: posts.map((p) => ({
      id: p._id.toString(),
      authorRole: p.authorRole,
      coupleId: p.coupleId.toString(),
      text: p.text,
      images: p.images,
      createdAt: p.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    text?: string;
    images?: Array<{ contentType: string; base64: string; width?: number; height?: number }>;
  };

  const text = body.text ?? "";
  const images = body.images ?? [];

  if (text.length > 2000) return NextResponse.json({ error: "text_too_long" }, { status: 400 });
  if (images.length > 6) return NextResponse.json({ error: "too_many_images" }, { status: 400 });

  for (const img of images) {
    if (!img?.contentType?.startsWith("image/")) {
      return NextResponse.json({ error: "invalid_image" }, { status: 400 });
    }
    if (!img.base64 || img.base64.length > 2_000_000) {
      return NextResponse.json({ error: "image_too_large" }, { status: 400 });
    }
  }

  await connectToDatabase();

  const post = await PostModel.create({
    coupleId: session.coupleId,
    authorRole: session.role,
    text,
    images,
  });

  return NextResponse.json({ id: post._id.toString() });
}
