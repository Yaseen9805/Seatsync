'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import GradientButton from '@/components/kokonutui/gradient-button';

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

  const errorMessage = error && (
    <AnimatePresence>
      <motion.p
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="text-sm text-destructive"
      >
        {error}
      </motion.p>
    </AnimatePresence>
  );

  if (!isLoggedIn) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Log in
        </Link>{' '}
        to book seats for this event.
      </p>
    );
  }

  if (existingBooking) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm">
          You&rsquo;re booked for <span className="font-medium">{existingBooking.seats}</span> seat
          {existingBooking.seats === 1 ? '' : 's'}.
        </p>
        {errorMessage}
        <Button variant="destructive" size="sm" onClick={handleCancel} disabled={submitting}>
          {submitting ? 'Canceling…' : 'Cancel booking'}
        </Button>
      </div>
    );
  }

  if (seatsAvailable < 1) {
    return <p className="text-sm text-muted-foreground">Sold out.</p>;
  }

  return (
    <form onSubmit={handleBook} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="seats">Seats</Label>
        <Input
          id="seats"
          type="number"
          min={1}
          max={seatsAvailable}
          required
          value={seats}
          onChange={(e) => setSeats(e.target.value)}
          className="w-24"
        />
      </div>
      {errorMessage}
      <GradientButton
        type="submit"
        disabled={submitting}
        label={submitting ? 'Booking…' : 'Book'}
        variant="emerald"
        className="w-full"
      />
    </form>
  );
}
