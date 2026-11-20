import { prisma } from "./db";

const F = ["date", "time", "type", "pickup", "dest", "guest", "email", "phone", "driver", "vehicle", "notes", "status"];
export async function getBookingShareUserIds(userId) {
  const owner = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!owner) return [];
  const links = await prisma.accountLink.findMany({
    where: {
      status: "accepted",
      OR: [{ requesterId: userId }, { recipientId: userId }],
    },
    select: { requesterId: true, recipientId: true },
  });
  return [...new Set([userId, ...links.map((link) =>
    link.requesterId === userId ? link.recipientId : link.requesterId
  )])];
}

export function pick(b) {
  const o = {};
  F.forEach((k) => { if (b[k] !== undefined) o[k] = String(b[k]).trim(); });
  if (b.pax !== undefined) o.pax = Math.max(1, parseInt(b.pax) || 1);
  if (o.status && !["pending", "booked", "approved", "done", "cancelled"].includes(o.status)) delete o.status;
  if (o.type && !["transfer", "tour"].includes(o.type)) o.type = "transfer";
  return o;
}

export async function getBookingAccessUserIds(session) {
  if (session.role === "admin") {
    const users = await prisma.user.findMany({ select: { id: true } });
    return users.map((user) => user.id);
  }
  return getBookingShareUserIds(session.id);
}
