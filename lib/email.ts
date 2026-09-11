import { Resend } from 'resend';

const FROM_ADDRESS = 'SeatSync <bookings@seatsync.dev>';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.includes('xxxx')) return null;
  return new Resend(apiKey);
}

type BookingEmailDetails = {
  to: string;
  eventTitle: string;
  eventVenue: string;
  eventDate: Date;
  seats: number;
};

function formatEventDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short' }).format(date);
}

/**
 * Booking confirmation/cancellation emails are best-effort: a Resend outage
 * or misconfigured key must never fail the booking itself, so failures are
 * swallowed here rather than propagated to the caller.
 */
async function sendBookingEmail(subject: string, body: string, to: string): Promise<void> {
  const resend = getResendClient();
  if (!resend) return;

  try {
    await resend.emails.send({ from: FROM_ADDRESS, to, subject, text: body });
  } catch (err) {
    console.error('Failed to send booking email', err);
  }
}

export function sendBookingConfirmationEmail(details: BookingEmailDetails): Promise<void> {
  const { to, eventTitle, eventVenue, eventDate, seats } = details;
  return sendBookingEmail(
    `Booking confirmed: ${eventTitle}`,
    `You're booked for ${seats} seat(s) at ${eventTitle}, ${eventVenue}, on ${formatEventDate(eventDate)}.`,
    to,
  );
}

export function sendBookingCancellationEmail(details: BookingEmailDetails): Promise<void> {
  const { to, eventTitle, eventVenue, eventDate, seats } = details;
  return sendBookingEmail(
    `Booking canceled: ${eventTitle}`,
    `Your ${seats}-seat booking for ${eventTitle}, ${eventVenue}, on ${formatEventDate(eventDate)} has been canceled.`,
    to,
  );
}
