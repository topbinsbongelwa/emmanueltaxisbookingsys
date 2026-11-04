import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { withApi } from "@/lib/api";

export const POST = withApi(async (req) => {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in" }, { status: 401 });
  const { token } = await req.json();
  if (typeof token !== "string" || !/^Expo(nent)?PushToken\[[^\]]+\]$/.test(token)) {
    return Response.json({ error: "Invalid Expo push token" }, { status: 400 });
  }
  await prisma.device.upsert({
    where: { token },
    update: { userId: session.id },
    create: { token, userId: session.id },
  });
  return Response.json({ ok: true });
});

export const DELETE = withApi(async (req) => {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in" }, { status: 401 });
  const { token } = await req.json();
  if (typeof token !== "string") return Response.json({ error: "Invalid Expo push token" }, { status: 400 });
  await prisma.device.deleteMany({ where: { token, userId: session.id } });
  return Response.json({ ok: true });
});
