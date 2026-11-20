import nodemailer from "nodemailer";

export async function sendEmail({ to, subject, text, html, replyTo }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_FROM_NAME } = process.env;
  const port = Number(SMTP_PORT || 587);
  const from = SMTP_FROM || SMTP_USER;
  const name = String(SMTP_FROM_NAME || "Emmanuel Tours & Transfers").replace(/["\\\r\n]/g, "");
  const domain = String(from).split("@")[1] || "localhost";
  const id = `${Date.now()}.${Math.random().toString(36).slice(2)}@${domain}`;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { minVersion: "TLSv1.2" },
    envelope: { from, to },
  }).sendMail({
    from: `"${name}" <${from}>`,
    to,
    replyTo: replyTo || from,
    subject,
    text,
    html,
    headers: {
      "Message-ID": `<${id}>`,
      "X-Entity-Ref-ID": id,
      "X-Auto-Response-Suppress": "OOF, AutoReply",
    },
  });
}
