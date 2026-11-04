import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { pick } from "@/lib/bookings";
import { publishNotification } from "@/lib/notify";
import { withApi } from "@/lib/api";
export const GET = withApi(async () => {
  if (!(await getSession())) return Response.json({ error: "Sign in" }, { status: 401 });
  return Response.json(await prisma.booking.findMany({ orderBy: [{ date: "asc" }, { time: "asc" }], take: 1000 }));
});
export const POST = withApi(async (req) => {
  const s = await getSession();
  if (!s) return Response.json({ error: "Sign in" }, { status: 401 });
  const d = pick(await req.json());
  if (!d.date || !d.time || !d.pickup || !d.dest) return Response.json({ error: "Date, time, pickup and destination are required." }, { status: 400 });
  const booking = await prisma.booking.create({ data: { ...d, status: "pending", createdBy: s.id } });
  const details = `${booking.date} ${booking.time}: ${booking.pickup} to ${booking.dest}; ${booking.pax} guest${booking.pax === 1 ? "" : "s"}${booking.guest ? `; ${booking.guest}` : ""}${booking.email ? `; ${booking.email}` : ""}`;
  await publishNotification("New booking", details, { emailTo: booking.email });
  return Response.json(booking);
});
