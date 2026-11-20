import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getBookingAccessUserIds, getBookingShareUserIds, pick } from "@/lib/bookings";
import { publishNotification } from "@/lib/notify";
import { withApi } from "@/lib/api";
export const PATCH = withApi(async (req, { params }) => {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in" }, { status: 401 });
  const userIds = await getBookingAccessUserIds(session);
  const previous = await prisma.booking.findFirst({ where: { id: params.id, createdBy: { in: userIds } } });
  if (!previous) return Response.json({ error: "Booking not found" }, { status: 404 });
  const changes = pick(await req.json());
  const data = { ...changes };
  if (changes.date && changes.date !== previous.date) data.reminderSent = false;
  const booking = await prisma.booking.update({ where: { id: params.id }, data });
  const changed = Object.keys(changes).filter((key) => changes[key] !== previous[key]);
  if (changed.length) {
    const details = `${booking.date} ${booking.time}: ${booking.pickup} to ${booking.dest}; ${booking.pax} guest${booking.pax === 1 ? "" : "s"}${booking.guest ? `; ${booking.guest}` : ""}${booking.email ? `; ${booking.email}` : ""}`;
    const titles = { pending: "Booking pending", booked: "Booking booked", approved: "Booking approved", cancelled: "Booking cancelled" };
    await publishNotification(titles[booking.status] || "Booking updated", `${details}\nChanged: ${changed.join(", ")}`, {
      emailTo: booking.email,
      userIds: await getBookingShareUserIds(previous.createdBy),
    });
  }
  return Response.json(booking);
});
export const DELETE = withApi(async (_req, { params }) => {
  const s = await getSession();
  if (!s || s.role !== "admin") return Response.json({ error: "Admins only" }, { status: 403 });
  const userIds = await getBookingAccessUserIds(s);
  const booking = await prisma.booking.findFirst({ where: { id: params.id, createdBy: { in: userIds } } });
  if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });
  await prisma.booking.delete({ where: { id: params.id } });
  await publishNotification("Booking deleted", `${booking.date} ${booking.time}: ${booking.pickup} to ${booking.dest}`, {
    emailTo: booking.email,
    userIds: await getBookingShareUserIds(booking.createdBy),
  });
  return Response.json({ ok: true });
});
