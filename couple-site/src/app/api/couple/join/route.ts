import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { getAuthUserIdFromCookies } from "@/lib/request";
import { CoupleModel } from "@/models/Couple";
import { UserModel } from "@/models/User";

export async function POST(req: Request) {
  const userId = await getAuthUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { inviteCode?: string };
  const inviteCode = body.inviteCode?.trim().toUpperCase();
  if (!inviteCode) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  await connectToDatabase();

  const user = await UserModel.findById(userId);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.coupleId) return NextResponse.json({ error: "already_in_couple" }, { status: 400 });

  const couple = await CoupleModel.findOne({ inviteCode });
  if (!couple) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (couple.memberIds.length >= 2) {
    return NextResponse.json({ error: "couple_full" }, { status: 400 });
  }

  couple.memberIds.push(user._id);
  await couple.save();

  user.coupleId = couple._id;
  await user.save();

  return NextResponse.json({ ok: true });
}
