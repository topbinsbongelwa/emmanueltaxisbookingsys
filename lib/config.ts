/**
 * Central configuration for email notifications.
 * Everything that needs the notify address or the public site URL reads it here.
 * FormSubmit alias takes priority so the real mailbox can be hidden after activation.
 */
const rawSiteUrl = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;

// Vercel exposes VERCEL_PROJECT_PRODUCTION_URL without a protocol; FormSubmit
// needs an absolute Origin/Referer, so add https:// when it is missing.
const siteUrl = rawSiteUrl
  ? /^https?:\/\//i.test(rawSiteUrl)
    ? rawSiteUrl
    : `https://${rawSiteUrl}`
  : "http://localhost:3000";

export const config = {
  notifyEmail:
    process.env.FORMSUBMIT_ALIAS ||
    process.env.NOTIFY_EMAIL ||
    "mthabisi45@gmail.com",
  siteUrl,
  cronSecret: process.env.CRON_SECRET || "",
} as const;
