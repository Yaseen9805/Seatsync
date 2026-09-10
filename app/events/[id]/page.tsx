import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
}

type Params = { params: Promise<{ id: string }> };

export default async function EventDetailPage({ params }: Params) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });

  if (!event) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        {event.venue} &middot; {formatDate(event.date)}
      </p>
      <p className="whitespace-pre-wrap">{event.description}</p>
      <p className="text-sm font-medium">
        {event.seatsAvailable} of {event.totalSeats} seats available
      </p>
    </div>
  );
}
