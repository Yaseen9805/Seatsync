'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

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
      <label className="flex flex-col gap-1 text-sm">
        Title
        <input
          required
          value={values.title}
          onChange={(e) => update('title', e.target.value)}
          className="rounded border border-black/10 px-3 py-2 dark:border-white/20 dark:bg-transparent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description
        <textarea
          required
          value={values.description}
          onChange={(e) => update('description', e.target.value)}
          rows={4}
          className="rounded border border-black/10 px-3 py-2 dark:border-white/20 dark:bg-transparent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Venue
        <input
          required
          value={values.venue}
          onChange={(e) => update('venue', e.target.value)}
          className="rounded border border-black/10 px-3 py-2 dark:border-white/20 dark:bg-transparent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Date and time
        <input
          type="datetime-local"
          required
          value={values.date}
          onChange={(e) => update('date', e.target.value)}
          className="rounded border border-black/10 px-3 py-2 dark:border-white/20 dark:bg-transparent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Total seats
        <input
          type="number"
          min={1}
          required
          value={values.totalSeats}
          onChange={(e) => update('totalSeats', e.target.value)}
          className="rounded border border-black/10 px-3 py-2 dark:border-white/20 dark:bg-transparent"
        />
      </label>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-fit rounded bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
      >
        {submitting ? 'Saving…' : props.mode === 'create' ? 'Create event' : 'Save changes'}
      </button>
    </form>
  );
}

export type { EventFormValues };
