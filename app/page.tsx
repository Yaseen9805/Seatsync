import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">SeatSync</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Book seats for events without worrying about overselling — seat counts are enforced by real
        database transactions.
      </p>
      <Link
        href="/events"
        className="w-fit rounded bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-950"
      >
        Browse events
      </Link>
    </div>
  );
}
