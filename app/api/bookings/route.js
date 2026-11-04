import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { pick } from "@/lib/bookings";
import { publishNotification } from "@/lib/notify";
export async function GET() {
  if (!(await getSession())) return Response.json({ error: "Sign in" }, { status: 401 });
  return Response.json(await prisma.booking.findMany({ orderBy: [{ date: "asc" }, { time: "asc" }], take: 1000 }));
}
export async function POST(req) {
  const s = await getSession();
  if (!s) return Response.json({ error: "Sign in" }, { status: 401 });
  const d = pick(await req.json());
  if (!d.date || !d.time || !d.pickup || !d.dest) return Response.json({ error: "Date, time, pickup and destination are required." }, { status: 400 });
  const booking = await prisma.booking.create({ data: { ...d, status: "booked", createdBy: s.id } });
  const details = `${booking.date} ${booking.time}: ${booking.pickup} to ${booking.dest}; ${booking.pax} guest${booking.pax === 1 ? "" : "s"}${booking.guest ? `; ${booking.guest}` : ""}`;
  await publishNotification("New booking", details);
  return Response.json(booking);
}
