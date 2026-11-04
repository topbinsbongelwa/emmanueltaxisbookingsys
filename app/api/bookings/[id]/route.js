import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { pick } from "@/lib/bookings";
import { publishNotification } from "@/lib/notify";
import { withApi } from "@/lib/api";
export const PATCH = withApi(async (req, { params }) => {
  if (!(await getSession())) return Response.json({ error: "Sign in" }, { status: 401 });
  const previous = await prisma.booking.findUnique({ where: { id: params.id } });
  if (!previous) return Response.json({ error: "Booking not found" }, { status: 404 });
  const changes = pick(await req.json());
  const booking = await prisma.booking.update({ where: { id: params.id }, data: changes });
  const changed = Object.keys(changes).filter((key) => changes[key] !== previous[key]);
  if (changed.length) {
    const details = `${booking.date} ${booking.time}: ${booking.pickup} to ${booking.dest}; ${booking.pax} guest${booking.pax === 1 ? "" : "s"}${booking.guest ? `; ${booking.guest}` : ""}`;
    const titles = { pending: "Booking pending", booked: "Booking booked", approved: "Booking approved", cancelled: "Booking cancelled" };
    await publishNotification(titles[booking.status] || "Booking updated", `${details}\nChanged: ${changed.join(", ")}`);
  }
  return Response.json(booking);
});
export const DELETE = withApi(async (_req, { params }) => {
  const s = await getSession();
  if (!s || s.role !== "admin") return Response.json({ error: "Admins only" }, { status: 403 });
  const booking = await prisma.booking.findUnique({ where: { id: params.id } });
  if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });
  await prisma.booking.delete({ where: { id: params.id } });
  await publishNotification("Booking deleted", `${booking.date} ${booking.time}: ${booking.pickup} to ${booking.dest}`);
  return Response.json({ ok: true });
});
