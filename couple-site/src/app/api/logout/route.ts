import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  cookieStore.set("couple_id", "", { httpOnly: true, path: "/", maxAge: 0 });
  cookieStore.set("role", "", { httpOnly: true, path: "/", maxAge: 0 });
  
  return NextResponse.redirect("/enter");
}

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set("couple_id", "", { httpOnly: true, path: "/", maxAge: 0 });
  cookieStore.set("role", "", { httpOnly: true, path: "/", maxAge: 0 });
  
  return NextResponse.redirect("/enter");
}
