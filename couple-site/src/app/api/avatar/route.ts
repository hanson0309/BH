import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { CoupleModel } from "@/models/Couple";
import { getSessionFromCookies } from "@/lib/request";

// 获取头像图片
export async function GET(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") as "A" | "B" | null;

  if (!role || (role !== "A" && role !== "B")) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  await connectToDatabase();
  const couple = await CoupleModel.findById(session.coupleId).lean();
  if (!couple) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const avatar = couple.memberProfiles?.[role]?.avatar;

  if (!avatar) {
    return NextResponse.json({ error: "no_avatar" }, { status: 404 });
  }

  // 解析 base64 数据
  const match = avatar.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    // 如果不是 base64 格式，可能是旧数据或 URL，直接返回
    return NextResponse.json({ avatar });
  }

  const contentType = match[1];
  const base64Data = match[2];

  // 返回 base64 数据，但只返回纯 base64 部分让前端处理
  // 或者我们可以返回二进制数据
  const buffer = Buffer.from(base64Data, "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable", // 缓存一年
    },
  });
}
