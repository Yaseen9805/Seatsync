import { requireAdminSession } from '@/lib/session';
import { EventForm } from '@/components/EventForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/motion/fade-in';

export default async function NewEventPage() {
  await requireAdminSession();

  return (
    <FadeIn className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">New event</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm mode="create" />
        </CardContent>
      </Card>
    </FadeIn>
  );
}
