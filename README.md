# SeatSync

A concurrency-safe event booking app. Events have a fixed number of seats;
multiple users booking the same event at the same time can never oversell it.
No duplicate bookings, no negative seat counts — enforced by real database
transactions, not application-level checks.

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

## Testing

Tests run against a separate Neon database branch, never against dev/prod
data. Copy `.env.test.example` to `.env.test` and point it at that branch
(pooled `DATABASE_URL` + direct `DIRECT_URL`, same as the main `.env`). Apply
migrations to it the same way as the main database, pointing `DIRECT_URL` at
the test branch instead.

Route handlers are tested by wrapping the real exported handler function in a
minimal `http.Server` (see `tests/helpers/testServer.ts`) and driving it with
Supertest — real HTTP requests, real Postgres, no Next.js dev server needed.

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
- [ ] Phase 4 — booking UI + email
- [ ] Phase 5 — load-test proof
- [ ] Phase 6 — CI + deploy
