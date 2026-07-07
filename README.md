# Lendrock Deal OS

The deal operating system for Lendrock Capital — one pipeline running four
lending pathways (hard money, bridge/business, working-capital LOC, SBA
packaging) across three surfaces: internal ops, a passwordless borrower
portal, and a gated investor portal.

Built to the spec in [`docs/portal-master-spec.md`](docs/portal-master-spec.md)
(12 modules, developer-ready). Production checklist:
[`docs/PRODUCTION.md`](docs/PRODUCTION.md).

## Run it

```bash
npm install
npm run db:reset   # creates SQLite dev.db + seeds a full book of business
npm run dev        # http://localhost:3000
```

Sign in from `/login` as any seat — LO, PROC, UW, CM, or PRIN. Each role
sees its own task queue, signoff powers, and badge counts.

**Worth trying:** submit `/apply` and watch the lead score and route itself
· convert a QUALIFIED lead and watch the checklist/playbook/compliance
checks materialize · advance a deal into a document gate and use the PRIN
override · approve the pending Tier-2 signoff as PRIN · request a WC draw
under $8k (auto-approves) vs over (routes to review) · open a deal's
borrower portal link from the Overview tab.

## How it's put together

| Layer | Where | What |
|---|---|---|
| Data model | `prisma/schema.prisma` | Canonical entities per spec Module 09; SQLite dev, Postgres-portable |
| Domain engines | `lib/domain/` | Stage machines + playbooks, credit box (rules-as-data), lead scoring/knockouts, WC revolver, capital math, approval tiers |
| Event backbone | `lib/domain/events.ts` | Every stage transition: gates → StageEvent → playbook tasks → compliance checks → borrower notification → audit |
| Mutations | `app/actions.ts` | All writes; every one audited |
| Auth | `lib/auth.ts`, `middleware.ts` | HMAC-signed sessions, role capabilities, security headers; Clerk seam documented |
| Internal surface | `app/(ops)/` | My Day, leads, pipeline board, deal cockpit, approvals, draws, investors, compliance, reports, templates, settings |
| External surfaces | `app/b/[token]`, `app/i/[token]`, `app/apply` | Magic-link borrower portal, investor portal, public application + `POST /api/v1/public/leads` |
| Design system | `tailwind.config.ts`, `app/globals.css`, `components/` | "Credit desk": ledger green on paper, serif + mono, status-dot pills, hand-drawn icons |

## What's real vs stubbed

Everything in the workflow layer is real: scoring, routing, gates,
playbooks, credit box, approvals, draws, allocations, distributions,
compliance timers, audit trail. External vendors (e-sign, Plaid, ACH,
credit pulls, OFAC API, S3 storage) are simulated behind the Module 09
adapter seam — production keys drop in without schema changes. See
`docs/PRODUCTION.md` for the ordered cutover.
