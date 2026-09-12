'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GradientButton from '@/components/kokonutui/gradient-button';
import { FadeIn } from '@/components/motion/fade-in';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? 'Something went wrong');
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <FadeIn className="mx-auto flex max-w-sm flex-col gap-6 py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Log in</CardTitle>
          <CardDescription>Welcome back — book seats and manage your bookings.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <GradientButton
              type="submit"
              disabled={submitting}
              label={submitting ? 'Logging in…' : 'Log in'}
              variant="emerald"
              className="w-full"
            />
          </form>
        </CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground">
        Don&rsquo;t have an account?{' '}
        <Link href="/signup" className="text-foreground underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </FadeIn>
  );
}
