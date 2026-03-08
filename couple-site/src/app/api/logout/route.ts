import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  cookieStore.set("couple_id", "", { httpOnly: true, path: "/", maxAge: 0 });
  cookieStore.set("role", "", { httpOnly: true, path: "/", maxAge: 0 });
  
  return NextResponse.redirect(new URL("/enter", new URL("/", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")));
}

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set("couple_id", "", { httpOnly: true, path: "/", maxAge: 0 });
  cookieStore.set("role", "", { httpOnly: true, path: "/", maxAge: 0 });
  
  return NextResponse.redirect(new URL("/enter", new URL("/", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")));
}
