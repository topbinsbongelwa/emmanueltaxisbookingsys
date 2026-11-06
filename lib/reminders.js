import { publishNotification } from "./notify";
import { prisma } from "./db";
// Zimbabwe is UTC+2 all year
const harare = (n = 0) => { const d = new Date(Date.now() + 7200e3); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const line = (b) => `${b.time} ${b.pickup} to ${b.dest}, ${b.pax} guest${b.pax > 1 ? "s" : ""}, ${b.driver || "no driver"} / ${b.vehicle || "no vehicle"}`;
export async function sendUpcomingReminders() {
  const tomorrow = harare(1);
  const bookings = await prisma.booking.findMany({
    where: { date: tomorrow, reminderSent: false, status: { in: ["pending", "booked", "approved"] } },
    orderBy: { time: "asc" },
  });
  let sent = 0;
  for (const booking of bookings) {
    const details = `${line(booking)}\n${booking.date}${booking.guest ? `; ${booking.guest}` : ""}${booking.phone ? `; ${booking.phone}` : ""}${booking.email ? `; ${booking.email}` : ""}`;
    await publishNotification("Upcoming booking tomorrow", details, { emailTo: booking.email });
    await prisma.booking.update({ where: { id: booking.id }, data: { reminderSent: true } });
    sent++;
  }
  return { date: tomorrow, sent };
}
