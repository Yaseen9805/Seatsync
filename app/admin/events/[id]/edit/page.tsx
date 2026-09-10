import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/session';
import { EventForm } from '@/components/EventForm';
import { toDatetimeLocal } from '@/lib/datetimeLocal';

type Params = { params: Promise<{ id: string }> };

export default async function EditEventPage({ params }: Params) {
  await requireAdminSession();
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });

  if (!event) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit event</h1>
      <EventForm
        mode="edit"
        eventId={event.id}
        initialValues={{
          title: event.title,
          description: event.description,
          venue: event.venue,
          date: toDatetimeLocal(event.date.toISOString()),
          totalSeats: String(event.totalSeats),
        }}
      />
    </div>
  );
}
