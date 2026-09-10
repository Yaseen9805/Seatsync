import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/session';
import { DeleteEventButton } from '@/components/DeleteEventButton';

export const dynamic = 'force-dynamic';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default async function AdminEventsPage() {
  await requireAdminSession();
  const events = await prisma.event.findMany({ orderBy: { date: 'asc' } });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Manage events</h1>
        <Link
          href="/admin/events/new"
          className="rounded bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-950"
        >
          New event
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">No events yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between rounded border border-black/10 p-4 dark:border-white/10"
            >
              <div>
                <p className="font-medium">{event.title}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {event.venue} &middot; {formatDate(event.date)} &middot; {event.seatsAvailable}/
                  {event.totalSeats} seats
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link href={`/admin/events/${event.id}/edit`} className="text-sm hover:underline">
                  Edit
                </Link>
                <DeleteEventButton eventId={event.id} title={event.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
