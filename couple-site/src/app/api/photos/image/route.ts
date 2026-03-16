import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/request";
import { PhotoModel } from "@/models/Photo";

// 获取照片图片
export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  await connectToDatabase();

  const photo = await PhotoModel.findOne({
    _id: id,
    coupleId: session.coupleId,
  }).lean();

  if (!photo) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const base64 = photo.base64 as string;
  const contentType = photo.contentType as string;

  // 将 base64 转换为二进制
  const buffer = Buffer.from(base64, "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable", // 缓存一年
    },
  });
}
