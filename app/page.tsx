import Link from 'next/link';
import { FadeIn } from '@/components/motion/fade-in';
import GradientButton from '@/components/kokonutui/gradient-button';

export default function Home() {
  return (
    <FadeIn className="flex flex-col items-start gap-5 py-10 sm:py-16">
      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
        Concurrency-safe booking
      </span>
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Book seats without the overselling risk.
      </h1>
      <p className="max-w-md text-muted-foreground">
        Seat counts are enforced by real database transactions, not application-level checks — no
        duplicate bookings, no negative seat counts, even under heavy concurrent load.
      </p>
      <Link href="/events">
        <GradientButton label="Browse events" variant="emerald" />
      </Link>
    </FadeIn>
  );
}
