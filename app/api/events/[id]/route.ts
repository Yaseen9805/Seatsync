import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    requireAdmin(request);
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

  const data: {
    title?: string;
    description?: string;
    venue?: string;
    date?: Date;
    totalSeats?: number;
    seatsAvailable?: number;
  } = { title, description, venue, date };

  if (totalSeats !== undefined) {
    // Booked seats are seats already taken; resizing totalSeats shifts
    // seatsAvailable by the same delta so existing bookings stay valid.
    const bookedSeats = existing.totalSeats - existing.seatsAvailable;
    const seatsAvailable = totalSeats - bookedSeats;
    if (seatsAvailable < 0) {
      return NextResponse.json(
        { error: `Cannot reduce totalSeats below ${bookedSeats} already-booked seats` },
        { status: 400 },
      );
    }
    data.totalSeats = totalSeats;
    data.seatsAvailable = seatsAvailable;
  }

  const event = await prisma.event.update({ where: { id }, data });
  return NextResponse.json({ event });
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    requireAdmin(request);
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

  await prisma.event.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
