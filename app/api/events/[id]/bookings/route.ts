import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/app/generated/prisma/client';
import { requireAuth, toAuthErrorResponse } from '@/lib/auth';
import { sendBookingCancellationEmail, sendBookingConfirmationEmail } from '@/lib/email';

type Params = { params: Promise<{ id: string }> };

// Every booking for a given event serializes on that event's row lock, so
// under a heavy simultaneous burst a queued transaction can need much
// longer than Prisma's 2s default to even get a turn. Widening the wait
// budget trades latency for correctness instead of failing requests that
// would otherwise have resolved cleanly - see scripts/loadtest.ts.
const BOOKING_TX_OPTIONS = { maxWait: 10_000, timeout: 10_000 };

export async function POST(request: Request, { params }: Params) {
  let userId: string;
  let userEmail: string;
  try {
    const payload = requireAuth(request);
    userId = payload.sub;
    userEmail = payload.email;
  } catch (err) {
    return toAuthErrorResponse(err);
  }

  const { id: eventId } = await params;

  const body = await request.json().catch(() => null);
  const seats = Number(body?.seats);
  if (!Number.isInteger(seats) || seats < 1) {
    return NextResponse.json({ error: 'seats must be a positive integer' }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  try {
    const booking = await prisma.$transaction(async (tx) => {
      // Guarded, atomic decrement: Postgres row-locks the matching row for
      // the duration of this UPDATE, so concurrent bookings serialize here
      // and each re-checks seatsAvailable against the latest committed
      // value. This is what makes overselling impossible without needing
      // app-level locking.
      const result = await tx.event.updateMany({
        where: { id: eventId, seatsAvailable: { gte: seats } },
        data: { seatsAvailable: { decrement: seats } },
      });
      if (result.count === 0) {
        throw new NotEnoughSeatsError();
      }

      // Unique (userId, eventId) constraint rejects a second booking for
      // the same user/event, rolling back the decrement above with it.
      return tx.booking.create({ data: { userId, eventId, seats } });
    }, BOOKING_TX_OPTIONS);

    void sendBookingConfirmationEmail({
      to: userEmail,
      eventTitle: event.title,
      eventVenue: event.venue,
      eventDate: event.date,
      seats,
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    if (err instanceof NotEnoughSeatsError) {
      return NextResponse.json({ error: 'Not enough seats available' }, { status: 409 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json(
        { error: 'You already have a booking for this event' },
        { status: 409 },
      );
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2028') {
      return NextResponse.json(
        { error: 'Booking service is busy, please try again' },
        { status: 503 },
      );
    }
    throw err;
  }
}

export async function DELETE(request: Request, { params }: Params) {
  let userId: string;
  let userEmail: string;
  try {
    const payload = requireAuth(request);
    userId = payload.sub;
    userEmail = payload.email;
  } catch (err) {
    return toAuthErrorResponse(err);
  }

  const { id: eventId } = await params;

  const booking = await prisma.booking.findUnique({
    where: { userId_eventId: { userId, eventId } },
    include: { event: true },
  });
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.booking.delete({ where: { id: booking.id } });
      await tx.event.update({
        where: { id: eventId },
        data: { seatsAvailable: { increment: booking.seats } },
      });
    }, BOOKING_TX_OPTIONS);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2028') {
      return NextResponse.json(
        { error: 'Booking service is busy, please try again' },
        { status: 503 },
      );
    }
    throw err;
  }

  void sendBookingCancellationEmail({
    to: userEmail,
    eventTitle: booking.event.title,
    eventVenue: booking.event.venue,
    eventDate: booking.event.date,
    seats: booking.seats,
  });

  return new NextResponse(null, { status: 204 });
}

class NotEnoughSeatsError extends Error {}
