import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/request";
import { CoupleModel } from "@/models/Couple";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ session: null });

  await connectToDatabase();
  const couple = await CoupleModel.findById(session.coupleId).lean();
  if (!couple) return NextResponse.json({ session: null });

  return NextResponse.json({
    session: {
      coupleId: session.coupleId,
      role: session.role,
      inviteCode: couple.inviteCode,
    },
  });
}
