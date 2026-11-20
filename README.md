# Tours & Transfers Bookings (Next.js)

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env` and set AUTH_SECRET and CRON_SECRET.
3. `npx prisma db push`
4. `npm run dev`, then open http://localhost:3000. The FIRST account you create becomes the admin. Later accounts can sign up without an invite code.

## Notifications
New, updated, cancelled, and deleted bookings create in-app notifications for the booking owner and any accounts linked to that owner. New notifications also appear as a popup on the dashboard; enable browser alerts to get the same message as a system notification while the dashboard is open. A reminder is sent one day before each upcoming booking as both an email and a popup message reminder. A second site reminder pops up one hour before each booking while the dashboard is open (and as a system notification if browser alerts are enabled); it shows once per booking.

## Account privacy and sharing
Bookings are private to the account that created them. On the dashboard, enter another existing account's email to send a link request; bookings become visible to both accounts only after the recipient accepts. Either account can unlink at any time. The first account (admin) can see all bookings; other accounts see only their own and bookings shared through accepted links.

To receive booking emails, configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM (and optionally SMTP_FROM_NAME) in `.env`. Every booking and the one-day-before reminder are emailed to `BOOKING_NOTIFICATION_EMAIL` (defaults to `mthabisi45@gmail.com`), the address used to create the account that owns the booking (plus any linked accounts), the guest email entered on the booking, and ADMIN_EMAIL (or otherwise the first admin account). New accounts can be created with a name, valid email address, and password; email verification and SMTP are not required for signup. For WhatsApp, configure WA_TOKEN, WA_PHONE_ID, and ADMIN_WHATSAPP; the default WhatsApp number is +263 772 645 104 and the dashboard links to https://wa.me/263772645104.

For temporary testing, `DEV_TEST_EMAIL` in `.env` also receives every notification email; clear it when testing is done.

For the best chance of landing in the inbox, keep `SMTP_FROM` the same as `SMTP_USER`, and use a sending domain with SPF, DKIM and DMARC configured (Gmail SMTP signs messages with Google's DKIM). Each recipient gets their own email with a reply-to address, an explanation of why they received it, and a unique message ID so Gmail shows each booking as a separate new message instead of grouping them into one thread. If a first message still lands in Spam, mark it as "Not spam" so future messages are trusted. No code change can guarantee inbox placement.

The daily summary and next-day reminders are created and delivered by `GET /api/cron/daily`; Vercel runs it at 06:00 Harare time (04:00 UTC). Local development does not run the Vercel schedule, so trigger that route manually to test them.

## Native React Native app
The `mobile/` folder contains a bare React Native CLI app for iOS and Android; it does not use Expo or Expo Go. It shares accounts, bookings, and notifications with the web backend, with a white interface and red buttons matching the logo.

Follow [mobile/README.md](./mobile/README.md) to configure the backend and run the native app. Android requires Android Studio and an emulator or connected phone. Building the iOS app requires macOS and Xcode.

## Deploying
SQLite is for local development only. Vercel builds generate the PostgreSQL Prisma client from `prisma/schema.postgres.prisma`; local development keeps using `prisma/schema.prisma`.

1. Add a PostgreSQL database through the Vercel Marketplace or a provider such as Neon or Supabase.
2. Set `DATABASE_URL`, `AUTH_SECRET`, and `CRON_SECRET` in the Vercel project's Production environment. Use a long, unique random value for each secret. Add the same variables to Preview if preview deployments need to work.
3. Redeploy the project. The Vercel build runs `prisma db push` against `DATABASE_URL` automatically, so the tables are created on the first deployment. You can also run `npm run db:postgres` manually with the production `DATABASE_URL` set.
4. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, and optionally `ADMIN_EMAIL` in Vercel only if email notifications are wanted. In-app notifications are stored in PostgreSQL; browser alerts require each dashboard user to click **Enable browser alerts** and allow them in the browser.

Keep the model definitions in both Prisma schemas in sync when changing the database models.

## WhatsApp note
Meta's Cloud API only allows free-text messages within 24 hours of the admin last messaging your business number. For reliable notifications outside this window, create an approved message template and send that instead (change the body in `lib/digest.js`).
