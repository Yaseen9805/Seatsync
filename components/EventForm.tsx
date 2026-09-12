'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GradientButton from '@/components/kokonutui/gradient-button';

type EventFormValues = {
  title: string;
  description: string;
  venue: string;
  date: string; // datetime-local input value
  totalSeats: string;
};

type EventFormProps =
  { mode: 'create' } | { mode: 'edit'; eventId: string; initialValues: EventFormValues };

const emptyValues: EventFormValues = {
  title: '',
  description: '',
  venue: '',
  date: '',
  totalSeats: '',
};

export function EventForm(props: EventFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<EventFormValues>(
    props.mode === 'edit' ? props.initialValues : emptyValues,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const body = {
      title: values.title,
      description: values.description,
      venue: values.venue,
      date: new Date(values.date).toISOString(),
      totalSeats: Number(values.totalSeats),
    };

    const url = props.mode === 'create' ? '/api/events' : `/api/events/${props.eventId}`;
    const method = props.mode === 'create' ? 'POST' : 'PATCH';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setSubmitting(false);

    if (!res.ok) {
      const responseBody = await res.json().catch(() => null);
      setError(responseBody?.error ?? 'Something went wrong');
      return;
    }

    router.push('/admin/events');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          required
          value={values.title}
          onChange={(e) => update('title', e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          required
          value={values.description}
          onChange={(e) => update('description', e.target.value)}
          rows={4}
          className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="venue">Venue</Label>
        <Input
          id="venue"
          required
          value={values.venue}
          onChange={(e) => update('venue', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Date and time</Label>
          <Input
            id="date"
            type="datetime-local"
            required
            value={values.date}
            onChange={(e) => update('date', e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="totalSeats">Total seats</Label>
          <Input
            id="totalSeats"
            type="number"
            min={1}
            required
            value={values.totalSeats}
            onChange={(e) => update('totalSeats', e.target.value)}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <GradientButton
        type="submit"
        disabled={submitting}
        label={submitting ? 'Saving…' : props.mode === 'create' ? 'Create event' : 'Save changes'}
        variant="emerald"
        className="w-fit"
      />
    </form>
  );
}

export type { EventFormValues };
