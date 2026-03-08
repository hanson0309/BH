import { NextResponse } from "next/server";
import crypto from "crypto";

import { connectToDatabase } from "@/lib/db";
import { getAuthUserIdFromCookies } from "@/lib/request";
import { CoupleModel } from "@/models/Couple";
import { UserModel } from "@/models/User";

function makeInviteCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export async function POST() {
  const userId = await getAuthUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectToDatabase();

  const user = await UserModel.findById(userId);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.coupleId) return NextResponse.json({ error: "already_in_couple" }, { status: 400 });

  let inviteCode = makeInviteCode();
  for (let i = 0; i < 5; i++) {
    const exists = await CoupleModel.findOne({ inviteCode }).lean();
    if (!exists) break;
    inviteCode = makeInviteCode();
  }

  const couple = await CoupleModel.create({ inviteCode, memberIds: [user._id] });
  user.coupleId = couple._id;
  await user.save();

  return NextResponse.json({
    couple: { id: couple._id.toString(), inviteCode: couple.inviteCode },
  });
}
