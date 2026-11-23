import { prisma } from "./db";

// In-app notifications only. Booking emails go through lib/notify.ts
// (FormSubmit); there is no SMTP or WhatsApp delivery in this app.

async function deliverPush(title, body, userIds) {
  if (!userIds.length) return { push: 0 };
  try {
    const devices = await prisma.device.findMany({
      where: { userId: { in: userIds } },
      select: { id: true, token: true },
    });
    if (!devices.length) return { push: 0 };
    let sent = 0;
    const invalid = [];
    for (let i = 0; i < devices.length; i += 100) {
      const batch = devices.slice(i, i + 100);
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(process.env.EXPO_ACCESS_TOKEN
            ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
            : {}),
        },
        body: JSON.stringify(
          batch.map((device) => ({
            to: device.token,
            title,
            body,
            sound: "default",
            channelId: "bookings",
          }))
        ),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(JSON.stringify(payload));
      for (const [index, ticket] of (payload.data || []).entries()) {
        if (ticket.status === "ok") sent++;
        else if (ticket.details?.error === "DeviceNotRegistered")
          invalid.push(batch[index].id);
        else
          console.error(
            "Expo push notification failed:",
            ticket.message || ticket.details?.error
          );
      }
    }
    if (invalid.length)
      await prisma.device.deleteMany({ where: { id: { in: invalid } } });
    return { push: sent };
  } catch (error) {
    console.error("Push notification failed:", error);
    return { push: String(error?.message || error) };
  }
}

export async function publishNotification(title, body, options = {}) {
  const userIds = [...new Set(options.userIds || [])];
  if (userIds.length) {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({ title, body, userId })),
    });
  }
  return deliverPush(title, body, userIds);
}
