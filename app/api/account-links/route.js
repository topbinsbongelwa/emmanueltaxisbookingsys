import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { withApi } from "@/lib/api";

const userSummary = (user) => ({ id: user.id, name: user.name, email: user.email });
const no = (error, status = 400) => Response.json({ error }, { status });

export const GET = withApi(async () => {
  const session = await getSession();
  if (!session) return no("Sign in", 401);

  const links = await prisma.accountLink.findMany({
    where: {
      OR: [{ requesterId: session.id }, { recipientId: session.id }],
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({
    linked: links.filter((link) => link.status === "accepted").map((link) => ({
      id: link.id,
      user: userSummary(link.requesterId === session.id ? link.recipient : link.requester),
    })),
    incoming: links.filter((link) => link.status === "pending" && link.recipientId === session.id).map((link) => ({
      id: link.id,
      user: userSummary(link.requester),
    })),
    outgoing: links.filter((link) => link.status === "pending" && link.requesterId === session.id).map((link) => ({
      id: link.id,
      user: userSummary(link.recipient),
    })),
  });
});

export const POST = withApi(async (req) => {
  const session = await getSession();
  if (!session) return no("Sign in", 401);
  const body = await req.json();

  if (body.action === "accept" || body.action === "decline") {
    if (typeof body.linkId !== "string") return no("Choose a valid account request.");
    const link = await prisma.accountLink.findFirst({
      where: { id: body.linkId, recipientId: session.id, status: "pending" },
    });
    if (!link) return no("Account request not found.", 404);
    await prisma.accountLink.update({
      where: { id: link.id },
      data: { status: body.action === "accept" ? "accepted" : "declined" },
    });
    return Response.json({ ok: true });
  }

  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return no("Enter a valid account email.");
  const recipient = await prisma.user.findUnique({ where: { email } });
  if (!recipient) return no("No account found with that email.", 404);
  if (recipient.id === session.id) return no("You cannot link your account to itself.");

  const existing = await prisma.accountLink.findFirst({
    where: {
      OR: [
        { requesterId: session.id, recipientId: recipient.id },
        { requesterId: recipient.id, recipientId: session.id },
      ],
    },
  });
  if (existing?.status === "accepted" || existing?.status === "pending") {
    return Response.json({ ok: true });
  }
  if (existing?.status === "declined") {
    await prisma.accountLink.update({
      where: { id: existing.id },
      data: { requesterId: session.id, recipientId: recipient.id, status: "pending", createdAt: new Date() },
    });
    return Response.json({ ok: true });
  }
  if (existing) return no("This account declined the previous link request.", 409);

  await prisma.accountLink.create({
    data: { requesterId: session.id, recipientId: recipient.id },
  });
  return Response.json({ ok: true }, { status: 201 });
});

export const DELETE = withApi(async (req) => {
  const session = await getSession();
  if (!session) return no("Sign in", 401);
  const { linkId } = await req.json();
  if (typeof linkId !== "string") return no("Choose a valid account link.");

  const link = await prisma.accountLink.findFirst({
    where: {
      id: linkId,
      OR: [{ requesterId: session.id }, { recipientId: session.id }],
    },
  });
  if (!link) return no("Account link not found.", 404);
  if (link.status === "pending" && link.requesterId !== session.id) {
    await prisma.accountLink.update({ where: { id: link.id }, data: { status: "declined" } });
  } else {
    await prisma.accountLink.delete({ where: { id: link.id } });
  }
  return Response.json({ ok: true });
});
