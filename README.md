# SeatSync

A concurrency-safe event booking app. Events have a fixed number of seats;
multiple users booking the same event at the same time can never oversell it.
No duplicate bookings, no negative seat counts — enforced by real database
transactions, not application-level checks.

Live at **[seatsync-beta.vercel.app](https://seatsync-beta.vercel.app)**.

This README will grow with each phase. Right now this covers setup for local
development.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- PostgreSQL via [Neon](https://neon.tech), accessed through Prisma
- Hand-rolled auth (JWT + bcrypt)
- [Resend](https://resend.com) for booking emails
- Jest + Supertest for tests
- GitHub Actions for CI
- Deployed on Vercel

## Getting started

Install dependencies:

```bash
npm install
```

Copy the env file and fill in real values:

```bash
cp .env.example .env
```

- `DATABASE_URL` — pooled Neon connection string, used by the app
- `DIRECT_URL` — direct (non-pooled) Neon connection string, used for migrations
- `JWT_SECRET` — a long random string (`openssl rand -base64 32`)
- `RESEND_API_KEY` — a Resend API key

Generate the Prisma client:

```bash
npx prisma generate
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Health check is at
`/api/health`.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` / `npm run start` — production build and start
- `npm run lint` — ESLint
- `npm run format` / `npm run format:check` — Prettier
- `npm run typecheck` — TypeScript, no emit
- `npm test` — Jest
- `npm run loadtest` — concurrency load test against a running server (see
  [Load testing](#load-testing))

## Testing

Tests run against a separate Neon database branch, never against dev/prod
data. Copy `.env.test.example` to `.env.test` and point it at that branch
(pooled `DATABASE_URL` + direct `DIRECT_URL`, same as the main `.env`). Apply
migrations to it the same way as the main database, pointing `DIRECT_URL` at
the test branch instead.

Route handlers are tested by wrapping the real exported handler function in a
minimal `http.Server` (see `tests/helpers/testServer.ts`) and driving it with
Supertest — real HTTP requests, real Postgres, no Next.js dev server needed.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request to `main`:
format check, lint, typecheck, `prisma migrate deploy` against the Neon test
branch, the Jest suite, and a production build. The workflow reads
`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, and `RESEND_API_KEY` from repo
secrets (Settings → Secrets and variables → Actions) — point them at the same
test branch used by `.env.test` locally, never at dev/prod.

## Load testing

`scripts/loadtest.ts` proves the overselling guarantee under real concurrency
against a running server (not an in-process handler call like the Jest
tests) — it creates an event with a small number of seats, creates far more
test users than there are seats, and fires all of their booking requests at
once with `Promise.all`, then checks that exactly `min(seats, requesters)`
succeeded and the seat count landed exactly right. Run it against a running
`npm run dev` or `npm start`:

```bash
npm run loadtest
# or override the defaults:
BASE_URL=http://localhost:3000 SEATS=20 REQUESTS=200 npm run loadtest
```

Sample run — 300 concurrent requesters against 30 seats:

```
201 (booked):      30
409 (rejected):    270
unexpected status: 0
seatsAvailable:    0 (expected 0)
booking rows:      30 (expected 30)

PASS: no overselling, seat count exact
```

The first run at this scale surfaced a real limit: with the default
connection pool size and Prisma's 2s transaction-start budget, most of the
270 losing requests failed with a `P2028` ("unable to start a transaction in
the given time") instead of a clean 409, because every booking for the same
event serializes on that event's row lock and there weren't enough pooled
connections for that many requests to even queue for their turn. Fixed by
widening the Neon pool (`lib/prisma.ts`) and the transaction's `maxWait`/
`timeout` (`app/api/events/[id]/bookings/route.ts`), with a `503` fallback
for the (now unreached, at this scale) case of a transaction that still
can't start in time. Seat accounting was correct even before that fix — the
guarded decrement never oversold — the fix turns "busy" into an honest 503
instead of an unhandled 500.

## Deployment

Deployed on [Vercel](https://vercel.com), which builds and hosts the Next.js
app directly from this repo: **https://seatsync-beta.vercel.app**.

The Vercel project (`seatsync`, under the `yaseen9805-gmailcoms-projects`
scope) is linked to this GitHub repo and has its own environment variables,
separate from local dev/CI:

- `DATABASE_URL` / `DIRECT_URL` — the Neon `production` branch (a separate
  branch from the `test` branch CI uses)
- `JWT_SECRET` — its own long random string, distinct from dev/test
- `RESEND_API_KEY` — currently the same placeholder as dev/test, so
  production booking emails no-op silently rather than sending. Swap it for
  a real Resend key in the Vercel project's Environment Variables to turn
  emails on.

The build command (`npm run build`) runs `prisma generate && prisma migrate
deploy && next build`, so every deploy applies any pending migrations to the
production database automatically before building. To promote an account to
admin in production, run the same `UPDATE` below against the production
connection string instead of dev (see [Admin access](#admin-access)).

To redeploy manually instead of waiting on the GitHub integration:

```bash
npx vercel link   # first time only, links this directory to the project
npx vercel --prod
```

## Admin access

There's no signup flow for admins yet. To get one: sign up a normal account
through `/api/auth/signup` (or the app once it has a signup page), then
promote it directly in the database:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

Run that with `npx prisma db execute --stdin` or through Neon's SQL editor.
Once promoted, log in at `/login` and the "Admin" link appears in the header,
pointing at `/admin/events`.

## Status

Work in progress, built in phases:

- [x] Phase 0 — scaffold
- [x] Phase 1 — auth
- [x] Phase 2 — events
- [x] Phase 3 — concurrency-safe booking
- [x] Phase 4 — booking UI + email
- [x] Phase 5 — load-test proof
- [x] Phase 6 — CI + deploy
