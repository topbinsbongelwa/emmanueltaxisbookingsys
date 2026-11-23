/**
 * Server-side email notifications via FormSubmit.
 *
 * FIRST-TIME ACTIVATION (do this once):
 * The very first submission to https://formsubmit.co/ajax/<address> makes
 * FormSubmit send an activation email to mthabisi45@gmail.com. Someone must
 * open that email and click "Activate" before any message is delivered. Until
 * then FormSubmit may answer with a failure and the dashboard will show the
 * red ✗ / "email could not be sent" message. After activation FormSubmit gives
 * you a random alias address; put it in FORMSUBMIT_ALIAS to hide the real email.
 *
 * This module never throws and never rolls back a booking save.
 */
import { prisma } from "./db";
import { config } from "./config";
import {
  buildBookingEmailRequest,
  buildReminderDigestRequest,
  sendFormSubmitRequest,
  type BookingEmailType,
  type EmailResult,
  type NotificationBooking,
} from "./booking-email";

export type NotifyResult = EmailResult;

/** Store the outcome so the dashboard can show a live delivery history. */
async function logNotification(
  bookingId: string | null,
  type: BookingEmailType,
  result: NotifyResult
): Promise<void> {
  try {
    await prisma.notificationLog.create({
      data: {
        bookingId,
        type,
        ok: result.ok,
        error: result.error ? String(result.error).slice(0, 2000) : null,
      },
    });
  } catch (error) {
    console.error("Could not write NotificationLog:", error);
  }
}

/** Send one booking email (new / updated / cancelled / reminder). */
export async function notifyBooking(
  booking: NotificationBooking,
  type: BookingEmailType
): Promise<NotifyResult> {
  let result: NotifyResult = { ok: false, error: "Unknown email error" };
  try {
    const request = buildBookingEmailRequest(
      booking,
      type,
      config.notifyEmail,
      config.siteUrl
    );
    result = await sendFormSubmitRequest(request);
    if (!result.ok) console.error("Booking email failed:", result.error);
  } catch (error) {
    result = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    console.error("Booking email failed:", error);
  }
  await logNotification(booking.id, type, result);
  return result;
}

/**
 * Send the single 1-day-before digest for all of tomorrow's bookings.
 * One email is sent for the whole list; bookingId is null in the log because
 * the email covers several bookings.
 */
export async function notifyReminderDigest(
  bookings: NotificationBooking[],
  date: string
): Promise<NotifyResult> {
  let result: NotifyResult = { ok: false, error: "Unknown email error" };
  try {
    const request = buildReminderDigestRequest(
      bookings,
      date,
      config.notifyEmail,
      config.siteUrl
    );
    result = await sendFormSubmitRequest(request);
    if (!result.ok) console.error("Reminder digest failed:", result.error);
  } catch (error) {
    result = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    console.error("Reminder digest failed:", error);
  }
  await logNotification(null, "reminder", result);
  return result;
}
