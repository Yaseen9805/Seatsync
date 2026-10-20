import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/app/generated/prisma/client';
import { requireAdmin, toAuthErrorResponse } from '@/lib/auth';
import { updateEventSchema } from '@/lib/schemas';
import { validationErrorResponse } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
  return NextResponse.json({ event });
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin(request);
  } catch (err) {
    return toAuthErrorResponse(err);
  }

  const { id } = await params;
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateEventSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const { title, description, venue, date, totalSeats } = parsed.data;

  if (totalSeats === undefined) {
    const event = await prisma.event.update({
      where: { id },
      data: { title, description, venue, date },
    });
    return NextResponse.json({ event });
  }

  // Booked seats are seats already taken; resizing totalSeats shifts
  // seatsAvailable by the same delta so existing bookings stay valid.
  const bookedSeats = existing.totalSeats - existing.seatsAvailable;
  if (totalSeats < bookedSeats) {
    return NextResponse.json(
      { error: `Cannot reduce totalSeats below ${bookedSeats} already-booked seats` },
      { status: 400 },
    );
  }

  // Apply the resize as a relative change guarded on the row's state at
  // read time, so a booking that commits between our read and write can't
  // be erased by this write landing with a stale absolute seatsAvailable.
  const change = totalSeats - existing.totalSeats;
  const result = await prisma.event.updateMany({
    where: {
      id,
      totalSeats: existing.totalSeats,
      seatsAvailable: { gte: -change },
    },
    data: { title, description, venue, date, totalSeats, seatsAvailable: { increment: change } },
  });
  if (result.count === 0) {
    return NextResponse.json(
      { error: 'Seats changed while you were editing. Reload and try again.' },
      { status: 409 },
    );
  }

  const event = await prisma.event.findUnique({ where: { id } });
  return NextResponse.json({ event });
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    await requireAdmin(request);
  } catch (err) {
    return toAuthErrorResponse(err);
  }

  const { id } = await params;
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Booking rows reference this event, so deleting it outright would hit a
  // foreign key constraint - surface that as a clear 400 instead of an
  // unhandled 500, same as PATCH already does for shrinking totalSeats.
  const bookingCount = await prisma.booking.count({ where: { eventId: id } });
  if (bookingCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete an event with ${bookingCount} existing booking(s). Cancel them first.`,
      },
      { status: 400 },
    );
  }

  try {
    await prisma.event.delete({ where: { id } });
  } catch (err) {
    // A booking can land between the count above and this delete.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete an event with existing booking(s). Cancel them first.' },
        { status: 400 },
      );
    }
    throw err;
  }
  return new NextResponse(null, { status: 204 });
}
