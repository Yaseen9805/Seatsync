import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { BookingPanel } from '@/components/BookingPanel';
import { SeatsRingChart } from '@/components/SeatsRingChart';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FadeIn } from '@/components/motion/fade-in';

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

  const session = await getSession();
  const existingBooking = session
    ? await prisma.booking.findUnique({
        where: { userId_eventId: { userId: session.sub, eventId: id } },
      })
    : null;

  return (
    <FadeIn className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{event.title}</h1>
          <p className="mt-1 text-muted-foreground">
            {event.venue} &middot; {formatDate(event.date)}
          </p>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{event.description}</p>
      </div>

      <Card className="h-fit">
        <CardHeader className="items-center">
          <SeatsRingChart seatsAvailable={event.seatsAvailable} totalSeats={event.totalSeats} />
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <BookingPanel
            eventId={event.id}
            seatsAvailable={event.seatsAvailable}
            isLoggedIn={!!session}
            existingBooking={existingBooking ? { seats: existingBooking.seats } : null}
          />
        </CardContent>
      </Card>
    </FadeIn>
  );
}
