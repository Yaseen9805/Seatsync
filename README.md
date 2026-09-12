# SeatSync

![CI](https://github.com/Yaseen9805/seatsync/actions/workflows/ci.yml/badge.svg)

![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![Neon](https://img.shields.io/badge/Neon-00E599?logo=neon&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-FB015B?logo=jsonwebtokens&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?logo=zod&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-C21325?logo=jest&logoColor=white)
![Resend](https://img.shields.io/badge/Resend-000000?logo=resend&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?logo=eslint&logoColor=white)

A concurrency-safe event booking app — events have a fixed number of seats, and multiple users booking the same event at the same instant can never oversell it. No duplicate bookings, no negative seat counts, no application-level locking — enforced by real database transactions and proven under real concurrent load.

## Live Demo

Deployed on [Vercel](https://vercel.com)'s free Hobby tier: **https://seatsync-beta.vercel.app**

- Browse events with no account: **https://seatsync-beta.vercel.app/events**
- Sign up, book a seat, cancel it, and (once promoted to admin — see [Admin access](#admin-access)) manage events from **https://seatsync-beta.vercel.app/admin/events**

## Features

- **Concurrency-safe booking** — seats are decremented with a single guarded, atomic `UPDATE ... WHERE seatsAvailable >= seats` inside a database transaction. Postgres row-locks the event row for the duration of the update, so concurrent bookings serialize there instead of racing — no oversells, proven by firing hundreds of simultaneous requests at a handful of seats (see [Load testing](#load-testing)).
- **Authentication** — hand-rolled JWT + bcrypt auth (signup/login/logout), an httpOnly session cookie, and role-based access (`USER` / `ADMIN`) enforced per route.
- **Admin event management** — create, edit, and delete events; an attendee list per event shows who booked and how many seats; deleting an event with active bookings is rejected with a clear error instead of an unhandled database failure.
- **Rate limiting** — signup and login are throttled entirely on the database already in use, no external service (see [Rate limiting](#rate-limiting)).
- **Request validation** — Zod schemas validate every write endpoint; invalid requests get a `400` with per-field error details.
- **Booking emails** — confirmation and cancellation emails sent via [Resend](https://resend.com), scheduled with Next.js's `after()` so the serverless function stays alive long enough to actually send them, without making the booking response wait.
- **UI** — a small design system on shadcn/ui + Base UI primitives, [Kokonut UI](https://kokonutui.com)'s gradient buttons, [Bklit UI](https://ui.bklit.com)'s animated ring chart for seat availability, and [Motion](https://motion.dev) for page/list transitions. Light/dark follows the OS with zero JavaScript.
- **Tested** — Jest + Supertest suite covering auth, event CRUD, booking/cancellation, rate limiting, and a dedicated race-condition test that fires 15 concurrent bookings at a 5-seat event and asserts exactly 5 succeed.

## Architecture

```mermaid
flowchart TD
    Client(["Client<br/>(browser)"])

    subgraph Next["Next.js App Router"]
        direction TB
        Pages["Server Component pages<br/>(app/**/page.tsx)"]
        Routes["Route handlers<br/>(app/api/**/route.ts)"]
        RateLimit["DB-backed rate limiter<br/>(lib/rateLimit.ts)"]
        Validate["Zod validation<br/>(lib/schemas.ts)"]
        AuthMW["JWT auth / role checks<br/>(lib/auth.ts)"]
        Tx["Guarded atomic transaction<br/>(events/[id]/bookings/route.ts)"]
    end

    Prisma[("Prisma Client")]
    Neon[("PostgreSQL<br/>(Neon)")]

    Client -->|HTTP request| Routes
    Client -->|page request| Pages
    Routes --> RateLimit --> Validate --> AuthMW --> Tx --> Prisma --> Neon
    Pages --> Prisma

    Tx -.->|after() - after the response is sent| Resend["Resend<br/>(lib/email.ts)"]
    Resend -.->|confirmation / cancellation email| Inbox(["Booker's inbox"])
```

Request flow for a booking (`POST /api/events/:id/bookings`): the rate limiter and Zod validation both run before any database work, so a flood or a malformed body never reaches the transaction; the guarded `UPDATE` inside that transaction is what actually makes overselling impossible, not an application-level lock; the confirmation email is scheduled with `after()` rather than awaited, so a slow or failing email provider can never delay or fail the booking itself.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui + Base UI primitives, Kokonut UI, Bklit UI, Motion
- **Database**: PostgreSQL via [Neon](https://neon.tech), accessed through Prisma 7 (with the Neon serverless driver adapter)
- **Auth**: jsonwebtoken, bcrypt, httpOnly cookies
- **Validation**: Zod
- **Email**: Resend
- **Testing**: Jest, Supertest
- **Tooling**: ESLint, Prettier, tsx (load test + one-off scripts)
- **CI/CD**: GitHub Actions, deployed on Vercel

## Prerequisites

- Node.js and npm
- A [Neon](https://neon.tech) Postgres project (free tier) — ideally three branches: one for local dev, one for tests, one for production
- A [Resend](https://resend.com) API key (free tier, no card required — used to send booking emails)
  - **Sandbox limitation**: without verifying your own domain, Resend's free sandbox sender (`onboarding@resend.dev`) can only deliver to the email address your Resend account itself was signed up with — not to arbitrary bookers. Fine for demonstrating the feature; verify a domain (still free) if you want it to email real users.
- A [Vercel](https://vercel.com) account (free Hobby tier) if you want to deploy your own copy

## Installation

```bash
npm install
```

## Configuration

Copy the env file and fill in real values:

```bash
cp .env.example .env
```

- `DATABASE_URL` — pooled Neon connection string, used by the app at runtime
- `DIRECT_URL` — direct (non-pooled) Neon connection string, used for migrations
- `JWT_SECRET` — a long random string (`openssl rand -base64 32`)
- `RESEND_API_KEY` — a Resend API key (see the sandbox limitation above)

Generate the Prisma client:

```bash
npx prisma generate
```

## Usage

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Health check is at `/api/health`.

## Testing

```bash
npm test
```

Runs the Jest + Supertest suite against a **separate Neon database branch**, never against dev/prod data. Copy `.env.test.example` to `.env.test` and point it at that branch (pooled `DATABASE_URL` + direct `DIRECT_URL`, same shape as `.env`), then apply migrations to it the same way as the main database.

Route handlers are tested by wrapping the real exported handler function in a minimal `http.Server` (see `tests/helpers/testServer.ts`) and driving it with Supertest — real HTTP requests, real Postgres, no Next.js dev server needed. Covers:

- **Auth** — signup, login, logout, `requireAuth`/`requireAdmin` enforcement.
- **Events** — CRUD, admin-only write access, the seat-resize guard, and the delete-with-bookings guard.
- **Bookings** — book/cancel, duplicate-booking rejection, insufficient-seats rejection, and a dedicated concurrency test (15 simultaneous bookings against 5 seats, asserting exactly 5 succeed).
- **Rate limiting** — deliberately exceeds each threshold and asserts a `429` with the expected message.

### Load testing

```bash
npm run loadtest
# or override the defaults:
BASE_URL=http://localhost:3000 SEATS=20 REQUESTS=200 npm run loadtest
```

`scripts/loadtest.ts` proves the overselling guarantee under real concurrency against a **running server** (not an in-process handler call like the Jest tests) — it creates an event with a small number of seats, creates far more test users than there are seats, fires all of their booking requests at once with `Promise.all`, then checks that exactly `min(seats, requesters)` succeeded and the seat count landed exactly right.

Sample run — 300 concurrent requesters against 30 seats:

```
201 (booked):      30
409 (rejected):    270
unexpected status: 0
seatsAvailable:    0 (expected 0)
booking rows:      30 (expected 30)

PASS: no overselling, seat count exact
```

The first run at this scale surfaced a real limit: with the default connection pool size and Prisma's 2s transaction-start budget, most of the 270 losing requests failed with a `P2028` ("unable to start a transaction in the given time") instead of a clean 409, because every booking for the same event serializes on that event's row lock and there weren't enough pooled connections for that many requests to even queue for their turn. Fixed by widening the Neon pool (`lib/prisma.ts`) and the transaction's `maxWait`/`timeout`, with a `503` fallback for a transaction that still can't start in time. Seat accounting was correct even before that fix — the guarded decrement never oversold — the fix turns "busy" into an honest 503 instead of an unhandled 500.

## Continuous Integration

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every push and pull request to `main`: format check, lint, typecheck, `prisma migrate deploy` against the Neon test branch, the Jest suite, and a production build. The workflow reads `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, and `RESEND_API_KEY` from repo secrets (Settings → Secrets and variables → Actions) — point them at the same test branch used by `.env.test` locally, never at dev/prod.

## Rate limiting

Signup and login are rate limited without adding a new service — no Upstash, no Redis, nothing beyond the free Neon database this project already uses. A `RateLimitAttempt` table (`prisma/schema.prisma`) holds one row per attempt, keyed by an arbitrary string such as `login:ip:1.2.3.4` or `login:email:user@example.com`. `lib/rateLimit.ts`'s `enforceRateLimit` records the current attempt, counts how many rows share that key within a rolling window, and throws once a threshold is exceeded — reusing `AuthError`/`toAuthErrorResponse` from `lib/auth.ts`, so a `429` looks exactly like every other auth error the app already returns.

- Signup and login are both limited **by IP** (generous — 10 per 15 minutes), so a flood from one source is throttled regardless of which email addresses it targets.
- Login is additionally limited **by email** (stricter — 5 per 15 minutes), so credential stuffing against one account is throttled even if it's spread across many different IPs.

Old rows are pruned opportunistically on every check (`DELETE ... WHERE createdAt < 24h ago`) instead of by a scheduled job, so there's no cron, no external scheduler, and no ongoing cost — just a cheap delete that piggybacks on requests the app is already handling.

## API Endpoints

`GET /api/health` is a plain health check, not under any auth.

### Auth (`/api/auth`)

| Method | Endpoint  | Description                        |
| ------ | --------- | ---------------------------------- |
| POST   | `/signup` | Create a user, sets an auth cookie |
| POST   | `/login`  | Authenticate, sets an auth cookie  |
| POST   | `/logout` | Clear the auth cookie              |

### Events (`/api/events`)

| Method | Endpoint | Auth  | Description                                                                |
| ------ | -------- | ----- | -------------------------------------------------------------------------- |
| GET    | `/`      | —     | List all events                                                            |
| POST   | `/`      | admin | Create an event                                                            |
| GET    | `/:id`   | —     | Get event details                                                          |
| PATCH  | `/:id`   | admin | Update an event (partial; resizing `totalSeats` can't drop below bookings) |
| DELETE | `/:id`   | admin | Delete an event (rejected with `400` if it still has bookings)             |

### Bookings (`/api/events/:id/bookings`)

| Method | Endpoint | Auth     | Description                                 |
| ------ | -------- | -------- | ------------------------------------------- |
| POST   | `/`      | required | Book seats for the event (concurrency-safe) |
| DELETE | `/`      | required | Cancel your own booking for the event       |

Authenticated routes read the JWT from an httpOnly `token` cookie (or `Authorization: Bearer <token>`, mainly used by tests).

## Project Structure

```
seatsync/
├── .github/workflows/ci.yml           # format/lint/typecheck/migrate/test/build on push+PR to main
├── app/
│   ├── api/
│   │   ├── auth/{signup,login,logout}/route.ts
│   │   ├── events/route.ts             # GET (list) / POST (admin create)
│   │   ├── events/[id]/route.ts        # GET / PATCH / DELETE (admin)
│   │   ├── events/[id]/bookings/route.ts  # POST / DELETE - the concurrency-safe transaction
│   │   └── health/route.ts
│   ├── admin/events/                   # admin event list, create/edit forms, attendee list
│   ├── events/                         # public event list + detail pages
│   ├── login/, signup/                 # auth pages
│   ├── layout.tsx, page.tsx, globals.css
│   └── generated/prisma/               # generated Prisma client (gitignored)
├── components/
│   ├── ui/                             # shadcn/ui + Base UI primitives
│   ├── kokonutui/, charts/, motion/    # Kokonut UI, Bklit UI, Motion components
│   ├── BookingPanel.tsx, EventForm.tsx, Header.tsx, ...
├── lib/
│   ├── auth.ts                         # JWT + bcrypt, AuthError / toAuthErrorResponse
│   ├── rateLimit.ts                    # DB-backed rate limiter
│   ├── schemas.ts                      # Zod schemas per route
│   ├── validation.ts                   # ZodError -> JSON response helper
│   ├── email.ts                        # Resend booking emails (best-effort, never blocks a booking)
│   ├── prisma.ts                       # Prisma client (Neon serverless adapter)
│   └── session.ts, utils.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── scripts/
│   └── loadtest.ts                     # concurrency load test against a running server
├── tests/
│   ├── auth/, events/, bookings/       # Jest + Supertest, real HTTP + real Postgres
│   └── helpers/                        # testServer.ts, withParams.ts
└── jest.config.js
```

## Deployment

Deployed on [Vercel](https://vercel.com), which builds and hosts the Next.js app directly from this repo: **https://seatsync-beta.vercel.app**.

The Vercel project (`seatsync`) is linked to this GitHub repo and has its own environment variables, separate from local dev/CI:

- `DATABASE_URL` / `DIRECT_URL` — a dedicated Neon `production` branch
- `JWT_SECRET` — its own long random string, distinct from dev/test
- `RESEND_API_KEY` — a real Resend key (see [Prerequisites](#prerequisites) for the sandbox-sender limitation)

The build command (`npm run build`) runs `prisma generate && prisma migrate deploy && next build`, so every deploy applies any pending migrations to the production database automatically before building.

To redeploy manually instead of waiting on the GitHub integration:

```bash
npx vercel link   # first time only, links this directory to the project
npx vercel --prod
```

## Admin access

There's no self-serve way to become an admin. Sign up a normal account at `/signup`, then promote it directly in the database:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

Run that with `npx prisma db execute --stdin` or through Neon's SQL editor. Once promoted, log in at `/login` and the "Admin" link appears in the header, pointing at `/admin/events`.

## Linting

```bash
npx eslint .
```

## Status

Built in phases, all complete:

- [x] Phase 0 — scaffold
- [x] Phase 1 — auth
- [x] Phase 2 — events
- [x] Phase 3 — concurrency-safe booking
- [x] Phase 4 — booking UI + email
- [x] Phase 5 — load-test proof
- [x] Phase 6 — CI + deploy
- [x] Phase 7 — hardening (rate limiting, Zod validation, real booking emails)
