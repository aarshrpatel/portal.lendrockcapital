# Production hardening runbook

The dev build runs with zero setup (SQLite, dev-mode auth, stubbed vendors).
This is the ordered checklist to take it to production per the master spec
(Module 09 architecture, Module 11 §B3 stack decision).

## 1 · Database → Neon Postgres

The schema is written to port: string enums, integer-cent money, no
SQLite-specific types.

1. Provision Neon (Vercel Marketplace → Neon, or console.neon.tech).
2. In `prisma/schema.prisma`, change the datasource:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Set `DATABASE_URL` (pooled connection string) in `.env.local` / Vercel.
4. Create the schema and baseline migration history:
   ```bash
   npx prisma migrate dev --name init      # local against a dev branch DB
   npx prisma migrate deploy               # in CI / production
   npm run db:seed                         # optional: demo book, or skip for a clean start
   ```
5. From then on, schema changes go through `prisma migrate dev`, never `db push`.

Post-cutover hardening: enable Neon point-in-time restore; keep the pooled
URL for the app and the direct URL for migrations (`directUrl` in the
datasource block).

## 2 · Auth → Clerk

Dev auth is a signed-cookie role switcher confined to `lib/auth.ts` +
`app/actions.ts` (loginAs/logout) + `middleware.ts`. The swap:

1. `npm i @clerk/nextjs`; set the two Clerk keys (see `.env.example`).
2. Wrap the app in `<ClerkProvider>`; replace the middleware auth gate with
   Clerk's `clerkMiddleware` (keep the security headers).
3. Reimplement `getSession()` to map the Clerk user → the portal `User` row
   (match on email; store `clerkUserId` on User). `requireUser`/`can` and
   every call site stay unchanged.
4. Policy per Module 09 §9.2.1: TOTP required for internal roles; borrower
   and investor surfaces stay on magic-link tokens (already implemented)
   with SMS OTP step-up before document viewing (Clerk or Twilio Verify).
5. Delete the `/login` role-switcher page.

Until the swap, production requires `AUTH_SECRET` (the build fails closed
without it — `lib/env.ts`).

## 3 · Files → S3

Uploads currently record metadata only. Wire `borrowerUpload` to presigned
S3 PUT URLs (bucket: versioned, SSE-KMS, no public access), store the S3
key on DocumentRequest, and serve via presigned GET with short expiry.
Access rules per Module 06 §4.3.

## 4 · Background jobs → Inngest

The event dispatcher (`lib/domain/events.ts`) runs in-process and is where
the queue lands. Move these to scheduled/queued functions:

- SLA timers + escalations (task `dueAt` sweeps)
- Document freshness expiry + chase cadences (day 1/3/5/7)
- Stale-lead auto-DEAD clocks and re-engagement engines
- WC monthly covenant sweeps + renewal underwrites
- OFAC batch re-screens (quarterly borrowers, monthly investors)
- Monthly distribution batch (the 10th) and the Monday ops digest

## 5 · Vendor adapters (Module 09 §9.5)

Each stub becomes an adapter call behind the same interface: Dropbox Sign
(e-sign), Plaid (bank data), CRS/Experian (soft credit), Persona + Middesk
(KYC/KYB), sanctions.io (OFAC), HouseCanary (AVM), Twilio + Postmark
(comms), QuickBooks (GL), Dwolla (ACH — phase 2 per §9.5 #13; phase 1 is
the manual NACHA playbook). Keys in `.env.example`.

## 6 · Rate limiting & abuse

`lib/ratelimit.ts` is in-memory (single instance). On Vercel/serverless,
swap the store for Upstash Redis (`@upstash/ratelimit`) — same signature.
Keep the honeypot field on `/apply`; add Vercel BotID or Turnstile if the
public form draws bots.

## 7 · Observability

- Sentry (`@sentry/nextjs`) for errors; PostHog for product analytics.
- `/api/health` is the uptime probe (checks DB).
- The AuditLog table is the compliance trail — ship it to cold storage on
  a schedule; never prune in place.

## 8 · Deploy (Vercel)

```bash
vercel link
vercel env add AUTH_SECRET DATABASE_URL ...
vercel --prod
```

Build is `next build` (standalone default). Post-deploy smoke: `/api/health`,
`/login`, `/apply`, one deal page, one borrower link.

## Pre-launch compliance checklist (Module 11)

- [ ] Licensing matrix seeded with real footprint + CA CFL number
- [ ] CFDL disclosure templates (CA SB 1235, NY) attorney-approved
- [ ] Adverse-action notice template (combined ECOA/FCRA) attorney-approved
- [ ] Legal instrument templates (note, DOT variants, guaranty, MLPA) attorney-approved
- [ ] OFAC provider live before first real party is screened
- [ ] Data retention jobs match the schedule (DEAD 3y, DECLINED 5y)
