import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getBookingShareUserIds } from "@/lib/bookings";
import { withApi } from "@/lib/api";
export const GET = withApi(async () => {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in" }, { status: 401 });
  const userIds = await getBookingShareUserIds(session.id);
  return Response.json(await prisma.notification.findMany({
    where: { userId: { in: userIds } },
    orderBy: { createdAt: "desc" },
    take: 15,
  }));
});
export const POST = withApi(async () => {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in" }, { status: 401 });
  const userIds = await getBookingShareUserIds(session.id);
  await prisma.notification.updateMany({ where: { userId: { in: userIds } }, data: { read: true } });
  return Response.json({ ok: true });
});
