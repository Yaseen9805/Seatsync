/**
 * Load-test proof for Phase 5: fires many concurrent booking requests at a
 * real running server (not an in-process route handler) for an event with
 * far fewer seats than requesters, then verifies the seat count landed
 * exactly right. Run against a running `npm run dev` / `npm start`:
 *
 *   npm run loadtest
 *   BASE_URL=https://example.com SEATS=20 REQUESTS=200 npm run loadtest
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { hashPassword, signToken } from '../lib/auth';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const SEATS = Number(process.env.SEATS ?? 30);
const REQUESTS = Number(process.env.REQUESTS ?? 300);
const EMAIL_PREFIX = 'loadtest-';

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function main() {
  console.log(
    `Load test: ${REQUESTS} concurrent requesters vs ${SEATS} seats, against ${BASE_URL}`,
  );

  const sharedPasswordHash = await hashPassword('load-test-password');
  const users = await Promise.all(
    Array.from({ length: REQUESTS }, (_, i) =>
      prisma.user.create({
        data: {
          email: `${EMAIL_PREFIX}${Date.now()}-${i}@example.com`,
          passwordHash: sharedPasswordHash,
        },
      }),
    ),
  );
  const tokens = users.map((user) =>
    signToken({ sub: user.id, email: user.email, role: user.role }),
  );

  const event = await prisma.event.create({
    data: {
      title: 'Load Test Event',
      description: 'Created by scripts/loadtest.ts',
      venue: 'Load Test Venue',
      date: new Date('2027-01-01T20:00:00.000Z'),
      totalSeats: SEATS,
      seatsAvailable: SEATS,
    },
  });

  console.log(
    `Created event ${event.id} with ${SEATS} seats and ${REQUESTS} test users. Firing requests...`,
  );

  const started = Date.now();
  const results = await Promise.all(
    tokens.map(async (token) => {
      const requestStarted = Date.now();
      const res = await fetch(`${BASE_URL}/api/events/${event.id}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: `token=${token}` },
        body: JSON.stringify({ seats: 1 }),
      });
      return { status: res.status, latencyMs: Date.now() - requestStarted };
    }),
  );
  const wallClockMs = Date.now() - started;

  const succeeded = results.filter((r) => r.status === 201).length;
  const rejected = results.filter((r) => r.status === 409).length;
  const unexpected = results.filter((r) => r.status !== 201 && r.status !== 409);

  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const avgLatency = latencies.reduce((sum, n) => sum + n, 0) / latencies.length;

  const finalEvent = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
  const bookingCount = await prisma.booking.count({ where: { eventId: event.id } });

  console.log('\n--- results ---');
  console.log(`wall clock:        ${wallClockMs}ms for ${REQUESTS} requests`);
  console.log(
    `latency (ms):      min=${latencies[0]} avg=${avgLatency.toFixed(1)} p50=${percentile(latencies, 50)} p95=${percentile(latencies, 95)} max=${latencies[latencies.length - 1]}`,
  );
  console.log(`201 (booked):      ${succeeded}`);
  console.log(`409 (rejected):    ${rejected}`);
  console.log(
    `unexpected status: ${unexpected.length}${unexpected.length ? ' ' + JSON.stringify(unexpected.slice(0, 5)) : ''}`,
  );
  console.log(`seatsAvailable:    ${finalEvent.seatsAvailable} (expected ${SEATS - succeeded})`);
  console.log(`booking rows:      ${bookingCount} (expected ${succeeded})`);

  const overSold = finalEvent.seatsAvailable < 0;
  const seatsMismatch = finalEvent.seatsAvailable !== SEATS - succeeded;
  const bookingCountMismatch = bookingCount !== succeeded;
  const wrongSuccessCount = succeeded !== Math.min(SEATS, REQUESTS);
  const ok =
    !overSold &&
    !seatsMismatch &&
    !bookingCountMismatch &&
    !wrongSuccessCount &&
    unexpected.length === 0;

  console.log(
    `\n${ok ? 'PASS' : 'FAIL'}: ${ok ? 'no overselling, seat count exact' : 'see mismatches above'}`,
  );

  console.log('\nCleaning up...');
  await prisma.booking.deleteMany({ where: { eventId: event.id } });
  await prisma.event.delete({ where: { id: event.id } });
  await prisma.user.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });
  await prisma.$disconnect();

  process.exit(ok ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
