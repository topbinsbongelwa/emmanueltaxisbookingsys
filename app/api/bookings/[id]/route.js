import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getBookingAccessUserIds, getBookingShareUserIds, pick } from "@/lib/bookings";
import { publishNotification } from "@/lib/in-app-notify";
import { notifyBooking } from "@/lib/notify";
import { buildBookingEmailRequest } from "@/lib/booking-email";
import { config } from "@/lib/config";
import { withApi } from "@/lib/api";

function emailFields(booking, type, result) {
  if (result.ok) return { emailFailed: false };
  return {
    emailFailed: true,
    emailError: result.error,
    emailType: type,
    emailRequest: buildBookingEmailRequest(booking, type, config.notifyEmail, config.siteUrl),
  };
}

export const PATCH = withApi(async (req, { params }) => {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in" }, { status: 401 });
  const userIds = await getBookingAccessUserIds(session);
  const previous = await prisma.booking.findFirst({ where: { id: params.id, createdBy: { in: userIds } } });
  if (!previous) return Response.json({ error: "Booking not found" }, { status: 404 });

  const changes = pick(await req.json());
  const data = { ...changes };
  const rescheduled =
    (changes.date && changes.date !== previous.date) ||
    (changes.time && changes.time !== previous.time);
  const reopened =
    previous.status === "cancelled" && changes.status && changes.status !== "cancelled";
  // A changed date/time (or reopening a cancelled booking) needs a fresh reminder.
  if (rescheduled || reopened) {
    data.reminderSentAt = null;
    data.reminderSent = false;
    data.hourReminderSentAt = null;
  }

  const booking = await prisma.booking.update({ where: { id: params.id }, data });
  const changed = Object.keys(changes).filter((key) => changes[key] !== previous[key]);
  if (!changed.length) return Response.json(booking);

  const type = changes.status === "cancelled" && previous.status !== "cancelled"
    ? "cancelled"
    : "updated";
  const emailBooking = {
    ...booking,
    createdBy: session.name || session.email || booking.createdBy,
  };
  const email = await notifyBooking(emailBooking, type);

  try {
    await publishNotification(
      type === "cancelled" ? "Booking cancelled" : "Booking updated",
      `${booking.date} ${booking.time}: ${booking.pickup} to ${booking.dest}; changed: ${changed.join(", ")}`,
      { userIds: await getBookingShareUserIds(previous.createdBy) }
    );
  } catch (error) {
    console.error("In-app notification failed:", error);
  }

  return Response.json({ ...booking, ...emailFields(emailBooking, type, email) });
});

export const DELETE = withApi(async (_req, { params }) => {
  const s = await getSession();
  if (!s || s.role !== "admin") return Response.json({ error: "Admins only" }, { status: 403 });
  const userIds = await getBookingAccessUserIds(s);
  const booking = await prisma.booking.findFirst({ where: { id: params.id, createdBy: { in: userIds } } });
  if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });
  await prisma.booking.delete({ where: { id: params.id } });
  try {
    await publishNotification("Booking deleted", `${booking.date} ${booking.time}: ${booking.pickup} to ${booking.dest}`, {
      userIds: await getBookingShareUserIds(booking.createdBy),
    });
  } catch (error) {
    console.error("In-app notification failed:", error);
  }
  return Response.json({ ok: true });
});
