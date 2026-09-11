import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/app/generated/prisma/client';
import { requireAuth, toAuthErrorResponse } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  let userId: string;
  try {
    userId = requireAuth(request).sub;
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
    throw err;
  }
}

export async function DELETE(request: Request, { params }: Params) {
  let userId: string;
  try {
    userId = requireAuth(request).sub;
  } catch (err) {
    return toAuthErrorResponse(err);
  }

  const { id: eventId } = await params;

  const booking = await prisma.booking.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.delete({ where: { id: booking.id } });
    await tx.event.update({
      where: { id: eventId },
      data: { seatsAvailable: { increment: booking.seats } },
    });
  });

  return new NextResponse(null, { status: 204 });
}

class NotEnoughSeatsError extends Error {}
