import { getSession } from "@/lib/auth";
import { config } from "@/lib/config";
import { notifyBooking } from "@/lib/notify";
import { withApi } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Manual smoke test. Accepts either Bearer <CRON_SECRET> (curl / external)
 * or an authenticated admin session (dashboard button). No secret is sent
 * to the browser.
 */
export const POST = withApi(async (req) => {
  const authorizedByCron =
    !!config.cronSecret &&
    req.headers.get("authorization") === `Bearer ${config.cronSecret}`;
  if (!authorizedByCron) {
    const session = await getSession();
    if (!session) return Response.json({ error: "Sign in" }, { status: 401 });
    if (session.role !== "admin")
      return Response.json({ error: "Admins only" }, { status: 403 });
  }

  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  d.setUTCDate(d.getUTCDate() + 1);
  const date = d.toISOString().slice(0, 10);
  const sample = {
    id: `TEST-${date}`,
    date,
    time: "10:00",
    type: "transfer",
    pickup: "Victoria Falls Airport",
    dest: "Town centre",
    pax: 2,
    guest: "Test Guest",
    phone: "+263 700 000 000",
    driver: "Test Driver",
    vehicle: "Test Vehicle",
    createdBy: "Admin test",
  };
  const result = await notifyBooking(sample, "new");
  return Response.json({ ...result, email: config.notifyEmail });
});
