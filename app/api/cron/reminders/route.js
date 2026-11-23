import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { notifyReminderDigest } from "@/lib/notify";
import { withApi } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Tomorrow's date in Africa/Harare (UTC+2 all year). */
function harareTomorrow() {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Vercel Hobby runs this once a day at 06:00 UTC / 08:00 Harare.
 * One digest email covers every non-cancelled booking still needing a reminder.
 */
export const GET = withApi(async (req) => {
  if (
    !config.cronSecret ||
    req.headers.get("authorization") !== `Bearer ${config.cronSecret}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const date = harareTomorrow();
  const bookings = await prisma.booking.findMany({
    where: { date, status: { not: "cancelled" }, reminderSentAt: null },
    orderBy: { time: "asc" },
  });
  if (!bookings.length) {
    return Response.json({ date, count: 0, ok: true, skipped: true });
  }

  // Show a human name in the email instead of the raw createdBy id.
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(bookings.map((b) => b.createdBy))] } },
    select: { id: true, name: true, email: true },
  });
  const names = new Map(users.map((u) => [u.id, u.name || u.email || u.id]));
  const emailBookings = bookings.map((booking) => ({
    ...booking,
    createdBy: names.get(booking.createdBy) || booking.createdBy,
  }));

  const result = await notifyReminderDigest(emailBookings, date);
  if (result.ok) {
    // Only mark delivered when FormSubmit accepted the email.
    await prisma.booking.updateMany({
      where: { id: { in: bookings.map((b) => b.id) } },
      data: { reminderSentAt: new Date(), reminderSent: true },
    });
  }
  return Response.json({ date, count: bookings.length, ...result });
});
