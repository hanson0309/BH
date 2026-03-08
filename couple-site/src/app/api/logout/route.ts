import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  cookieStore.set("couple_id", "", { httpOnly: true, path: "/", maxAge: 0 });
  cookieStore.set("role", "", { httpOnly: true, path: "/", maxAge: 0 });
  
  // 获取真实域名（处理 Render 等反向代理环境）
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  
  let url: URL;
  if (forwardedHost) {
    // 使用代理转发的真实域名
    const proto = forwardedProto || "https";
    url = new URL(`${proto}://${forwardedHost}/enter`);
  } else {
    // 本地开发环境
    url = new URL("/enter", request.url);
  }
  
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.set("couple_id", "", { httpOnly: true, path: "/", maxAge: 0 });
  cookieStore.set("role", "", { httpOnly: true, path: "/", maxAge: 0 });
  
  // 获取真实域名（处理 Render 等反向代理环境）
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  
  let url: URL;
  if (forwardedHost) {
    // 使用代理转发的真实域名
    const proto = forwardedProto || "https";
    url = new URL(`${proto}://${forwardedHost}/enter`);
  } else {
    // 本地开发环境
    url = new URL("/enter", request.url);
  }
  
  return NextResponse.redirect(url);
}
