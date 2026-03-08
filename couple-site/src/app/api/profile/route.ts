import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { CoupleModel } from "@/models/Couple";
import { getSessionFromCookies } from "@/lib/request";

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

  const profile = couple.memberProfiles?.[session.role] || { name: "", birthday: null, avatar: "", nickname: "" };
  const otherRole = session.role === "A" ? "B" : "A";
  const otherProfile = couple.memberProfiles?.[otherRole] || { name: "", birthday: null, avatar: "", nickname: "" };

  return NextResponse.json({
    me: {
      role: session.role,
      name: profile.name || "",
      birthday: profile.birthday ? new Date(profile.birthday).toISOString().split("T")[0] : null,
      avatar: profile.avatar || "",
      nickname: profile.nickname || "",
    },
    partner: {
      role: otherRole,
      name: otherProfile.name || "",
      birthday: otherProfile.birthday ? new Date(otherProfile.birthday).toISOString().split("T")[0] : null,
      avatar: otherProfile.avatar || "",
      nickname: otherProfile.nickname || "",
    },
    togetherSince: couple.togetherSince ? new Date(couple.togetherSince).toISOString().split("T")[0] : null,
  });
}

// 通过 invite code 查询（进入页面用）
export async function POST(request: Request) {
  const body = await request.json();
  const { inviteCode } = body;

  if (!inviteCode || typeof inviteCode !== "string") {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  await connectToDatabase();
  const couple = await CoupleModel.findOne({ inviteCode }).lean();
  
  if (!couple) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const profileA = couple.memberProfiles?.["A"] || { name: "", birthday: null, avatar: "", nickname: "" };
  const profileB = couple.memberProfiles?.["B"] || { name: "", birthday: null, avatar: "", nickname: "" };

  return NextResponse.json({
    A: {
      name: profileA.name || "",
      birthday: profileA.birthday ? new Date(profileA.birthday).toISOString().split("T")[0] : null,
      avatar: profileA.avatar || "",
      nickname: profileA.nickname || "",
    },
    B: {
      name: profileB.name || "",
      birthday: profileB.birthday ? new Date(profileB.birthday).toISOString().split("T")[0] : null,
      avatar: profileB.avatar || "",
      nickname: profileB.nickname || "",
    },
  });
}

export async function PUT(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, birthday, avatar, partnerNickname, togetherSince } = body;

  await connectToDatabase();

  // 查找文档
  const couple = await CoupleModel.findById(session.coupleId);
  if (!couple) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }


  const role = session.role;
  const otherRole = role === "A" ? "B" : "A";
  
  // 确保 memberProfiles 存在
  if (!couple.memberProfiles) {
    (couple as unknown as { memberProfiles: Record<string, unknown> }).memberProfiles = {};
  }
  
  // 确保当前角色存在
  const memberProfiles = (couple as unknown as { memberProfiles: Record<string, unknown> }).memberProfiles;
  if (!memberProfiles[role]) {
    memberProfiles[role] = {};
  }

  // 更新字段
  const roleProfile = memberProfiles[role] as Record<string, unknown>;
  if (name !== undefined) roleProfile.name = name;
  if (birthday !== undefined) roleProfile.birthday = birthday ? new Date(birthday) : null;
  if (avatar !== undefined) roleProfile.avatar = avatar;
  if (partnerNickname !== undefined) {
    roleProfile.nickname = partnerNickname;
  }
  // 更新在一起日期
  if (togetherSince !== undefined) {
    await CoupleModel.updateOne(
      { _id: session.coupleId },
      { $set: { togetherSince: togetherSince ? new Date(togetherSince) : null } }
    );
  }


  // 保存
  await couple.save();
  
  // 重新查询确保数据已保存
  const saved = await CoupleModel.findById(session.coupleId).lean();
  // 返回更新后的数据
  const savedProfiles = (saved as { memberProfiles?: Record<string, { name?: string; birthday?: Date | null; avatar?: string; nickname?: string }> })?.memberProfiles;
  const profile = savedProfiles?.[role] || { name: "", birthday: null, avatar: "", nickname: "" };
  const otherProfile = savedProfiles?.[otherRole] || { name: "", birthday: null, avatar: "", nickname: "" };

  const togetherSinceValue = (saved as { togetherSince?: Date })?.togetherSince;
  return NextResponse.json({
    me: {
      role: role,
      name: profile.name || "",
      birthday: profile.birthday ? new Date(profile.birthday).toISOString().split("T")[0] : null,
      avatar: profile.avatar || "",
      nickname: profile.nickname || "",
    },
    partner: {
      role: otherRole,
      name: otherProfile.name || "",
      birthday: otherProfile.birthday ? new Date(otherProfile.birthday).toISOString().split("T")[0] : null,
      avatar: otherProfile.avatar || "",
      nickname: otherProfile.nickname || "",
    },
    togetherSince: togetherSinceValue 
      ? new Date(togetherSinceValue).toISOString().split("T")[0] 
      : null,
  });
}
