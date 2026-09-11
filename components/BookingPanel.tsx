'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type BookingPanelProps = {
  eventId: string;
  seatsAvailable: number;
  isLoggedIn: boolean;
  existingBooking: { seats: number } | null;
};

export function BookingPanel({
  eventId,
  seatsAvailable,
  isLoggedIn,
  existingBooking,
}: BookingPanelProps) {
  const router = useRouter();
  const [seats, setSeats] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleBook(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch(`/api/events/${eventId}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seats: Number(seats) }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? 'Something went wrong');
      return;
    }

    router.refresh();
  }

  async function handleCancel() {
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/events/${eventId}/bookings`, { method: 'DELETE' });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? 'Something went wrong');
      return;
    }

    router.refresh();
  }

  if (!isLoggedIn) {
    return (
      <p className="text-sm">
        <Link href="/login" className="underline">
          Log in
        </Link>{' '}
        to book seats for this event.
      </p>
    );
  }

  if (existingBooking) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm">You&rsquo;re booked for {existingBooking.seats} seat(s).</p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          onClick={handleCancel}
          disabled={submitting}
          className="w-fit text-sm text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
        >
          {submitting ? 'Canceling…' : 'Cancel booking'}
        </button>
      </div>
    );
  }

  if (seatsAvailable < 1) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Sold out.</p>;
  }

  return (
    <form onSubmit={handleBook} className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm">
        Seats
        <input
          type="number"
          min={1}
          max={seatsAvailable}
          required
          value={seats}
          onChange={(e) => setSeats(e.target.value)}
          className="w-20 rounded border border-black/10 px-2 py-1 dark:border-white/20 dark:bg-transparent"
        />
      </label>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-fit rounded bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
      >
        {submitting ? 'Booking…' : 'Book'}
      </button>
    </form>
  );
}
