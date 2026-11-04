import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
export async function middleware(req) {
  try {
    await jwtVerify(req.cookies.get("s")?.value, new TextEncoder().encode(process.env.AUTH_SECRET));
    return NextResponse.next();
  } catch { return NextResponse.redirect(new URL("/login", req.url)); }
}
export const config = { matcher: ["/dashboard/:path*"] };
