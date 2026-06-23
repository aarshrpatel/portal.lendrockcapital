# Setu — Loan Advisor OS

A staff-first loan-advisor operating system (internal CRM + borrower doc layer),
implemented from the Claude Design handoff in `project/Setu Loan Advisor OS.dc.html`.

- **Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS
- **Persistence:** Prisma + SQLite (`prisma/dev.db`)
- **Fonts:** Newsreader (serif headings) · Noto Sans Gujarati (bilingual script) via `next/font`

## Screens (route per screen, switched from the top nav)

| Route | Screen |
|---|---|
| `/dashboard` | KPIs, first-contact SLA queue, doc progress, stalled files, callbacks, readiness ranking, activity feed |
| `/pipeline` | Drag-and-drop Kanban across 9 stages |
| `/intake` | Live call intake — quick-answer chips, live readiness, bilingual EN/ગુજરાતી script, one-click outcomes that create a real lead |
| `/clients/[id]` | Client detail — 8 tabs (overview, intake, notes/calls, tasks, documents, timeline, lender strategy, comms) |
| `/tasks` | Auto-generated task center, filterable, with completion toggles |
| `/documents` | Checklist engine — regenerate by template, cycle item statuses, send upload link |
| `/borrower/[id]` | Branded mobile upload page (no login) |
| `/reports` | Funnel, leads by source, avg days in stage, lost reasons, qualified rate |

## What persists

Pipeline stage moves, checklist item status, template switches, task completion,
borrower uploads, and new leads created from intake all write to SQLite via
server actions in `app/actions.ts`. Presentational/derived content (readiness
factors, call scripts, report aggregates, activity feed) is computed in
`lib/domain.ts` / the page components, mirroring the prototype.

## Getting started

```bash
npm install            # installs deps + runs `prisma generate`
npm run db:reset       # creates prisma/dev.db and seeds 12 clients/cases + tasks
npm run dev            # http://localhost:3000  (redirects to /dashboard)
```

The SQLite file is git-ignored, so on a fresh clone run `npm run db:reset` once.

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run db:push` — sync schema to the DB
- `npm run db:seed` — (re)seed sample data
- `npm run db:reset` — drop, push, and seed from scratch

## Layout

```
app/            routes (one folder per screen) + server actions
components/      client components (drag board, intake form, doc center, …) + UI primitives
lib/            domain constants & helpers (domain.ts), Prisma client (db.ts), queries (data.ts)
prisma/         schema.prisma + seed.ts
project/        original Claude Design handoff bundle (source of truth for the visuals)
```
