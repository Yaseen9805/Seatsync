import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, toAuthErrorResponse } from '@/lib/auth';

export async function GET() {
  const events = await prisma.event.findMany({ orderBy: { date: 'asc' } });
  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  try {
    requireAdmin(request);
  } catch (err) {
    return toAuthErrorResponse(err);
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  const venue = typeof body?.venue === 'string' ? body.venue.trim() : '';
  const dateInput = typeof body?.date === 'string' ? new Date(body.date) : null;
  const totalSeats = Number(body?.totalSeats);

  if (!title || !description || !venue) {
    return NextResponse.json(
      { error: 'title, description, and venue are required' },
      { status: 400 },
    );
  }
  if (!dateInput || Number.isNaN(dateInput.getTime())) {
    return NextResponse.json({ error: 'date must be a valid date' }, { status: 400 });
  }
  if (!Number.isInteger(totalSeats) || totalSeats < 1) {
    return NextResponse.json({ error: 'totalSeats must be a positive integer' }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      title,
      description,
      venue,
      date: dateInput,
      totalSeats,
      seatsAvailable: totalSeats,
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
