import { publishNotification } from "./notify";
import { prisma } from "./db";
// Zimbabwe is UTC+2 all year
const harare = (n = 0) => { const d = new Date(Date.now() + 7200e3); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const line = (b) => `${b.time} ${b.pickup} to ${b.dest}, ${b.pax} guest${b.pax > 1 ? "s" : ""}, ${b.driver || "no driver"} / ${b.vehicle || "no vehicle"}`;
export async function sendDigest() {
  const t = harare(), tm = harare(1), y = harare(-1);
  const up = await prisma.booking.findMany({ where: { status: "booked", date: { in: [t, tm] } }, orderBy: [{ date: "asc" }, { time: "asc" }] });
  const done = await prisma.booking.findMany({ where: { status: "done", date: y }, orderBy: { time: "asc" } });
  const sec = (h, l) => h + "\n" + (l.length ? l.map(line).join("\n") : "None");
  const body = [sec("Today", up.filter((b) => b.date === t)), sec("Tomorrow", up.filter((b) => b.date === tm)), sec("Completed yesterday", done)].join("\n\n");
  const title = `Bookings: ${up.length} upcoming, ${done.length} completed yesterday`;
  return publishNotification(title, body);
}
