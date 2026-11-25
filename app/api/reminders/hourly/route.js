import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getBookingAccessUserIds } from "@/lib/bookings";
import { notifyBooking } from "@/lib/notify";
import { config } from "@/lib/config";
import { withApi } from "@/lib/api";

export const dynamic = "force-dynamic";

const CAT_OFFSET_MS = 2 * 60 * 60 * 1000;

const nowCat = () => new Date(Date.now() + CAT_OFFSET_MS);
const dayKey = (d) => d.toISOString().slice(0, 10);

function catDate(value) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return dayKey(new Date(parsed.getTime() + CAT_OFFSET_MS));
    }
  }
  return raw.slice(0, 10);
}

function catMinutes(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (match) return Number(match[1]) * 60 + Number(match[2]);
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      const cat = new Date(parsed.getTime() + CAT_OFFSET_MS).toISOString();
      return Number(cat.slice(11, 13)) * 60 + Number(cat.slice(14, 16));
    }
  }
  return null;
}

export const POST = withApi(async (req) => {
  const authorization = req.headers.get("authorization");
  const isCron = !!config.cronSecret && authorization === `Bearer ${config.cronSecret}`;
  const session = isCron ? null : await getSession();
  if (!isCron && !session) return Response.json({ error: "Sign in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const bookingId = body.bookingId ? String(body.bookingId).slice(0, 200) : null;

  const now = nowCat();
  const today = dayKey(now);
  const tomorrow = dayKey(new Date(now.getTime() + 86400e3));
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  const where = {
    status: { not: "cancelled" },
    hourReminderSentAt: null,
    ...(bookingId ? { id: bookingId } : {}),
  };
  if (!isCron) where.createdBy = { in: await getBookingAccessUserIds(session) };

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });
  const due = bookings.filter((booking) => {
    const minutes = catMinutes(booking.time);
    if (minutes === null) return false;
    const date = catDate(booking.date);
    const dayOffset = date === tomorrow ? 1440 : date === today ? 0 : null;
    if (dayOffset === null) return false;
    const until = dayOffset + minutes - nowMinutes;
    return until > 0 && until <= 60;
  });
  if (!due.length) return Response.json({ count: 0, ok: true, skipped: true });

  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(due.map((b) => b.createdBy))] } },
    select: { id: true, name: true, email: true },
  });
  const names = new Map(users.map((u) => [u.id, u.name || u.email || u.id]));

  const results = [];
  for (const booking of due) {
    const emailBooking = {
      ...booking,
      createdBy: names.get(booking.createdBy) || booking.createdBy,
    };
    const result = await notifyBooking(emailBooking, "reminder1h");
    if (result.ok) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { hourReminderSentAt: new Date() },
      });
    }
    results.push({ id: booking.id, ...result });
  }

  return Response.json({
    count: due.length,
    ok: results.every((r) => r.ok),
    results,
  });
});
