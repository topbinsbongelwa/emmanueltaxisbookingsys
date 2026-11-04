import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET);
export async function setSession(u) {
  const t = await new SignJWT({ id: u.id, role: u.role, name: u.name }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(key());
  cookies().set("s", t, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 604800 });
  return t;
}
export async function getSession() {
  const authorization = headers().get("authorization");
  const t = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : cookies().get("s")?.value;
  if (!t) return null;
  try { return (await jwtVerify(t, key())).payload; } catch { return null; }
}
