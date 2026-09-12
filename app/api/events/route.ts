import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, toAuthErrorResponse } from '@/lib/auth';
import { createEventSchema } from '@/lib/schemas';
import { validationErrorResponse } from '@/lib/validation';

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
  const parsed = createEventSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const { title, description, venue, date, totalSeats } = parsed.data;

  const event = await prisma.event.create({
    data: {
      title,
      description,
      venue,
      date,
      totalSeats,
      seatsAvailable: totalSeats,
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
