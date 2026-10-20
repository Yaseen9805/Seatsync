import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/session';
import { EventForm } from '@/components/EventForm';
import { toDatetimeLocal } from '@/lib/time';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/motion/fade-in';

export const metadata: Metadata = { title: 'Edit event' };

type Params = { params: Promise<{ id: string }> };

export default async function EditEventPage({ params }: Params) {
  await requireAdminSession();
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });

  if (!event) {
    notFound();
  }

  return (
    <FadeIn className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Edit event</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm
            mode="edit"
            eventId={event.id}
            initialValues={{
              title: event.title,
              description: event.description,
              venue: event.venue,
              date: toDatetimeLocal(event.date),
              totalSeats: String(event.totalSeats),
            }}
          />
        </CardContent>
      </Card>
    </FadeIn>
  );
}
