import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/auth";
const no = (error, status = 400) => Response.json({ error }, { status });
export async function POST(req) {
  const b = await req.json();
  if (b.mode === "logout") { cookies().delete("s"); return Response.json({ ok: true }); }
  const email = String(b.email || "").trim().toLowerCase(), password = String(b.password || "");
  if (b.mode === "signup") {
    if (!email.includes("@") || password.length < 8 || !String(b.name || "").trim()) return no("Enter your name, a valid email and a password of 8+ characters.");
    const n = await prisma.user.count();
    if (n > 0 && (!process.env.SIGNUP_CODE || b.code !== process.env.SIGNUP_CODE)) return no("Invite code is wrong.", 403);
    if (await prisma.user.findUnique({ where: { email } })) return no("That email already has an account.");
    const u = await prisma.user.create({ data: { name: b.name.trim(), email, password: await bcrypt.hash(password, 10), role: n === 0 ? "admin" : "staff" } });
    const token = await setSession(u);
    return Response.json({ ok: true, token, user: { id: u.id, name: u.name, email: u.email, role: u.role } });
  }
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u || !(await bcrypt.compare(password, u.password))) return no("Wrong email or password.", 401);
  const token = await setSession(u);
  return Response.json({ ok: true, token, user: { id: u.id, name: u.name, email: u.email, role: u.role } });
}
