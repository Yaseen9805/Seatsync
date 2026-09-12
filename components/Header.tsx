import Link from 'next/link';
import { getSession } from '@/lib/session';
import { LogoutButton } from '@/components/LogoutButton';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export async function Header() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading font-semibold tracking-tight"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          SeatSync
        </Link>
        <nav className="flex items-center gap-1.5 text-sm">
          <Link href="/events" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            Events
          </Link>
          {session?.role === 'ADMIN' && (
            <Link
              href="/admin/events"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1.5')}
            >
              Admin
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                staff
              </Badge>
            </Link>
          )}
          {session ? (
            <LogoutButton />
          ) : (
            <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
