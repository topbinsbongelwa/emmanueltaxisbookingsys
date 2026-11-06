import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getSession, setSession } from "@/lib/auth";
import { withApi } from "@/lib/api";
const no = (error, status = 400) => Response.json({ error }, { status });
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

async function validateSignupDetails(body) {
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const password = String(body.password || "");
  if (!validEmail(email) || password.length < 8 || !name) {
    return { error: "Enter your name, a valid email and a password of 8+ characters." };
  }
  if (await prisma.user.findUnique({ where: { email } })) return { error: "That email already has an account." };
  return { email, name, password };
}

export const GET = withApi(async () => {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in" }, { status: 401 });
  return Response.json({ user: { id: session.id, name: session.name, role: session.role } });
});
export const POST = withApi(async (req) => {
  const b = await req.json();
  if (b.mode === "logout") { cookies().delete("s"); return Response.json({ ok: true }); }
  const email = String(b.email || "").trim().toLowerCase(), password = String(b.password || "");
  if (b.mode === "signup") {
    const details = await validateSignupDetails(b);
    if (details.error) return no(details.error);
    const n = await prisma.user.count();
    const u = await prisma.user.create({
      data: { name: details.name, email, password: await bcrypt.hash(details.password, 10), role: n === 0 ? "admin" : "staff" },
    });
    const token = await setSession(u);
    return Response.json({ ok: true, token, user: { id: u.id, name: u.name, email: u.email, role: u.role } });
  }
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u || !(await bcrypt.compare(password, u.password))) return no("Wrong email or password.", 401);
  const token = await setSession(u);
  return Response.json({ ok: true, token, user: { id: u.id, name: u.name, email: u.email, role: u.role } });
});
