import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { withApi } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Last 20 FormSubmit delivery results shown on the dashboard. */
export const GET = withApi(async () => {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in" }, { status: 401 });
  return Response.json(
    await prisma.notificationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        bookingId: true,
        type: true,
        ok: true,
        error: true,
        createdAt: true,
      },
    })
  );
});

/** Record the result of a browser-side fallback retry so the log stays accurate. */
export const POST = withApi(async (req) => {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const type = ["new", "updated", "cancelled", "reminder"].includes(body.type)
    ? body.type
    : "new";
  await prisma.notificationLog.create({
    data: {
      bookingId: body.bookingId ? String(body.bookingId).slice(0, 200) : null,
      type,
      ok: !!body.ok,
      error: body.error ? String(body.error).slice(0, 2000) : null,
    },
  });
  return Response.json({ ok: true });
});
