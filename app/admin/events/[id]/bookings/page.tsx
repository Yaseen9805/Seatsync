import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/session';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { FadeIn } from '@/components/motion/fade-in';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

type Params = { params: Promise<{ id: string }> };

export default async function EventAttendeesPage({ params }: Params) {
  await requireAdminSession();
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      bookings: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { email: true } } },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const totalBookedSeats = event.bookings.reduce((sum, b) => sum + b.seats, 0);

  return (
    <FadeIn className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {event.bookings.length} booking{event.bookings.length === 1 ? '' : 's'} &middot;{' '}
            {totalBookedSeats} of {event.totalSeats} seats booked
          </p>
        </div>
        <Link
          href="/admin/events"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Back to events
        </Link>
      </div>

      <Card>
        {event.bookings.length === 0 ? (
          <CardContent className="pt-4 text-sm text-muted-foreground">
            No one has booked this event yet.
          </CardContent>
        ) : (
          <CardContent className="flex flex-col divide-y divide-border pt-0">
            {event.bookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between py-3 first:pt-4">
                <span className="text-sm">{booking.user.email}</span>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">
                    {booking.seats} seat{booking.seats === 1 ? '' : 's'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(booking.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </FadeIn>
  );
}
