import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { signAuthToken, verifyPassword } from "@/lib/auth";
import { UserModel } from "@/models/User";

export async function POST(req: Request) {
  const body = (await req.json()) as { username?: string; password?: string };
  const username = body.username?.trim();
  const password = body.password ?? "";

  if (!username || !password) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  await connectToDatabase();

  const user = await UserModel.findOne({ username });
  if (!user) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

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
