# Tours & Transfers Bookings (Next.js)

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env` and set AUTH_SECRET, SIGNUP_CODE, and CRON_SECRET.
3. `npx prisma db push`
4. `npm run dev`, then open http://localhost:3000. The FIRST account you create becomes the admin. Later accounts need SIGNUP_CODE.

## Notifications
New, updated, cancelled, and deleted bookings create in-app notifications. Enable browser alerts from the dashboard to receive them while the dashboard is open.

To receive email, configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in `.env`. Email is sent to ADMIN_EMAIL when set, or otherwise to the first admin account. For WhatsApp, configure WA_TOKEN, WA_PHONE_ID, and ADMIN_WHATSAPP.

The daily summary is created and delivered by `GET /api/cron/daily`; Vercel runs it at 06:00 Harare time (04:00 UTC). Local development does not run the Vercel schedule, so trigger that route manually to test a summary.

## Native React Native app
The `mobile/` folder contains a bare React Native CLI app for iOS and Android; it does not use Expo or Expo Go. It shares accounts, bookings, and notifications with the web backend, with a white interface and red buttons matching the logo.

Follow [mobile/README.md](./mobile/README.md) to configure the backend and run the native app. Android requires Android Studio and an emulator or connected phone. Building the iOS app requires macOS and Xcode.

## Deploying
SQLite is for local use only. For Vercel switch `provider` in `prisma/schema.prisma` to `postgresql` and set DATABASE_URL (Neon, Supabase, etc.), then run `npx prisma db push`.

## WhatsApp note
Meta's Cloud API only allows free-text messages within 24 hours of the admin last messaging your business number. For reliable notifications outside this window, create an approved message template and send that instead (change the body in `lib/digest.js`).
