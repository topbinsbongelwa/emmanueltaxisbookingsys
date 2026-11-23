/**
 * Shared, client-safe payload builder and FormSubmit sender.
 * Both the server route and the browser fallback use these functions so the
 * email body is identical no matter which side sends it.
 */

export type BookingEmailType = "new" | "updated" | "cancelled" | "reminder";

/** The booking fields needed to build a notification email. */
export interface NotificationBooking {
  id: string;
  date: string;
  time: string;
  type?: string | null;
  pickup: string;
  dest: string;
  pax: number;
  guest?: string | null;
  phone?: string | null;
  email?: string | null;
  driver?: string | null;
  vehicle?: string | null;
  createdBy?: string | null;
}

/** Everything fetch needs in order to submit one FormSubmit email. */
export interface FormSubmitRequest {
  url: string;
  headers: Record<string, string>;
  body: Record<string, string>;
}

export interface EmailResult {
  ok: boolean;
  error?: string;
}

const SUBJECTS: Record<BookingEmailType, string> = {
  new: "New Booking",
  updated: "Booking Updated",
  cancelled: "Booking Cancelled",
  reminder: "Booking Reminder (Tomorrow)",
};

const asText = (value: unknown): string => String(value ?? "").trim();

/**
 * Build a generic FormSubmit AJAX request. `recipient` is passed in by the
 * caller (server config or the endpoint returned by the server to the browser).
 */
export function buildFormSubmitRequest(
  recipient: string,
  fields: Record<string, string>,
  origin?: string
): FormSubmitRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (origin) {
    headers.Origin = origin;
    headers.Referer = origin;
  }
  return {
    url: `https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`,
    headers,
    body: fields,
  };
}

/** Build the exact payload used for create / update / cancel / reminder emails. */
export function buildBookingEmailRequest(
  booking: NotificationBooking,
  type: BookingEmailType,
  recipient: string,
  origin?: string
): FormSubmitRequest {
  const guest = asText(booking.guest) || "Guest";
  const date = asText(booking.date);
  const fields: Record<string, string> = {
    _subject: `${SUBJECTS[type]}: ${guest} - ${date}`,
    _template: "table",
    _captcha: "false",
    "Booking ID": asText(booking.id),
    Guest: guest,
    "Contact number": asText(booking.phone) || "-",
    "Service type (tour/transfer)": asText(booking.type) || "transfer",
    Date: date,
    Time: asText(booking.time),
    "Pickup point": asText(booking.pickup),
    Destination: asText(booking.dest),
    "Number of guests": asText(booking.pax) || "1",
    Driver: asText(booking.driver) || "-",
    Vehicle: asText(booking.vehicle) || "-",
    "Created by": asText(booking.createdBy) || "-",
  };
  return buildFormSubmitRequest(recipient, fields, origin);
}

/** Build the single digest email sent by the daily reminder cron. */
export function buildReminderDigestRequest(
  bookings: NotificationBooking[],
  date: string,
  recipient: string,
  origin?: string
): FormSubmitRequest {
  const fields: Record<string, string> = {
    _subject: `Tomorrow's Bookings (${date}) - ${bookings.length}`,
    _template: "table",
    _captcha: "false",
    Date: date,
    "Number of bookings": String(bookings.length),
  };
  bookings.forEach((booking, index) => {
    fields[`Booking ${index + 1}`] = [
      asText(booking.time),
      `${asText(booking.type) || "transfer"} ${asText(booking.pickup)} -> ${asText(booking.dest)}`,
      `${asText(booking.pax) || "1"} guest(s)`,
      `${asText(booking.guest) || "Guest"} / ${asText(booking.phone) || "no phone"}`,
      `Driver: ${asText(booking.driver) || "-"}; Vehicle: ${asText(booking.vehicle) || "-"}`,
      `Created by: ${asText(booking.createdBy) || "-"}`,
    ].join(" | ");
  });
  return buildFormSubmitRequest(recipient, fields, origin);
}

/**
 * Submit one FormSubmit request. Never throws: callers use the ok flag to
 * decide whether to show a success toast or launch the browser fallback.
 */
export async function sendFormSubmitRequest(
  request: FormSubmitRequest
): Promise<EmailResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    // Browsers forbid scripts from setting Origin/Referer; the browser supplies
    // its own values. Server-side calls keep the explicit values from config.
    const headers =
      typeof window === "undefined"
        ? request.headers
        : {
            "Content-Type": request.headers["Content-Type"],
            Accept: request.headers.Accept,
          };
    const response = await fetch(request.url, {
      method: "POST",
      headers,
      body: JSON.stringify(request.body),
      signal: controller.signal,
    });
    const raw = await response.text();
    let json: unknown = null;
    try {
      json = JSON.parse(raw);
    } catch {
      // Non-JSON responses are treated as failures below.
    }
    const success =
      json && typeof json === "object"
        ? (json as { success?: unknown }).success
        : undefined;
    if (success === "true" || success === true) return { ok: true };
    let error = raw || `HTTP ${response.status}`;
    if (json && typeof json === "object" && "message" in json) {
      error = asText((json as { message?: unknown }).message) || error;
    }
    return { ok: false, error };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}
