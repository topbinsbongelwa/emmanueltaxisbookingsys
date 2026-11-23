# Tours & Transfers Bookings (Next.js)

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL`, `AUTH_SECRET` and a long random `CRON_SECRET`.
3. `npm run db` (Prisma schema push creates/updates the SQLite tables).
4. `npm run dev`, then open http://localhost:3000. The FIRST account you create becomes the admin.

## Email notifications (FormSubmit)

Booking emails go **only** to `mthabisi45@gmail.com` through the free FormSubmit AJAX endpoint. No SMTP account, custom domain, paid service or WhatsApp is required.

- Saving a booking emails `New Booking: {guest} - {date}`.
- Editing emails `Booking Updated: ...`; cancelling emails `Booking Cancelled: ...`.
- A single digest email `Tomorrow's Bookings ({date}) - {count}` is sent once a day for all non-cancelled bookings dated tomorrow in Africa/Harare (UTC+2). Only bookings whose email succeeded are marked with `reminderSentAt`, so a failed email is retried on the next run.
- If FormSubmit rejects a server-side call, the dashboard resends the exact same payload from the browser and then shows the toast: **"Booking saved and emailed"** or **"Booking saved, but the email could not be sent"**.
- The dashboard also shows a permanent **Tomorrow's bookings** banner so a reminder is never lost, plus an **Email notifications** section with the last 20 delivery results (green ✓ / red ✗) read from `NotificationLog`.

### FIRST-TIME ACTIVATION (required once)
The first submission to FormSubmit sends an activation email to `mthabisi45@gmail.com`. Someone must open that email and click **Activate** once; until then no email is delivered. After activation FormSubmit provides a random alias address. Put that alias in `FORMSUBMIT_ALIAS` (in `.env.local` and in Vercel) to hide the real mailbox. The code uses `FORMSUBMIT_ALIAS || NOTIFY_EMAIL || mthabisi45@gmail.com`, so email still works on Vercel before you add any variables.

### Verify email without making a booking
Administrators can click **Send test email** on the dashboard. It calls `POST /api/test-notify`, which also accepts `Authorization: Bearer <CRON_SECRET>` for manual testing from a terminal. The result is logged and shown as a toast.

## In-app notifications
New, updated and cancelled bookings also create in-app notifications for the booking owner and linked accounts. Popups appear on the dashboard; each user can enable browser alerts. A second site reminder pops up one hour before each booking while the dashboard is open.

## Account privacy and sharing
Bookings are private to the account that created them. On the dashboard, enter another existing account's email to send a link request; bookings become visible to both accounts only after the recipient accepts. Either account can unlink at any time. The first account (admin) can see all bookings.

## Deploying (Vercel Hobby)
SQLite is for local development only. Vercel builds use the PostgreSQL Prisma client from `prisma/schema.postgres.prisma`.

1. Add a PostgreSQL database through the Vercel Marketplace or a provider such as Neon/Supabase, and set `DATABASE_URL` and `AUTH_SECRET` in **Settings > Environment Variables** (Production, and Preview if needed).
2. Add these variables in Vercel:
   - `CRON_SECRET` — **required**, a long random string (32+ characters); protects the reminder cron and the test endpoint.
   - `SITE_URL` — recommended, your live URL (e.g. `https://your-project.vercel.app`). Without it the code uses Vercel's `VERCEL_PROJECT_PRODUCTION_URL` and falls back to `http://localhost:3000`.
   - `FORMSUBMIT_ALIAS` — optional, only after FormSubmit activation if you want to hide the real email.
3. Push to GitHub. `vercel-build` runs `prisma db push` automatically, which applies the new `Booking.reminderSentAt` field and `NotificationLog` table. No manual migration command is needed on Vercel.
4. `vercel.json` schedules `/api/cron/reminders` once a day at `0 6 * * *` (06:00 UTC = 08:00 Harare). Vercel Hobby allows only one cron per day, so the old daily digest path was removed from the schedule.

Keep the model definitions in `prisma/schema.prisma` and `prisma/schema.postgres.prisma` in sync.

## Quick checklist after deploy
1. Open the dashboard and click **Send test email**; click **Activate** in FormSubmit's first activation email, then test again.
2. Create a booking; the Save toast must say "Booking saved and emailed" and a green ✓ appears in **Email notifications**.
3. Add a booking for tomorrow and check the **Tomorrow's bookings** banner.
4. Trigger the cron once manually with `curl -H "Authorization: Bearer <CRON_SECRET>" https://<your-site>/api/cron/reminders` and confirm one digest email plus a green ✓ log entry.
