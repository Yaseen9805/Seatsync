import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FadeIn } from '@/components/motion/fade-in';
import { StaggerList, StaggerItem } from '@/components/motion/stagger-list';

export const dynamic = 'force-dynamic';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function seatBadge(seatsAvailable: number, totalSeats: number) {
  if (seatsAvailable === 0) {
    return <Badge variant="destructive">Sold out</Badge>;
  }
  if (seatsAvailable / totalSeats <= 0.2) {
    return <Badge variant="outline">{seatsAvailable} left</Badge>;
  }
  return <Badge variant="secondary">{seatsAvailable} available</Badge>;
}

export default async function EventsPage() {
  const events = await prisma.event.findMany({ orderBy: { date: 'asc' } });

  return (
    <div className="flex flex-col gap-6">
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {events.length} upcoming event{events.length === 1 ? '' : 's'}
        </p>
      </FadeIn>
      {events.length === 0 ? (
        <p className="text-muted-foreground">No events yet.</p>
      ) : (
        <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <StaggerItem key={event.id}>
              <Link href={`/events/${event.id}`} className="block h-full">
                <Card className="h-full transition-colors hover:bg-muted/40">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle>{event.title}</CardTitle>
                      {seatBadge(event.seatsAvailable, event.totalSeats)}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <p>{event.venue}</p>
                    <p>{formatDate(event.date)}</p>
                  </CardContent>
                </Card>
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
