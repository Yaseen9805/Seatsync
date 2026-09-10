import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default async function EventsPage() {
  const events = await prisma.event.findMany({ orderBy: { date: 'asc' } });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
      {events.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">No events yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {events.map((event) => (
            <li key={event.id} className="rounded border border-black/10 p-4 dark:border-white/10">
              <Link href={`/events/${event.id}`} className="font-medium hover:underline">
                {event.title}
              </Link>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {event.venue} &middot; {formatDate(event.date)}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {event.seatsAvailable} of {event.totalSeats} seats available
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
