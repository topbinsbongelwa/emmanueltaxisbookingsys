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

## React Native app
The Expo app in `mobile/` supports iOS and Android and shares accounts, bookings, and notifications with the web app. Its interface and splash screen use a clean white background.

1. Start the backend with `npm run dev`.
2. Copy `mobile/.env.example` to `mobile/.env`. Set `EXPO_PUBLIC_API_URL` to the backend URL reachable from your phone or emulator: use `http://10.0.2.2:3000` for the Android emulator, `http://localhost:3000` for the iOS simulator, or your computer's LAN IP for a physical device.
3. In `mobile/`, run `npm install`, then `npx expo install expo-notifications expo-device expo-constants expo-secure-store`, then `npm start`.
4. Open the project in Expo Go on a physical device to sign in and manage bookings. Remote push delivery requires an EAS-built native app (it is not available in Expo Go). From `mobile/`, run `npx eas-cli@latest init` and configure Android/iOS push credentials in EAS. EAS adds the project ID to the app config; for local overrides, set `EXPO_PUBLIC_EAS_PROJECT_ID` in `mobile/.env`. Build an Android test APK with `npx eas-cli@latest build --profile preview --platform android`; production builds use the `production` profile in `mobile/eas.json`.

## Deploying
SQLite is for local use only. For Vercel switch `provider` in `prisma/schema.prisma` to `postgresql` and set DATABASE_URL (Neon, Supabase, etc.), then run `npx prisma db push`.

## WhatsApp note
Meta's Cloud API only allows free-text messages within 24 hours of the admin last messaging your business number. For reliable notifications outside this window, create an approved message template and send that instead (change the body in `lib/digest.js`).
