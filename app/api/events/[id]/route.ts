import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, toAuthErrorResponse } from '@/lib/auth';

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
  const data: {
    title?: string;
    description?: string;
    venue?: string;
    date?: Date;
    totalSeats?: number;
    seatsAvailable?: number;
  } = {};

  if (body?.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 });
    data.title = title;
  }
  if (body?.description !== undefined) {
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (!description) {
      return NextResponse.json({ error: 'description cannot be empty' }, { status: 400 });
    }
    data.description = description;
  }
  if (body?.venue !== undefined) {
    const venue = typeof body.venue === 'string' ? body.venue.trim() : '';
    if (!venue) return NextResponse.json({ error: 'venue cannot be empty' }, { status: 400 });
    data.venue = venue;
  }
  if (body?.date !== undefined) {
    const date = new Date(body.date);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: 'date must be a valid date' }, { status: 400 });
    }
    data.date = date;
  }
  if (body?.totalSeats !== undefined) {
    const totalSeats = Number(body.totalSeats);
    if (!Number.isInteger(totalSeats) || totalSeats < 1) {
      return NextResponse.json({ error: 'totalSeats must be a positive integer' }, { status: 400 });
    }
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

  await prisma.event.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
