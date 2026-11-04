# Tours & Transfers Bookings (Next.js)

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env` and set AUTH_SECRET, SIGNUP_CODE, and CRON_SECRET.
3. `npx prisma db push`
4. `npm run dev`, then open http://localhost:3000. The FIRST account you create becomes the admin. Later accounts need SIGNUP_CODE.

## Notifications
New, updated, cancelled, and deleted bookings create in-app notifications. Enable browser alerts from the dashboard to receive them while the dashboard is open.

To receive email, configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in `.env`. Booking emails are sent to the guest email entered on the booking and to ADMIN_EMAIL (or otherwise the first admin account). For WhatsApp, configure WA_TOKEN, WA_PHONE_ID, and ADMIN_WHATSAPP; the default WhatsApp number is +263 772 645 104 and the dashboard links to https://wa.me/263772645104.

The daily summary is created and delivered by `GET /api/cron/daily`; Vercel runs it at 06:00 Harare time (04:00 UTC). Local development does not run the Vercel schedule, so trigger that route manually to test a summary.

## Native React Native app
The `mobile/` folder contains a bare React Native CLI app for iOS and Android; it does not use Expo or Expo Go. It shares accounts, bookings, and notifications with the web backend, with a white interface and red buttons matching the logo.

Follow [mobile/README.md](./mobile/README.md) to configure the backend and run the native app. Android requires Android Studio and an emulator or connected phone. Building the iOS app requires macOS and Xcode.

## Deploying
SQLite is for local development only. Vercel builds generate the PostgreSQL Prisma client from `prisma/schema.postgres.prisma`; local development keeps using `prisma/schema.prisma`.

1. Add a PostgreSQL database through the Vercel Marketplace or a provider such as Neon or Supabase.
2. Set `DATABASE_URL`, `AUTH_SECRET`, `SIGNUP_CODE`, and `CRON_SECRET` in the Vercel project's Production environment. Use a long, unique random value for each secret. Add the same variables to Preview if preview deployments need to work.
3. Redeploy the project. The Vercel build runs `prisma db push` against `DATABASE_URL` automatically, so the tables are created on the first deployment. You can also run `npm run db:postgres` manually with the production `DATABASE_URL` set.
4. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, and optionally `ADMIN_EMAIL` in Vercel only if email notifications are wanted. In-app notifications are stored in PostgreSQL; browser alerts require each dashboard user to click **Enable browser alerts** and allow them in the browser.

Keep the model definitions in both Prisma schemas in sync when changing the database models.

## WhatsApp note
Meta's Cloud API only allows free-text messages within 24 hours of the admin last messaging your business number. For reliable notifications outside this window, create an approved message template and send that instead (change the body in `lib/digest.js`).
