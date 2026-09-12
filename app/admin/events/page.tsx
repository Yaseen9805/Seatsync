import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/session';
import { DeleteEventButton } from '@/components/DeleteEventButton';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { FadeIn } from '@/components/motion/fade-in';
import { StaggerList, StaggerItem } from '@/components/motion/stagger-list';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default async function AdminEventsPage() {
  await requireAdminSession();
  const events = await prisma.event.findMany({
    orderBy: { date: 'asc' },
    include: { _count: { select: { bookings: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <FadeIn className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manage events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {events.length} event{events.length === 1 ? '' : 's'}
          </p>
        </div>
        <Link href="/admin/events/new" className={cn(buttonVariants({ variant: 'default' }))}>
          New event
        </Link>
      </FadeIn>
      {events.length === 0 ? (
        <p className="text-muted-foreground">No events yet.</p>
      ) : (
        <StaggerList className="flex flex-col gap-3">
          {events.map((event) => (
            <StaggerItem key={event.id}>
              <Card className="flex-row items-center justify-between px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{event.title}</p>
                    <Badge variant="secondary">
                      {event.seatsAvailable}/{event.totalSeats} seats
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {event.venue} &middot; {formatDate(event.date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/events/${event.id}/bookings`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                  >
                    {event._count.bookings} attendee{event._count.bookings === 1 ? '' : 's'}
                  </Link>
                  <Link
                    href={`/admin/events/${event.id}/edit`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                  >
                    Edit
                  </Link>
                  <DeleteEventButton eventId={event.id} title={event.title} />
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
