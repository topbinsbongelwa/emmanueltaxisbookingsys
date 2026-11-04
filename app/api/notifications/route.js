import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
export async function GET() {
  if (!(await getSession())) return Response.json({ error: "Sign in" }, { status: 401 });
  return Response.json(await prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 15 }));
}
export async function POST() {
  if (!(await getSession())) return Response.json({ error: "Sign in" }, { status: 401 });
  await prisma.notification.updateMany({ data: { read: true } });
  return Response.json({ ok: true });
}
