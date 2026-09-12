import { prisma } from '@/lib/prisma';
import { AuthError } from '@/lib/auth';

type RateLimitConfig = { windowMs: number; max: number };

// Comfortably longer than every window below, so a single prune keeps the
// table bounded regardless of which limit triggered it.
const PRUNE_OLDER_THAN_MS = 24 * 60 * 60 * 1000;

export const SIGNUP_IP_RATE_LIMIT: RateLimitConfig = { windowMs: 15 * 60 * 1000, max: 10 };
export const LOGIN_IP_RATE_LIMIT: RateLimitConfig = { windowMs: 15 * 60 * 1000, max: 10 };
export const LOGIN_EMAIL_RATE_LIMIT: RateLimitConfig = { windowMs: 15 * 60 * 1000, max: 5 };

/**
 * DB-backed rolling-window rate limiter. Records this attempt, counts how
 * many share `key` within the window, and throws AuthError(429) once
 * `max` is exceeded. Old rows are pruned opportunistically on each call
 * instead of by a scheduled job, so this needs no cron and no separate
 * service - just the free Neon database this project already has.
 */
export async function enforceRateLimit(
  key: string,
  { windowMs, max }: RateLimitConfig,
  message = 'Too many requests, please try again later',
): Promise<void> {
  const now = Date.now();

  await prisma.rateLimitAttempt.deleteMany({
    where: { createdAt: { lt: new Date(now - PRUNE_OLDER_THAN_MS) } },
  });

  await prisma.rateLimitAttempt.create({ data: { key } });

  const count = await prisma.rateLimitAttempt.count({
    where: { key, createdAt: { gte: new Date(now - windowMs) } },
  });

  if (count > max) {
    throw new AuthError(message, 429);
  }
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}
