import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { hashPassword, signAuthToken } from "@/lib/auth";
import { UserModel } from "@/models/User";

export async function POST(req: Request) {
  const body = (await req.json()) as { username?: string; password?: string; displayName?: string };
  const username = body.username?.trim();
  const displayName = body.displayName?.trim();
  const password = body.password ?? "";

  if (!username || !displayName || password.length < 6) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  await connectToDatabase();

  const existing = await UserModel.findOne({ username }).lean();
  if (existing) {
    return NextResponse.json({ error: "username_taken" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await UserModel.create({ username, displayName, passwordHash });

  const token = signAuthToken({ userId: user._id.toString() });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
