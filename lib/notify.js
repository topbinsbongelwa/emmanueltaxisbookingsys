import { prisma } from "./db";
import { sendEmail as deliverEmail } from "./email";

const BUSINESS_WHATSAPP = "263772645104";
const whatsappLink = `https://wa.me/${BUSINESS_WHATSAPP}`;
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function deliver(title, body, options = {}) {
  const e = process.env;
  const result = { app: true };
  const admin = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
    select: { email: true },
  });
  const recipients = [...new Set([options.emailTo, e.ADMIN_EMAIL, admin?.email].filter(validEmail))];
  const sendEmail = async () => {
    if (!e.SMTP_HOST || !recipients.length) return;
    try {
      await deliverEmail({
        to: recipients.join(", "),
        subject: title,
        text: `${body}\n\nWhatsApp: ${whatsappLink}`,
        html: `<p>${escapeHtml(body).replace(/\n/g, "<br />")}</p><p><a href="${whatsappLink}">Chat with us on WhatsApp</a></p>`,
      });
      result.email = true;
    } catch (error) {
      console.error("Email notification failed:", error);
      result.email = String(error.message);
    }
  };
  const sendWhatsApp = async () => {
    if (!e.WA_TOKEN || !e.WA_PHONE_ID) return;
    try {
      const to = String(e.ADMIN_WHATSAPP || BUSINESS_WHATSAPP).replace(/[^\d]/g, "");
      const response = await fetch(`https://graph.facebook.com/v20.0/${e.WA_PHONE_ID}/messages`, {
        method: "POST",
        headers: { Authorization: "Bearer " + e.WA_TOKEN, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: `${title}\n\n${body}\n\nWhatsApp: ${whatsappLink}` },
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      result.whatsapp = true;
    } catch (error) {
      console.error("WhatsApp notification failed:", error);
      result.whatsapp = String(error.message);
    }
  };
  const sendPush = async () => {
    try {
      const devices = await prisma.device.findMany({ select: { id: true, token: true } });
      if (!devices.length) return;
      let sent = 0;
      const invalid = [];
      for (let i = 0; i < devices.length; i += 100) {
        const batch = devices.slice(i, i + 100);
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(e.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${e.EXPO_ACCESS_TOKEN}` } : {}),
          },
          body: JSON.stringify(batch.map((device) => ({
            to: device.token,
            title,
            body,
            sound: "default",
            channelId: "bookings",
          }))),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(JSON.stringify(payload));
        for (const [index, ticket] of (payload.data || []).entries()) {
          if (ticket.status === "ok") sent++;
          else if (ticket.details?.error === "DeviceNotRegistered") invalid.push(batch[index].id);
          else console.error("Expo push notification failed:", ticket.message || ticket.details?.error);
        }
      }
      if (invalid.length) await prisma.device.deleteMany({ where: { id: { in: invalid } } });
      result.push = sent;
    } catch (error) {
      console.error("Push notification failed:", error);
      result.push = String(error.message);
    }
  };
  await Promise.all([sendEmail(), sendWhatsApp(), sendPush()]);
  return result;
}

export async function publishNotification(title, body, options = {}) {
  await prisma.notification.create({ data: { title, body } });
  return deliver(title, body, options);
}

export { BUSINESS_WHATSAPP, whatsappLink };
