import Link from 'next/link';
import { getSession } from '@/lib/session';
import { LogoutButton } from '@/components/LogoutButton';

export async function Header() {
  const session = await getSession();

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-semibold">
          SeatSync
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/events"
            className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Events
          </Link>
          {session?.role === 'ADMIN' && (
            <Link
              href="/admin/events"
              className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Admin
            </Link>
          )}
          {session ? (
            <LogoutButton />
          ) : (
            <Link
              href="/login"
              className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
