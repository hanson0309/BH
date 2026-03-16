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

  // 生成头像 URL（如果不是 base64 则保留原值）
  const getAvatarUrl = (avatar: string, role: "A" | "B") => {
    if (!avatar) return "";
    // 如果已经是 URL（不是 base64），直接使用
    if (!avatar.startsWith("data:")) return avatar;
    // 否则生成 API URL
    return `/api/avatar?role=${role}`;
  };

  return NextResponse.json({
    me: {
      role: session.role,
      name: profile.name || "",
      birthday: profile.birthday ? new Date(profile.birthday).toISOString().split("T")[0] : null,
      avatar: getAvatarUrl(profile.avatar || "", session.role),
      nickname: profile.nickname || "",
    },
    partner: {
      role: otherRole,
      name: otherProfile.name || "",
      birthday: otherProfile.birthday ? new Date(otherProfile.birthday).toISOString().split("T")[0] : null,
      avatar: getAvatarUrl(otherProfile.avatar || "", otherRole),
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

  // 生成头像 URL
  const getAvatarUrl = (avatar: string, role: "A" | "B") => {
    if (!avatar) return "";
    if (!avatar.startsWith("data:")) return avatar;
    return `/api/avatar?role=${role}`;
  };

  return NextResponse.json({
    A: {
      name: profileA.name || "",
      birthday: profileA.birthday ? new Date(profileA.birthday).toISOString().split("T")[0] : null,
      avatar: getAvatarUrl(profileA.avatar || "", "A"),
      nickname: profileA.nickname || "",
    },
    B: {
      name: profileB.name || "",
      birthday: profileB.birthday ? new Date(profileB.birthday).toISOString().split("T")[0] : null,
      avatar: getAvatarUrl(profileB.avatar || "", "B"),
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
    // 保存到对方的 profile，而不是自己的
    if (!memberProfiles[otherRole]) {
      memberProfiles[otherRole] = {};
    }
    const otherProfile = memberProfiles[otherRole] as Record<string, unknown>;
    otherProfile.nickname = partnerNickname;
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

  // 生成头像 URL
  const getAvatarUrl = (avatar: string, r: "A" | "B") => {
    if (!avatar) return "";
    if (!avatar.startsWith("data:")) return avatar;
    return `/api/avatar?role=${r}`;
  };

  const togetherSinceValue = (saved as { togetherSince?: Date })?.togetherSince;
  return NextResponse.json({
    me: {
      role: role,
      name: profile.name || "",
      birthday: profile.birthday ? new Date(profile.birthday).toISOString().split("T")[0] : null,
      avatar: getAvatarUrl(profile.avatar || "", role),
      nickname: profile.nickname || "",
    },
    partner: {
      role: otherRole,
      name: otherProfile.name || "",
      birthday: otherProfile.birthday ? new Date(otherProfile.birthday).toISOString().split("T")[0] : null,
      avatar: getAvatarUrl(otherProfile.avatar || "", otherRole),
      nickname: otherProfile.nickname || "",
    },
    togetherSince: togetherSinceValue 
      ? new Date(togetherSinceValue).toISOString().split("T")[0] 
      : null,
  });
}
