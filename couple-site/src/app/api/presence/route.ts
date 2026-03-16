import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/request";
import { connectToDatabase } from "@/lib/db";
import { CoupleModel } from "@/models/Couple";

// 更新当前用户的在线状态（心跳）
export async function POST() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  // 使用简化的字段名
  const fieldName = session.role === "A" ? "presenceA" : "presenceB";
  
  const result = await CoupleModel.updateOne(
    { _id: session.coupleId },
    { $set: { [fieldName]: new Date() } }
  );

  console.log(`Heartbeat: ${session.role} -> ${fieldName}, modified: ${result.modifiedCount}, matched: ${result.matchedCount}`);

  // 立即验证是否保存成功
  const verify = await CoupleModel.findById(session.coupleId).lean();
  console.log(`Verify ${fieldName}:`, verify?.[fieldName]);

  return NextResponse.json({ ok: true, role: session.role });
}

// 获取伴侣的在线状态
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const couple = await CoupleModel.findById(session.coupleId).lean();
  if (!couple) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const partnerRole = session.role === "A" ? "B" : "A";
  const fieldName = partnerRole === "A" ? "presenceA" : "presenceB";
  const partnerLastSeen = couple[fieldName];
  
  // 获取伴侣的名字
  const partnerProfile = couple.memberProfiles?.[partnerRole];
  const partnerName = partnerProfile?.name || partnerProfile?.nickname || `TA (${partnerRole})`;

  console.log(`Check presence for ${partnerName}:`, partnerLastSeen);

  // 判断在线状态：2分钟内活跃视为在线
  const now = new Date();
  const ONLINE_THRESHOLD = 2 * 60 * 1000; // 2分钟

  let isOnline = false;
  let lastSeenText = "从未上线";

  if (partnerLastSeen) {
    const diff = now.getTime() - new Date(partnerLastSeen).getTime();
    isOnline = diff < ONLINE_THRESHOLD;

    // 格式化最后在线时间
    if (diff < 60 * 1000) {
      lastSeenText = "刚刚";
    } else if (diff < 60 * 60 * 1000) {
      lastSeenText = `${Math.floor(diff / (60 * 1000))}分钟前`;
    } else if (diff < 24 * 60 * 60 * 1000) {
      lastSeenText = `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
    } else {
      lastSeenText = new Date(partnerLastSeen).toLocaleDateString("zh-CN");
    }
  }

  return NextResponse.json({
    isOnline,
    lastSeen: partnerLastSeen,
    lastSeenText,
    partnerRole,
    partnerName,
  });
}
