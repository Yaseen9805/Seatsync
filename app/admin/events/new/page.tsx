import { requireAdminSession } from '@/lib/session';
import { EventForm } from '@/components/EventForm';

export default async function NewEventPage() {
  await requireAdminSession();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">New event</h1>
      <EventForm mode="create" />
    </div>
  );
}
