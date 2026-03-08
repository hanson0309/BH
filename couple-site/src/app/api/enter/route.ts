import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { FIXED_INVITE_CODE } from "@/lib/invite";
import { CoupleModel } from "@/models/Couple";

export async function POST(req: Request) {
  const body = (await req.json()) as { code?: string; role?: string };
  const code = body.code?.trim();
  const role = body.role;

  if (code !== FIXED_INVITE_CODE) {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }
  if (role !== "A" && role !== "B") {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  await connectToDatabase();

  let couple = await CoupleModel.findOne({ inviteCode: FIXED_INVITE_CODE });
  if (!couple) {
    couple = await CoupleModel.create({ inviteCode: FIXED_INVITE_CODE, memberIds: [] });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("couple_id", couple._id.toString(), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  res.cookies.set("role", role, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
