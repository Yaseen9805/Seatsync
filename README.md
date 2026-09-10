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

- `DATABASE_URL` — a Neon PostgreSQL connection string
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

## Status

Work in progress, built in phases:

- [x] Phase 0 — scaffold
- [ ] Phase 1 — auth
- [ ] Phase 2 — events
- [ ] Phase 3 — concurrency-safe booking
- [ ] Phase 4 — booking UI + email
- [ ] Phase 5 — load-test proof
- [ ] Phase 6 — CI + deploy
