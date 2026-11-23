import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getBookingAccessUserIds, getBookingShareUserIds, pick } from "@/lib/bookings";
import { publishNotification } from "@/lib/in-app-notify";
import { notifyBooking } from "@/lib/notify";
import { buildBookingEmailRequest } from "@/lib/booking-email";
import { config } from "@/lib/config";
import { withApi } from "@/lib/api";

/** Add browser-fallback information only when the server-side email failed. */
function emailFields(booking, type, result) {
  if (result.ok) return { emailFailed: false };
  return {
    emailFailed: true,
    emailError: result.error,
    emailType: type,
    emailRequest: buildBookingEmailRequest(booking, type, config.notifyEmail, config.siteUrl),
  };
}

export const GET = withApi(async () => {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in" }, { status: 401 });
  const userIds = await getBookingAccessUserIds(session);
  return Response.json(await prisma.booking.findMany({
    where: { createdBy: { in: userIds } },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    take: 1000,
  }));
});

export const POST = withApi(async (req) => {
  const s = await getSession();
  if (!s) return Response.json({ error: "Sign in" }, { status: 401 });
  const d = pick(await req.json());
  if (!d.date || !d.time || !d.pickup || !d.dest) return Response.json({ error: "Date, time, pickup and destination are required." }, { status: 400 });

  // Save first. Email and in-app notification failures must never undo this.
  const booking = await prisma.booking.create({ data: { ...d, status: "pending", createdBy: s.id } });
  const emailBooking = { ...booking, createdBy: s.name || s.email || booking.createdBy };
  const email = await notifyBooking(emailBooking, "new");

  try {
    const userIds = await getBookingShareUserIds(s.id);
    await publishNotification(`New booking: ${booking.guest || "Guest"}`, `${booking.date} ${booking.time}: ${booking.pickup} to ${booking.dest}`, { userIds });
  } catch (error) {
    console.error("In-app notification failed:", error);
  }

  return Response.json({ ...booking, ...emailFields(emailBooking, "new", email) });
});
