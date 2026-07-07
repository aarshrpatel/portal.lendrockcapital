# Lendrock Capital Deal-Management Portal — Master Product Specification

**portal.lendrockcapital.com · Version 1.0 · July 2026 · Status: build spec (developer-ready)**

Prepared for: Lendrock Capital (lendrockcapital.com) — private direct lender, ~5-person team, four deal pathways, three portal surfaces. All lending is **business-purpose only**; no consumer credit anywhere in the system.

---

## Executive summary

Lendrock Capital runs high deal volume on a five-person team, which means the portal — not headcount — is the operating leverage. This specification defines a single standalone system that captures every lead from the marketing site or manual entry, drives each deal down one of four pathways, closes and services the loans Lendrock funds directly, syndicates investor capital where it doesn't, and keeps a business-purpose lender exam-ready by enforcing compliance in code rather than memory.

Every deal travels the same canonical pipeline: **NEW_LEAD → CONTACTED → QUALIFIED → APPLICATION → TERM_SHEET → UNDERWRITING → APPROVED → DOCS_CLOSING → FUNDED → SERVICING → PAID_OFF**, with terminal stages **DEAD** (non-credit, reason-coded) and **DECLINED** (credit decision, with automated Reg B adverse-action handling). Module 01 owns everything pre-application — capture-first web forms, dedupe, scoring, routing, and a 5-business-minute speed-to-lead SLA. Modules 02–05 specialize the skeleton per pathway. **HM** (hard money real estate: fix-and-flip, bridge-to-perm, ground-up) is the flagship: a 10–14-day application-to-fund clock built on an automated credit-box pre-screen, four parallel diligence workstreams, and post-funding draw and extension engines. **BB** (bridge and business loans) splits into CRE-secured and cash-flow sub-paths with SYS-computed bank-statement analysis and stacked-MCA detection. **WC** (working capital) is the only revolver — Plaid-native draws with rule-based auto-approval, covenant sweeps, freezes, and annual renewals that a healthy line completes with zero human touches. **SBA** is deliberately different: Lendrock is a packager/referral agent, never the lender, so the pathway is a document factory and multi-lender submission tracker with SBA Form 159 fee compliance hard-gated into the stage machine.

Three principles govern every module. **Automation-first:** anything that can be templated, scored, ordered, chased, or reconciled by SYS is; humans do judgment, not data entry. **Exactly one owner:** every stage, task, document request, and condition has a single accountable role — LO, PROC, UW, CM, or PRIN — with SYS as the sixth "role" for automated steps. **Three surfaces, one codebase:** internal ops, a passwordless borrower surface (magic links, upload checklists, e-sign, draws, payoffs), and an investor surface (onboarding, deal teasers, commitments, statements, 1099s), plus a broker surface behind a feature flag.

The supporting modules make the pathways cheap to run. Module 06 turns document collection into a state machine with a master requirements matrix, OCR auto-classification, freshness policing, and stage gates. Module 07 manages investor capital end to end — 506(b) posture, evergreen master participation agreement, FCFS allocation with concentration flags, monthly distribution batches on the 10th. Module 08 is the version-controlled template library (every legal instrument, letter, email, and SMS renders from registered merge fields; attorney review is a workflow state, not a habit). Module 09 is the canonical data model, event bus, permission matrix, and integration stack (Next.js/Prisma/Neon Postgres, Inngest, Dropbox Sign, Plaid, Dwolla, Persona/Middesk, Postmark/Twilio). Module 10 supplies the task engine, tiered approvals, credit-box rules-as-data, servicing ledger workflows, and compliance ops. Module 11 binds the legal constraints — state licensing, usury, Reg B, FCRA, OFAC, CFDL disclosures, Reg D, SBA agent rules — into blocking `compliance_checks`, and lands the build-vs-buy verdict: build origination custom, buy servicing math and every commodity API.

Module 12 consolidates every decision still owed by the founder — each with a recommended default so no open question blocks the build.

---

## System at a glance

```
                    ┌─────────────────────────────────────────────────┐
                    │        lendrockcapital.com (marketing site)     │
                    │  CTAs: Apply now · Match Engine · Broker submit │
                    └───────────────────────┬─────────────────────────┘
                                            │ POST /api/v1/public/leads (+ deals@ email parse, CSV, quick-add)
┌───────────────────────────────────────────▼───────────────────────────────────────────┐
│                        PORTAL — one codebase, one deploy (Vercel)                     │
│                                                                                       │
│  ┌─────────────────┐   ┌──────────────────────────┐   ┌───────────────────────────┐   │
│  │ BORROWER surface│   │      INTERNAL OPS        │   │     INVESTOR surface      │   │
│  │ magic link, no  │   │  LO · PROC · UW · CM ·   │   │  CM-invited, 506(b) gated │   │
│  │ accounts; apply,│   │  PRIN; pipeline board,   │   │  onboarding, teasers,     │   │
│  │ upload, e-sign, │   │  My Day, approvals,      │   │  commitments, statements, │   │
│  │ draws, payoff   │   │  credit box, memos       │   │  distributions, 1099-INT  │   │
│  └────────┬────────┘   └────────────┬─────────────┘   └────────────┬──────────────┘   │
│           │      (BROKER surface behind flag: submit + coarse status board)           │
│           ▼                         ▼                              ▼                  │
│  CANONICAL PIPELINE  NEW_LEAD → CONTACTED → QUALIFIED ─convert→ APPLICATION →         │
│  TERM_SHEET → UNDERWRITING → APPROVED → DOCS_CLOSING → FUNDED → SERVICING →           │
│  PAID_OFF   (terminals: DEAD reason-coded · DECLINED + adverse action)                │
│                                                                                       │
│  MODULES                                                                              │
│  01 Lead Intake ──► 02 HM │ 03 BB │ 04 WC │ 05 SBA (pathway workflows)                │
│  06 Documents · 07 Investors · 08 Templates · 10 Tasks/Servicing/Compliance-ops       │
│  09 Data model + DomainEvent outbox ──► Inngest consumers (all cross-module effects)  │
│  11 Compliance gates (LICENSE/USURY/CFDL/OFAC/AAN) block stage transitions            │
│                                                                                       │
│  Neon Postgres · S3 docs (SSE-KMS) · Transaction ledger · AuditLog hash chain         │
└───────┬──────────────┬──────────────────┬──────────────────┬──────────────────────────┘
        │              │                  │                  │
   Plaid / CRS     Dropbox Sign      Dwolla ACH         Postmark / Twilio
   Persona/Middesk HouseCanary/AMC   QuickBooks         Nylas / Lob / sanctions.io
   (credit, KYC/KYB) (e-sign, valuation) (money + GL)    (comms + OFAC)
```

## Roles (exact codes, used everywhere)

| Code | Role | Owns |
|---|---|---|
| LO | Loan Officer / originator | Leads, discovery, qualification, term-sheet issuance, borrower relationship |
| PROC | Processor / ops coordinator | Applications, document review, conditions, closings, servicing queues, complaint intake |
| UW | Underwriter (senior credit) | Credit analysis, memos, credit decisions within delegation, draw/extension review, DECLINED |
| CM | Capital Markets / Investor Relations | Investor lifecycle, allocations, distributions, partner-lender directory, capital dashboards |
| PRIN | Principal (final credit authority) | Exceptions, tier-2/3 approvals, template publishing, config, purges, workouts |
| SYS | Automated system step | Everything templated: scoring, ordering, chasing, rendering, screening, escalating |
| — | External roles | BORROWER, INVESTOR, BROKER (party-scoped portal accounts); ADMIN (PRIN-designated superuser) |

**Role coverage map (absence and overload protocol).** Every role has a named coverage inheritor per queue; SYS reroutes queue ownership when PRIN flags a user out-of-office, and the same map governs planned absence. A one-person role going dark must never silently breach every SLA in the system.

| Absent role | Queue inherited | Covering role |
|---|---|---|
| PROC | Financial-document review (tier-1 pass) | UW |
| PROC | Inbox triage, borrower chasing, complaint intake | LO |
| PROC | Wire prep, closing coordination | CM |
| PROC | WC draw approvals ≤ $100k, WATCH-alert dispositions | UW |
| LO | First-touch / speed-to-lead queue | PROC (PRIN fallback) |
| UW | Tier-2 document acceptance, draw review | PRIN |
| CM | Wire release dual control, distribution batches | PRIN |
| PRIN | Complaint response approvals (Module 10 §10.5.5) | UW |
| PRIN | Retention purge-manifest approvals (Module 10 §10.5.4) | UW |
| PRIN | Distribution-batch co-approval > $250k (Module 07 §6.2) | UW (preserves two-role dual control with CM) |
| PRIN | Template publishing (Module 08 §8.4) | UW (the pre-named ADMIN delegate) |

**PRIN out-of-office mode.** Credit authority never delegates — tier-2/3 countersigns, exception decisions, and condition waivers wait for PRIN by design (Module 02 §4.2). The four non-credit PRIN queues above are pre-delegated: when PRIN flags out-of-office, SYS reroutes them to the covering role, and every delegated decision writes an `acted_as_delegate_for = PRIN` audit-log entry. While OOO is active — and any week the oldest pending PRIN approval exceeds 2 business days — the Monday digest (Module 10 §10.1.8) adds a **PRIN approval queue** section listing every pending PRIN approval with its age.

**Aggregate capacity guardrail.** Every role's My Day header renders a queue-depth widget (open items per hard-SLA queue, SLA class colored), and the PRIN dashboard shows the same per role (Module 10 §10.6). When any role's open hard-SLA queue depth exceeds `wip_threshold` (config, default 25), SYS automatically relaxes every **non-gate** SLA for that role by one tier (≤ 4 business hrs → 1 bd; 1 bd → 2 bd), notes it in the Monday digest, and pages PRIN. Gate-blocking, closing-week, and compliance SLAs (adverse action, OFAC, wire controls) never relax.

## Table of contents

| # | Module | Contents |
|---|---|---|
| 00 | Overview | This section — summary, diagram, roles, TOC |
| 01 | Lead Intake & Pipeline Management | Capture, dedupe, scoring, routing, speed-to-lead, knockouts, nurture, loss taxonomy |
| 02 | Deal Workflow: HM | Hard-money stage flow, credit box, valuation matrix, draws, extensions, DEAD/DECLINED codes |
| 03 | Deal Workflow: BB | Bridge/business sub-paths, cash-flow engine, MCA stacking detection, UCC workflow |
| 04 | Deal Workflow: WC | Revolving LOC origination, draw auto-approval, covenant sweeps, freezes, renewals |
| 05 | Deal Workflow: SBA | Packager/referral pipeline, prescreen, package assembly, lender matching, Form 159 |
| 06 | Document Collection System | Master doc matrix, request lifecycle, borrower upload UX, storage, intake forms |
| 07 | Investor Management | Investor records, onboarding, allocation, investor portal, capital dashboard, distributions |
| 08 | Templates & Forms Library | Template architecture, full inventory, merge-field dictionary, governance |
| 09 | System Integration & Architecture | Canonical data model, event catalog, permission matrix, integrations, cross-cutting services |
| 10 | Ops, Reporting, Approvals, Comms, Servicing, Compliance Ops | Dashboards, approval tiers, comm hub, servicing engine, task engine, growth extras |
| 11 | Compliance & Build-vs-Buy / Tech Stack | Licensing/usury/Reg B/OFAC/CFDL/Reg D/SBA rules as gates; stack decision and roadmap |
| 12 | Open Questions & Recommended Defaults | Every founder decision, grouped by theme, each with a default |

---
# Module 01 — Lead Intake and Pipeline Management

This module owns every lead from first touch (website form, phone call, broker email, CSV list) through the moment an application link is opened, at which point the deal hands off to the Application/Processing module. It is capture-first (a lead record exists the instant step 1 of any form is submitted), automation-first (scoring, deal-type detection, routing, dedupe, auto-response, and stale-lead cleanup all run as SYS steps with zero human input), and single-owner (every lead has exactly one `owner_role`/`owner_user_id` at all times — default LO). It was specced against the live site (lendrockcapital.com, fetched 2026-07-05), whose real CTAs are `Apply now → /apply`, the Match Engine slider `Get matched → /apply?amount={n}` ($50K–$1M, default $250K), per-product `Get matched` cards, and the broker `Submit deal` CTA, and whose six marketed products map onto the four canonical pathways as: Bridge & Hard Money → **HM**; Equipment Financing and Private Credit → **BB**; Working Capital & MCA → **WC**; SBA 7(a) & 504 and Conventional → **SBA** (packaged/referred, not directly funded).

---

## 1. Lead data model

Table `leads` (one row per unique person+deal inquiry; contacts are deduped into it, not split out at this stage):

```
lead_id                 uuid PK
created_at, updated_at  timestamptz
lead_status             enum: NEW_LEAD | CONTACTED | QUALIFIED | CONVERTED |
                              DEAD | SPAM_QUARANTINE | EMAIL_REVIEW
                        (CONVERTED = deal created at APPLICATION handoff, lead frozen
                         read-only — Module 09 §9.2.7; DECLINED exists
                         only post-application — see §5.3)
deal_type               enum: HM | BB | WC | SBA | UNKNOWN
deal_type_confidence    numeric(3,2)   -- 0.00–1.00 from detection tree/parser
pathway_locked          boolean        -- true once LO confirms deal_type on call
owner_role              enum: LO | PROC | UW | CM | PRIN | SYS
owner_user_id           uuid FK users
-- identity
full_name, first_name, last_name       text
email                   citext; email_normalized (lowercased, gmail dots/+tags stripped)
mobile_phone            text E.164; phone_last10 generated column for matching
sms_consent             boolean; sms_consent_at timestamptz     -- TCPA capture
company_name            text
company_state           char(2)
-- deal basics (step 1)
loan_amount             integer (USD)
use_of_funds            enum (see §4.2 option codes)
funding_timeline        enum: ASAP_2W | W2_4 | M1_3 | EXPLORING
-- qualification (universal + per-type JSON)
credit_self_reported    enum: F740_PLUS | F680_739 | F620_679 | F550_619 | F_UNDER_550 | UNKNOWN
qualification           jsonb          -- per-deal-type fields, §4.1
lead_score              smallint 0–100; score_band enum: HOT | WARM | COOL
score_breakdown         jsonb          -- component points, for the UI tooltip
knockout_code           text null      -- DQ_* code if auto-disqualified
-- source / attribution (first-touch, immutable after create)
lead_source             enum: WEB_FORM | MATCH_ENGINE | BROKER_SUBMIT | BROKER_EMAIL |
                              PHONE_IN | REFERRAL | EVENT | CSV_IMPORT | RECYCLED_BORROWER |
                              REACTIVATED
form_variant            text           -- APPLY_NOW | MATCH_ENGINE | PRODUCT_HM | PRODUCT_SBA |
                                       -- PRODUCT_BB_EQUIP | PRODUCT_BB_PC | PRODUCT_WC | BROKER_SUBMIT
utm_source, utm_medium, utm_campaign, utm_term, utm_content   text
referrer, landing_page, gclid, fbclid  text
ip_address inet, user_agent text, session_id text
broker_id               uuid FK brokers null
referrer_contact        text null      -- free text for REFERRAL/EVENT
-- lifecycle
first_touch_due_at      timestamptz    -- SLA clock, business-time aware
first_touch_at          timestamptz    -- first human outbound logged
stage_entered_at        timestamptz    -- resets on every stage change (staleness clock)
app_link_sent_at, app_started_at       timestamptz
dead_reason             text null      -- taxonomy §7.2
dead_at, reactivated_at timestamptz
nurture_only            boolean default false   -- suppresses speed-to-lead (cold CSV lists)
step2_completed         boolean default false
duplicate_of_lead_id    uuid null      -- set on merge losers
```

Companion tables: `lead_events` (append-only activity log: every SYS action, call, SMS, email, stage change — `event_type`, `payload jsonb`, `actor`), `brokers` (`broker_id`, `broker_name`, `broker_email`, `broker_phone`, `default_split_bps`, `status`), `import_batches` (CSV audit), `routing_rules` (§5.1).

Emitted domain events (internal bus, consumed by other modules): `lead.created`, `lead.scored`, `lead.stage_changed`, `lead.dead`, `lead.merged`, `lead.reactivated`, `lead.sla_breached`.

---

## 2. Website capture

### 2.1 CTA → form variant map (matches live site)

| Live CTA | Route | form_variant | Prefill behavior |
|---|---|---|---|
| "Apply now" (nav, hero, footer) | /apply | APPLY_NOW | none |
| Match Engine "Get matched →" | /apply?amount={slider} | MATCH_ENGINE | `loan_amount` from `amount` param (clamped 50000–1000000) |
| Products page "Get matched →" per card | /apply?product={code} | PRODUCT_{code} | `use_of_funds` preselected; deal-type hint set (bridge-hard-money→HM, sba→SBA, conventional→SBA, equipment→BB, private-credit→BB, working-capital→WC) |
| Brokers "Submit deal →" | /brokers/submit | BROKER_SUBMIT | broker variant, §2.5 |
| Who-we-serve "See how we help →" | /apply?segment={owner\|investor} | APPLY_NOW | segment stored in `utm_content` |

All variants post to the same `POST /api/leads` endpoint; `form_variant` is a hidden field.

### 2.2 Two-step form spec

Design contract: step 1 completes in under 60 seconds and honors the site's "Two minutes, no hard credit pull to start" promise. **Submitting step 1 creates the lead immediately** — step 2 is a bonus, not a gate. No credit pull, no SSN, no document upload anywhere in this module.

**Step 1 — capture (7 inputs, one screen):**

| # | Field | Input | Validation |
|---|---|---|---|
| 1 | `loan_amount` | slider $50K–$1M, $25K steps, prefilled from `?amount=` | required; "$1M+" end-stop allowed, stores 1000001 |
| 2 | `use_of_funds` | single-select cards (8 options, §4.2) | required — drives deal-type detection |
| 3 | `funding_timeline` | 4 radio chips: "ASAP (under 2 weeks)" / "2–4 weeks" / "1–3 months" / "Just exploring" | required |
| 4 | `full_name` | text | required, ≥2 tokens |
| 5 | `email` | email | required, MX check async server-side |
| 6 | `mobile_phone` | tel, auto-format | required, Twilio Lookup server-side |
| 7 | `sms_consent` | checkbox, default unchecked, TCPA language | optional; timestamp stored |

CTA label: **"See my options →"** (never "Submit application" — keeps commitment low).

**Step 2 — qualify (4–6 questions, rendered per detected deal type):** shown immediately after step-1 success with copy "2 more questions and we can match you today." Fields are exactly the conditional qualification fields in §4.1 plus `credit_self_reported` (self-stated range, framed "soft estimate — we never hard-pull to quote"). Abandoning step 2 sets `step2_completed=false` and triggers the step-2 chase automation (§2.4). Completing it re-scores the lead in real time.

### 2.3 Hidden fields and attribution

Captured on every web submission, first-touch immutable: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `fbclid` (from URL, persisted in `sessionStorage` so they survive navigation to /apply), `referrer` (`document.referrer`), `landing_page` (first page of session), `form_variant`, `session_id`, plus server-side `ip_address` and `user_agent`. If a duplicate lead re-submits, first-touch attribution is preserved and the new touch is appended to `lead_events` as `event_type=REPEAT_SUBMISSION`.

### 2.4 Spam controls and step-2 chase

- **Cloudflare Turnstile** (invisible mode) on step-1 submit; failure blocks client-side.
- **Honeypot** hidden text field `company_website_hp`; non-empty → silently accept, create with `lead_status=SPAM_QUARANTINE`.
- **Dwell-time floor**: submissions < 3s after page render → SPAM_QUARANTINE.
- **Server-side**: disposable-email domain blocklist (mailinator etc.) → SPAM_QUARANTINE; Twilio Lookup — invalid number → SPAM_QUARANTINE, VOIP line → flag `voip_phone=true` (score −3, not blocked); rate limit 5 submissions/IP/hour, 20/day.
- SPAM_QUARANTINE leads get no auto-response and no routing; PROC receives a daily 9:00 ET digest to rescue false positives (one-click "restore → NEW_LEAD").
- **Step-2 chase (SYS)**: if `step2_completed=false` 15 minutes after create → SMS "Almost done — 2 quick questions and {lo_first_name} can price your deal: {magic_link}"; +24h email repeat. Magic link resumes step 2 pre-authenticated.

### 2.5 Broker submit variant (/brokers/submit)

Single-step, 9 fields: `broker_name`, `broker_email`, `broker_phone`, `borrower_company_name`, `borrower_contact_name` (optional), `loan_amount`, `use_of_funds`, `property_state`/`company_state`, `deal_notes` (free text ≤1000 chars). Creates lead with `lead_source=BROKER_SUBMIT`, links/creates `brokers` row keyed on `broker_email`. Auto-response goes to the **broker**, not the borrower (broker owns the client relationship — site promise "Your client stays yours"); the borrower is never contacted directly until the broker consents (`broker_direct_contact_ok` flag, default false, LO flips it after the broker intro call). Post-submission, SYS keeps the broker informed via the automated milestone emails of Module 10 §10.7.2 (coarse stage groups, launch scope) — the submission ack is never the last automated broker touch.

### 2.6 Instant auto-response (SYS, fires within 30 seconds of lead creation)

Skipped when `nurture_only=true` or SPAM_QUARANTINE. Templates are per-deal-type variants of one skeleton; all include the assigned LO's name, direct line, and a scheduling link (Cal.com embed, LO's calendar, 15-min "Intro call" slot type).

- **Email** (always): subject `"{first_name}, your {product_label} request at Lendrock — next step"`; body: amount + product echo, "no hard credit pull," 3-bullet what-happens-next, scheduling link, LO signature. From `{lo_first}@lendrockcapital.com`, reply-to LO.
- **SMS** (only if `sms_consent=true`): `"Hi {first_name}, this is {lo_first} at Lendrock Capital — got your request for {amount_short} ({product_label}). Grab 15 min with me here: {cal_link} or just reply to this text. Reply STOP to opt out."`
- Booking a slot logs `event_type=MEETING_BOOKED`; the first-touch SLA still requires a human outbound (call/SMS/email authored by LO) unless the meeting occurs first.

---

## 3. Manual and external entry

### 3.1 Quick-add form (30-second target)

Internal, keyboard-first modal launched with hotkey `N` from any portal screen. Exactly 6 inputs, everything else defaulted: `full_name`*, `mobile_phone`* (or `email` — at least one contact channel required), `loan_amount` (slider, default 250000), `use_of_funds` (select, default OTHER → deal_type UNKNOWN), `lead_source`* (PHONE_IN | REFERRAL | EVENT | BROKER — BROKER reveals a broker typeahead), `notes` (optional). On save: dedupe check runs inline (match preview shown before commit), scoring/routing/auto-response fire exactly as for web leads except the auto-response email/SMS is **suppressed by default for PHONE_IN** (the human is already talking to them), with a "send intro email" checkbox defaulted on for REFERRAL/EVENT/BROKER.

### 3.2 Inbound broker email parsing

Dedicated inbox `deals@lendrockcapital.com` (advertised on the /brokers page and in all broker comms). Pipeline (all SYS):

1. Inbound webhook (Postmark inbound parse) → raw MIME stored.
2. LLM extraction to a strict JSON schema: `broker_name/email/phone` (from signature/headers), `borrower_company_name`, `contact_name`, `loan_amount`, `use_of_funds` guess, `property_state`, `deal_notes` (summary), per-field `confidence`.
3. Overall confidence ≥ 0.80 **and** amount + one contact field present → auto-create lead (`lead_source=BROKER_EMAIL`), auto-ack email to broker ("Received — {lo_first} will respond within 1 business hour"), attachments forwarded to the Document/File-room module keyed to `lead_id`.
4. Confidence < 0.80 → lead created with `lead_status=EMAIL_REVIEW`, task for **PROC** ("Confirm parsed deal") with side-by-side original email + editable extraction; PROC confirms in one click → NEW_LEAD. SLA: review within 2 business hours.
5. Reply threads matching an existing lead's broker/borrower email are appended to that lead's `lead_events`, never created as new leads.

### 3.3 CSV import

PROC-owned, `Settings → Import`. Fixed template columns (download link in UI): `full_name, email, mobile_phone, company_name, company_state, loan_amount, use_of_funds, lead_source, broker_email, notes`. Rules: max 5,000 rows/batch; hard validation on email/phone format; **mandatory dry-run preview** showing counts of NEW / DUPLICATE (with per-row match target) / ERROR before commit; per-batch flags `nurture_only` (default **true** for imports — cold lists must not trigger speed-to-lead, and SMS is never sent to imported leads because `sms_consent=false`) and `duplicate_strategy` (SKIP default | MERGE). Every batch writes an `import_batches` row (`filename`, `row_counts`, `imported_by`) and each lead stores `import_batch_id` for one-click batch rollback within 72 hours.

### 3.4 Dedupe rules

Run synchronously on every create path (web, quick-add, email parse, CSV):

- **Match criteria (any one = duplicate):** (a) `email_normalized` exact match; (b) phone match on `phone_last10` (E.164-normalized, country code/extension stripped — the fuzzy-phone rule); (c) trigram similarity ≥ 0.85 on `full_name` **AND** exact `company_name` match (both non-null).
- **Merge behavior:** oldest lead is the **survivor** (keeps `lead_id`, first-touch attribution, source fields). Field-level: contact/deal fields take newest non-null value; `lead_events` from the loser are appended; loser gets `lead_status=DEAD`, `dead_reason=DUPLICATE`, `duplicate_of_lead_id` set. Merging into an **active** lead does NOT re-fire auto-response or reset SLA clocks — it logs `REPEAT_SUBMISSION`, bumps `lead_score` +5 (renewed intent), and notifies the owner in-app.
- **Reactivation on dupe:** if the survivor is DEAD and `dead_at` > 30 days ago, it reopens as NEW_LEAD (`lead_source` unchanged, `reactivated_at` set, event `lead.reactivated`) and the full speed-to-lead sequence fires. DEAD < 30 days: appended as a note on the dead lead, owner notified, no auto-reopen (prevents decline-shopping loops on fresh knockouts).

---

## 4. Qualification

### 4.1 Fields

**Universal (all deal types):** `loan_amount`, `use_of_funds`, `funding_timeline`, `credit_self_reported`, `company_name`, `company_state`, `business_purpose_confirmed` (boolean — must be true; see knockouts), `entity_type` (LLC | CORP | LP | SOLE_PROP | NOT_FORMED — SOLE_PROP triggers the `DQ_NATURAL_PERSON` knockout, §4.4; NOT_FORMED is allowed, with formation a prior-to-funding condition).

**Conditional per deal type** (stored in `qualification` jsonb; asked in form step 2 and/or on the LO discovery call):

| Deal type | Fields |
|---|---|
| HM | `property_state`*, `property_type` (SFR \| MULTI_2_4 \| MULTI_5PLUS \| MIXED_USE \| COMMERCIAL \| LAND — canonical enum, Module 09 §9.2.2), `transaction_type` (PURCHASE \| REFI \| CASHOUT_REFI \| CONSTRUCTION), `purchase_price`, `rehab_budget`, `after_repair_value`, `current_property_value` (refi), `exit_strategy` (SELL \| REFI_PERM \| HOLD_RENT), `deals_completed_36mo` (0 \| 1_2 \| 3_9 \| 10_PLUS), `owner_occupied` (boolean — knockout trigger) |
| BB | `collateral_type` (EQUIPMENT \| RE_SECOND_LIEN \| AR_INVENTORY \| UNSECURED \| OTHER), `collateral_value`, `annual_revenue`, `time_in_business_months`, `equipment_description` (if equipment), `existing_debt_monthly_payment` |
| WC | `monthly_revenue`*, `time_in_business_months`*, `bank_balance_avg` (self-stated), `existing_mca_positions` (0 \| 1 \| 2 \| 3_PLUS), `industry` (select, prohibited-list aware) |
| SBA | `annual_revenue`, `time_in_business_months`, `profitable_last_year` (boolean), `us_citizen_or_national_owners` (boolean — LPR owners no longer SBA-eligible; see Module 05 §5.4 check 4), `sba_use` (RE_PURCHASE \| BUSINESS_ACQUISITION \| EXPANSION \| REFINANCE \| WORKING_CAPITAL), `has_tax_returns_ready` (boolean) |

`*` = required before the lead can enter QUALIFIED.

### 4.2 Deal-type auto-detection question tree

`use_of_funds` (step-1 select) is the primary classifier. Option codes → deal type:

| Code | Card label (borrower-facing) | → deal_type | confidence |
|---|---|---|---|
| FIX_FLIP | "Buy & renovate an investment property" | HM | 0.95 |
| RE_BRIDGE | "Purchase/refi an investment property fast" | HM | 0.90 |
| CONSTRUCTION | "Ground-up construction" | HM | 0.95 |
| BIZ_ACQUISITION | "Buy a business or commercial building" | SBA | 0.80 |
| EQUIPMENT | "Buy equipment or vehicles" | BB | 0.95 |
| EXPANSION_LOW_RATE | "Long-term growth capital at the lowest rate" | SBA | 0.85 |
| CASH_FLOW | "Cover cash-flow gaps, payroll, inventory" | WC | 0.95 |
| OTHER | "Something else" | UNKNOWN | — |

Disambiguation follow-ups (rendered in step 2 only when needed):

1. HM-tagged REFI with desired term > 24 months or "lowest rate matters most" → reclass **SBA**; term ≤ 24 months stays HM (bridge-to-perm stays HM with the SBA exit noted in `exit_strategy`).
2. BIZ_ACQUISITION with `funding_timeline=ASAP_2W` → reclass **BB** (SBA cannot close in 2 weeks; pitch bridge-now-SBA-takeout, set flag `sba_takeout_candidate=true` for UW/CM visibility).
3. OTHER/UNKNOWN: two-question mini-tree — "Is real estate the collateral?" yes → HM path; no → "One-time need, or a line you can reuse?" line → WC, one-time → BB. Still UNKNOWN after step 2 → LO resolves on the discovery call; `pathway_locked=true` only after LO confirmation.
4. `loan_amount > 1000000` → keep detected type, set `jumbo_referral=true` (site box tops at $1M; PRIN decides direct vs. partner placement).

### 4.3 Lead score (0–100, computed on create and on every field change)

`lead_score = amount_fit + type_fit + timeline + credit + strength + source + contact_quality`:

| Component | Max | Rules |
|---|---|---|
| amount_fit | 20 | $150K–$1M: 20 · $100–150K: 15 · $50–100K: 10 · >$1M: 8 · <$50K: 0 (knockout anyway) |
| type_fit | 15 | HM: 15 · BB: 12 · WC: 10 · SBA: 8 · UNKNOWN: 5 (margin-ranked: direct-lend spread beats packaging fees) |
| timeline | 15 | ASAP_2W: 15 · W2_4: 12 · M1_3: 8 · EXPLORING: 3 |
| credit | 10 | F740_PLUS: 10 · F680_739: 8 · F620_679: 6 · F550_619: 3 · F_UNDER_550: 1 · UNKNOWN: 5 |
| strength | 20 | HM: computed LTV = loan/(ARV or value): ≤65%: 20 · 65–75%: 14 · >75%: 6; +2 if `deals_completed_36mo ≥ 3` (cap 20). WC/BB: monthly_revenue ≥ $100K: 20 · $50–100K: 14 · $15–50K: 8; −4 if `existing_mca_positions ≥ 2`. SBA: `profitable_last_year` && TIB ≥ 24mo: 16 · else 8. Missing data: 8 |
| source | 10 | RECYCLED_BORROWER: 10 · BROKER_* / REFERRAL: 8 · WEB organic (no gclid/fbclid): 6 · WEB paid: 4 · CSV_IMPORT: 2 |
| contact_quality | 10 | valid mobile (non-VOIP): +5 · business email domain (non-free): +3 · `step2_completed`: +2 |

Bands: **HOT ≥ 70** (call-now queue, SMS ping to owner LO), **WARM 40–69** (standard SLA), **COOL < 40** (nurture track; first-touch SLA relaxed to 4 business hours, no escalation). Score and band recompute live; band upgrades re-notify the owner.

### 4.4 Hard knockouts (SYS, evaluated on create and on every qualification update)

Any hit → `lead_status=DEAD`, `dead_reason=INELIGIBLE_DQ`, `knockout_code` set, polite templated decline email fired at T+5 minutes (the delay is deliberate — instant declines feel robotic), owner notified, all other automation halted.

| knockout_code | Rule |
|---|---|
| DQ_CONSUMER_PURPOSE | `business_purpose_confirmed=false` or personal/household use of funds |
| DQ_OWNER_OCCUPIED_RESIDENTIAL | HM with `property_type IN (SFR, MULTI_2_4)` and `owner_occupied=true` |
| DQ_AMOUNT_BELOW_MIN | `loan_amount < 50000` |
| DQ_EXCLUDED_STATE | HM `property_state` not in `licensed_or_exempt_states` — **derived live from the Module 11 `licensing_matrix` (Module 10 §10.5.1), never a duplicated list**: a state qualifies only when its matrix row for the pathway/collateral class has `license_status` `ACTIVE` or `EXEMPT` (or `license_required = false`); a state with **no** matrix row blocks (matches Module 10 §10.5.1). If a literal seed must ship before the matrix is populated, exclude CA, AZ, NV, ND, SD, VT (Tier 1 — license required regardless of collateral) **plus** OR, UT, MN, ID (Tier 2 — 1–4-unit-residential trap; most HM collateral is 1–4 unit) until licenses/exemptions are confirmed, and flag FL counsel-review per the WBK guidance (Module 11 §A1) |
| DQ_REVENUE_BELOW_MIN | WC with `monthly_revenue < 15000` |
| DQ_TIB_BELOW_MIN | WC/BB with `time_in_business_months < 6` (SBA < 24mo is NOT knocked out; flagged `sba_startup=true` for partner-bank fit) |
| DQ_INDUSTRY_PROHIBITED | `industry` in config list (default: adult, cannabis-touching, gambling, firearms dealers, crypto mining) |
| DQ_NOT_US | entity or property outside the US |
| DQ_ACTIVE_BK | self-disclosed open bankruptcy |
| DQ_NATURAL_PERSON | `entity_type = SOLE_PROP` — Lendrock lends only to entity borrowers (LLC/corp/LP; Module 11 §A1 rule 3, ratified Module 12 B7). Decline email uses the "form an LLC first" alternative pointer (entity-formation resource page); lead is tagged for the entity-formation nurture track and reactivates per §3.4 if the contact returns with a formed entity. `NOT_FORMED` is NOT knocked out — entity-to-be-formed proceeds with formation docs as a prior-to-funding condition (Module 02 §3.7) |

Decline template: thanks + "outside our current lending criteria" + one relevant alternative pointer (e.g., below-min amounts → microlender resource page) + the business-credit rights sentence: *"You may request a statement of specific reasons for this decision within 60 days"* with a contact address + the 12 CFR 1002.9(b)(1) ECOA notice block — anti-discrimination statement, Lendrock legal name and address, and the Federal Trade Commission named as the enforcing federal agency (non-bank lender) — the same block `DECLINE_LTR` carries in Module 08 (Reg B business-credit floor; formal post-application adverse action lives in the Underwriting module — §5.3). All DQ leads remain queryable; PROC audits a weekly DQ report for false knockouts.

---

## 5. Routing and speed-to-lead

### 5.1 Rules engine

Ordered rules, first match wins, evaluated after scoring/knockouts on every create and deal-type change. Config lives in an admin-editable `routing_rules` table (`priority`, `conditions jsonb`, `assign_owner_role`, `assign_user_strategy`, `flags`; PRIN-editable, versioned), seeded with:

| # | Condition | Action |
|---|---|---|
| 1 | knockout hit | DEAD per §4.4 — stop |
| 2 | `lead_status in (SPAM_QUARANTINE, EMAIL_REVIEW)` | hold in PROC queue — stop |
| 3 | `loan_amount > 1000000` | owner **LO**, flag `jumbo_referral`, in-app notify PRIN |
| 4 | `lead_source in (BROKER_SUBMIT, BROKER_EMAIL)` | owner **LO**, broker linked, broker-aware templates |
| 5 | `deal_type = SBA` | owner **LO**, pathway SBA, flag `packaging_deal=true` (CM gets read access for partner-bank matching — CM never owns pre-app leads) |
| 6 | default | owner **LO**, pathway per `deal_type` |

Owner assignment: with one LO today, `assign_user_strategy=FIXED`. ROUND_ROBIN and STATE_TERRITORY strategies ship dormant so adding a second LO is a config change, not a build. **Every lead has a single named LO — no pooled queues.** **First-touch backup:** `routing_rules` carries a `first_touch_backup_role` config, seeded **PROC** (PRIN is the escalation path, not the backup). The backup never takes ownership — they cover the first outbound only when the LO misses the §5.2 SLA, and a backup-authored outbound satisfies `first_touch_at`.

### 5.2 Speed-to-lead automation

Business hours config: Mon–Fri 08:00–20:00 America/New_York plus a holidays table. All SLA clocks run in business time.

1. `lead.created` (non-quarantine, `nurture_only=false`) → **T+30s SYS**: auto-response email + SMS (§2.6); `first_touch_due_at = now + 5 business minutes`.
2. **T+0**: owner LO gets push + SMS: `"NEW {score_band} lead: {name}, {amount_short} {deal_type}, {timeline}. Call {phone}."` HOT leads add a click-to-call deep link.
3. **T+5 business min, no human outbound logged**: escalation level 1 — repeat SMS to LO + in-app banner; flag `sla_breach_l1`.
4. **T+15 business min**: escalation level 2 — CALL task + SMS to the **first-touch backup (PROC, §5.1)** to make the first outbound now; SMS to **PRIN** naming the lead and the silent LO; event `lead.sla_breached`. Ownership stays with the LO.
5. **T+30 business min**: SYS sends the borrower a second-chance SMS/email ("Want to skip the phone tag? Book here: {cal_link}") so no lead sits silent even when humans fail.
6. **After hours**: auto-response promises contact "by {next_business_open + 1h}"; `first_touch_due_at` = next business open + 60 min; a CALL task is created dated for open of business.
7. First touch is satisfied only by a human outbound authored by the owner LO **or the designated first-touch backup (§5.1)** — call attempt with logged disposition, manual SMS, personal email — or a completed booked meeting; auto-responses never count. Weekly report: median time-to-first-touch (target < 5 min) and breach rate (target < 10%).

### 5.3 DECLINED vs DEAD (boundary decision)

Pre-application knockouts and losses are **DEAD** (with `dead_reason`/`knockout_code`) because no application exists yet. **DECLINED** is reserved for post-application credit decisions and lives in the Underwriting module with formal adverse-action handling; this module never sets it. The §4.4 decline email carries the Reg B business-credit rights sentence as a conservative floor.

---

## 6. Pre-application pipeline stages

| Stage | Owner | Required actions | Automations (SYS) | Exit criteria | Target SLA |
|---|---|---|---|---|---|
| NEW_LEAD | LO | Review lead card; first live outbound (call first for HOT); log disposition | Dedupe, score, route, auto-response email/SMS, scheduling link, speed-to-lead escalations, step-2 chase | `first_touch_at` set → auto-advance to CONTACTED on first logged outbound | First touch ≤ 5 business min; exit ≤ 1 business day |
| CONTACTED | LO | Discovery call; fill missing qualification fields; confirm deal type (`pathway_locked=true`); set terms-range expectations | Missed-call auto-SMS; call recording + auto-log; qualification-gap checklist on lead card; live re-score on every field save | All required qualification fields present, no knockout, LO marks qualified → QUALIFIED; or loss/knockout → DEAD | Exit ≤ 3 business days |
| QUALIFIED | LO | Communicate indicative range verbally; send application link (per-pathway template); handle objections | Magic-link application generated (prefilled from lead); reminder drip: +24h SMS, +72h email, +5d LO task "call re: application" | `app_started_at` set (borrower opens/begins app) → CONVERTED (deal created at APPLICATION), handoff to the deal-type workflow module (02–05) which takes ownership | App link sent ≤ 4 business hours after qualifying; exit ≤ 5 business days |
| CONVERTED → deal APPLICATION | (deal-type module 02–05) | — handoff: full lead payload, score, qualification, attribution, broker link; lead frozen read-only — | `lead.converted` event carries the prefill payload (Module 09 §9.2.7) | — | — |
| DEAD | SYS/LO | `dead_reason` mandatory (UI/API-enforced); optional note | DQ decline email; suppression from active views; re-engagement eligibility tagging (§7.3) | Reactivation per §3.4 / §7.3 only | — |

Stage regressions (e.g., QUALIFIED → CONTACTED when a deal reshapes) are allowed for LO with a required note; `stage_entered_at` resets.

---

## 7. Stale-lead automation, loss taxonomy, re-engagement

### 7.1 Nurture + auto-DEAD clocks (business days, driven by `stage_entered_at` and last inbound engagement)

- **NEW_LEAD** (unreached): Day 0 auto-response → Day 1 email #2 (deal-type case study) → Day 2 call task → Day 3 SMS #2 → Day 5 email #3 ("still need the {amount_short}?") → Day 7 final SMS ("closing your file unless we hear back") → **Day 10 auto-DEAD `UNRESPONSIVE`** if zero inbound engagement (no reply, click, or booking). Any inbound resets the clock and pings the owner.
- **CONTACTED**: SYS reminder tasks to LO at Day 3/7/14; **Day 21 auto-DEAD `UNRESPONSIVE`** (LO gets a 48h warning task and can snooze once for 14 days with a reason note).
- **QUALIFIED** (app link sent, never started): reminder drip per §6; **Day 30 auto-DEAD `APP_ABANDONED`**, same 48h warning/snooze.
- COOL-band and `nurture_only` leads skip calls entirely: 5-email/6-week educational sequence; auto-DEAD `UNRESPONSIVE` at Day 45.
- All auto-DEAD actions log `actor=SYS` and are batch-reversible for 7 days.

### 7.2 Lost-reason taxonomy (`dead_reason`, required on every DEAD)

`UNRESPONSIVE` · `APP_ABANDONED` · `WENT_COMPETITOR` (optional `competitor_name`) · `RATE_TOO_HIGH` · `FEES_TOO_HIGH` · `LEVERAGE_TOO_LOW` · `TIMING_NOT_READY` (captures `revisit_at` date — auto-schedules reactivation) · `PROJECT_CANCELLED` · `INELIGIBLE_DQ` (+ `knockout_code`) · `BROKER_PULLED` · `DUPLICATE` · `SPAM_JUNK` · `OTHER` (note required). Every code maps 1:1 onto the shared cross-pathway DeadReason `core_code` taxonomy (Module 09 §9.2.2), which drives nurture triggers and the cross-pathway Pareto. Weekly loss report to PRIN grouped by reason × deal_type × source — this table is the pricing/product feedback loop.

### 7.3 Re-engagement triggers (all SYS)

- **Rate-drop campaign**: when a pathway's published pricing config (Pricing/Term-Sheet module) drops ≥ 50 bps, enqueue a campaign to DEAD leads with `dead_reason in (RATE_TOO_HIGH, WENT_COMPETITOR)` from the trailing 12 months in that pathway: personalized email + SMS "rates just dropped — your {deal_type_label} deal may now price at {new_range}". Any click/reply → reactivate as NEW_LEAD (`lead_source=REACTIVATED`); full speed-to-lead fires.
- **Past-borrower recycling**: owned by the repeat-borrower recycle playbook, Module 10 §10.7.1 (day 0/14/30 `payoff_recycle` sequence on `loan.paid_off`, −60-day pre-maturity trigger, quarterly nurture) — this module runs no separate paid-off campaign and creates no fresh lead. It reserves `lead_source = RECYCLED_BORROWER` (+10 source points, owner = original LO); express-lane re-applications enter the pipeline at QUALIFIED (skipping NEW_LEAD/CONTACTED) per that playbook.
- **`TIMING_NOT_READY` revisit**: on stored `revisit_at`, reactivate to NEW_LEAD and task the LO.
- **Quarterly resurrection**: one email per quarter to `UNRESPONSIVE`/`APP_ABANDONED` DEAD leads aged 90–365 days ("still planning the project?"); engagement reactivates per §3.4. Leads dead > 365 days are excluded from all automation (list hygiene) but retained for dedupe matching.

---

## Interfaces with other modules

- **Deal workflow modules (02–05)**: QUALIFIED → CONVERTED handoff at APPLICATION — magic-link application generation, full prefill payload (identity, deal, qualification, attribution, broker), ownership transfer; `app_started_at` write-back.
- **Underwriting**: consumes `lead_score`, `score_breakdown`, and `qualification` jsonb as the starting credit file; owns DECLINED and formal adverse-action letters; feeds knockout-rule tuning.
- **Pricing/Term-Sheet**: publishes pathway rate cards (source of the indicative range quoted at QUALIFIED); its rate-change events trigger the rate-drop re-engagement campaign.
- **Documents/File room**: receives broker-email attachments keyed to `lead_id` before an application exists.
- **Servicing**: emits `loan.paid_off`, consumed by the repeat-borrower recycle playbook (Module 10 §10.7.1); borrower history enriches recycled-lead scoring.
- **Capital Markets / SBA partner desk (CM)**: read access to `packaging_deal=true` and `jumbo_referral=true` leads for partner-bank matching; never owns pre-app leads.
- **Broker portal**: /brokers/submit and the `deals@` parser are the intake edge of the broker surface; broker records, splits, and `broker_direct_contact_ok` are shared.
- **Comms engine**: all email/SMS templates, TCPA consent (`sms_consent`, STOP handling), Cal.com scheduling, call logging/recording.
- **Compliance/Audit**: Reg B business-credit decline language, Section 1071 data-capture hooks at application, immutable `lead_events` log, PRIN-only edits to `hm_excluded_states` and prohibited-industry configs.
- **Reporting**: funnel conversion by stage × source × deal_type, time-to-first-touch, SLA breach rate, loss-reason analytics.
# Module 02 — Deal Workflow: HM (Hard Money Real Estate)

The HM pathway covers Lendrock's balance-sheet real estate lending across three products — `HM_FF` (fix and flip), `HM_BTP` (bridge-to-perm), and `HM_GUC` (ground-up construction) — all business-purpose, entity-borrower, guarantor-backed loans secured by 1st-lien deeds of trust/mortgages. The pipeline runs on the canonical skeleton with a hard target of **10–14 calendar days from complete application to funding** (the marketed clock applies to deals ≤ $1.5M on the AVM/BPO/hybrid valuation paths of §3.2; > $1.5M full-appraisal deals run the 14-day edge or longer), achieved by (a) an automated credit-box pre-screen that gates term sheets in minutes, not days, (b) firing all third-party orders (title, valuation, insurance, background) in parallel on term-sheet acceptance, and (c) a valuation path that scales with loan size so small loans never wait on a full appraisal. Post-funding, HM adds two workflows no other pathway has: rehab/construction draw administration and maturity-driven extension/modification handling.

Every HM deal carries `deal_type = HM` and `hm_product ∈ {HM_FF, HM_BTP, HM_GUC}` set at QUALIFIED (changeable until TERM_SHEET issuance; change re-runs the pre-screen).

---

## 1. Stage flow (canonical skeleton, HM-specialized)

Business days = bd, calendar days = cd. SLA clock starts on stage entry. Every stage has exactly one owner; tasks inside a stage may be assigned to others but the stage owner is accountable for the exit.

> Stages NEW_LEAD → QUALIFIED are mechanically owned by Module 01 (capture, dedupe, scoring, routing, speed-to-lead, nurture/auto-DEAD clocks). The rows below add only HM-specific discovery and eligibility content.

| Stage | Owner | Required actions | Automations (SYS) | Exit criteria | Target SLA |
|---|---|---|---|---|---|
| NEW_LEAD | LO | Review SYS-enriched lead card; first live outbound per Module 01 speed-to-lead. | Capture, dedupe, scoring, routing, auto-response, and escalations owned by Module 01; HM enrichment adds an AVM ping on `property_address` (if provided) and entity lookup. | `first_touch_at` logged. | First touch ≤ 5 business min (Module 01 §5.2) |
| CONTACTED | LO | Discovery call: property, purchase price, rehab scope, timeline, experience, liquidity, exit strategy. Log call notes on structured intake form. | Nurture cadence + auto-DEAD clocks owned by Module 01 §7.1 (day 3/7/14 LO reminders, day-21 auto-DEAD `UNRESPONSIVE`); HM-specific message bodies registered as that cadence's content in the Module 08 registry; call recording + transcript attached to deal. | Discovery form complete: `hm_product`, `purchase_price`, `rehab_budget_total`, `arv_estimate`, `exit_strategy`, `stated_experience`, `stated_liquidity`, `target_close_date` all populated. | 2 bd |
| QUALIFIED | LO | Confirm business purpose + entity borrower (or entity-to-be-formed); confirm property type eligible; run soft "sizing" quote in pricing widget; set `hm_product`. | Eligibility rules engine: geography footprint check (`property_state` in lending footprint), property type check, loan size bounds ($100k–$5M); auto-flag `occupancy_intent = OWNER_OCCUPIED` as hard stop (consumer purpose). | Passes eligibility rules; borrower verbally accepts indicative pricing; LO clicks "Send Application". | 1 bd |
| APPLICATION | PROC | Monitor borrower portal completion; chase stalled items; review uploads for legibility/completeness (not credit quality). | Send borrower-portal application link (per-product smart form); e-sign credit/background authorization; **soft tri-merge credit pull on all guarantors**; **OFAC/watchlist scan** on entity + all guarantors + ≥20% owners; ID verification (doc + selfie liveness); doc checklist auto-generated by `hm_product`; daily borrower nudges on missing items; auto-calc `ltv_as_is_pct`, `ltc_pct`, `ltarv_pct` from stated figures. | All checklist docs received; `application_complete_at` stamped; soft credit + OFAC results returned. | 3 cd from link sent (borrower-dependent); PROC review of each upload ≤ 4 business hrs |
| TERM_SHEET | LO | Review pre-screen output; adjust structure within guardrails (rate/points/advance splits); issue term sheet; negotiate; collect signed TS + due-diligence deposit. | **Credit-box pre-screen** (§4.1) runs on `application_complete_at`; auto-generate term sheet PDF from pricing engine; e-sign; on signature, auto-invoice `dd_deposit_amount` (default $1,995 FF/BTP, $2,995 GUC) via ACH/card; TS auto-expires after 10 cd; reminder at 3 and 7 cd. | Term sheet e-signed + deposit cleared (`ts_signed_at`, `deposit_paid_at`). Pre-screen result = PASS, or PASS_WITH_EXCEPTIONS with exception request opened. | Issue TS ≤ 1 bd from complete application; acceptance window 10 cd |
| UNDERWRITING | UW | Full credit underwrite: valuation review, budget/feasibility review (§5.1), track-record scoring (§3.5), liquidity verification, background review, title/entity/insurance condition clearing; write credit memo; issue conditional approval or decline. Runs the **four parallel workstreams** (§2). | On stage entry (deposit cleared), auto-order in parallel: title prelim + escrow open, valuation per §3.2 matrix, background checks, insurance request letter to borrower's agent; auto-order feasibility review when `rehab_budget_total > 100000` or `hm_product = HM_GUC`; bank-data liquidity verification (Plaid-style) with manual statement fallback; condition list auto-seeded from product template; daily digest of aging conditions to UW + PROC. | Credit memo complete; all PRIOR_TO_APPROVAL conditions cleared; valuation, title prelim, budget review, entity review all ACCEPTED; decision recorded. | 5 bd from deposit (7 bd for any deal whose §3.2 matrix product is a full appraisal — all HM_GUC, plus > $1.5M, 5+ units, or mixed-use) |
| APPROVED | UW | Finalize approval terms; obtain PRIN sign-off when required (§4.2); lock rate/fees; issue commitment letter. | Route approval package per sign-off matrix; e-sign commitment letter; on full sign-off, auto-instruct docs (§ DOCS_CLOSING) and notify CM to reserve capital (`capital_reservation_id`). | Commitment letter signed by borrower; all required internal signatures captured; `approved_amount`, `approved_rate`, `approved_term_months` locked. | Internal sign-off ≤ 1 bd; borrower signature window 5 cd |
| DOCS_CLOSING | PROC | Coordinate closing: loan docs to title/escrow, signing scheduled, PRIOR_TO_FUNDING conditions cleared (final title commitment + endorsements, insurance binder w/ paid receipt, entity good standing, draw schedule §5.2, payoff/HUD review), closing statement approval, wire authorization. | Auto-generate doc package from doc-prep template engine (attorney review only for `loan_amount > 2000000` or non-standard structure); CD/settlement statement diff vs approved terms with variance flags (> $500 or > 0.125% rate = block); **OFAC re-scan ≤ 24h pre-wire**; wire instructions verified via out-of-band callback task (fraud control, PROC); funding checklist gates the wire button. | All PRIOR_TO_FUNDING conditions cleared; signed docs received back; `funding_authorized_by` = UW (plus PRIN if §4.2 tier 3); wire released. | 3–4 cd (docs out ≤ 1 bd after APPROVED; sign + fund 2–3 cd) |
| FUNDED | CM | Confirm wire settlement; assign capital source (balance sheet vs participation); deliver post-close package to investor surface; hand off to servicing. | Wire confirmation ingested; recording tracking opened with title (deed of trust `recorded_at` tickler, 30 cd); servicing record auto-created (payment schedule, interest reserve ledger, draw ledger from §5.2 schedule); borrower welcome email + servicing portal invite + mandatory ACH autopay setup; broker/referrer fee payable created. | `funded_at` stamped; capital source assigned; servicing record live; post-close package published. | 2 bd |
| SERVICING | PROC | Administer draws (§5.3), monthly interest billing, tax/insurance tracking, project monitoring, extension processing (§5.4), payoff requests. | Interest billed monthly (drawn from `interest_reserve_balance` first, then ACH); insurance/tax expiry ticklers (T-30); maturity ticklers T-90/T-60/T-30/T-15 to borrower + LO; **stall detector**: no draw request in 60 cd on a rehab/construction loan → LO check-in task; payment failure → dunning sequence + PROC task at day 5. | Loan reaches payoff (→ PAID_OFF) or default workout (out of scope for this module; flag `servicing_status = DEFAULT_WORKOUT`). | Payoff statement ≤ 2 bd from request; draw SLAs per §5.3 |
| PAID_OFF | PROC | Verify payoff funds; reconcile ledger (per-diem interest, unused interest reserve, retained holdback, deposits); release lien. | Auto-generate payoff statement with per-diem; on funds receipt, auto-reconcile; release/reconveyance task with 30 cd statutory tickler; CM notified for investor capital return; NPS survey + repeat-borrower drip enrolled; `lifetime_deal_count` incremented on borrower record. | Lien release recorded; ledger zeroed; refunds issued. | Reconcile ≤ 3 bd; release recorded ≤ 30 cd |

**Terminal stages.** Any stage can transition to DEAD (non-credit, reason code required, §6.1) — owner is whoever holds the stage. DECLINED is only enterable from TERM_SHEET onward (a credit decision was made) and is owned by UW, with adverse-action handling per §6.2. Both terminals require `reason_code` + free-text `reason_detail`; SYS blocks the transition without them.

### 1.1 Document gates by stage

| Gate (must be ACCEPTED to exit stage) | Stage | Documents (Module 06 §1 registry `doc_code`s; lowercase backticked items are vendor/closing work products tracked on the deal, not borrower doc requests) |
|---|---|---|
| GATE_APP_COMPLETE | APPLICATION | PURCHASE_CONTRACT (or settlement statement if owned), REHAB_BUDGET (FF/GUC; Lendrock template mandatory), PLANS_PERMITS (GUC), TRACK_RECORD (Lendrock template: address, buy/sell price, dates), BANK_STMT_BIZ (2 months) or bank-link, GOV_ID (all guarantors), ENT_ARTICLES + ENT_OPERATING_AGMT + ENT_EIN_LETTER or `entity_formation_pending` flag, signed CREDIT_AUTH, ENT_W9 |
| GATE_UW_PACKAGE | UNDERWRITING | APPRAISAL (per §3.2 valuation matrix), TITLE_COMMITMENT (prelim), `feasibility_review` (when triggered), `background_report`, `liquidity_verification`, ENT_GOOD_STANDING (≤ 90 days), ENT_RESOLUTION (SYS-generated), PAYOFF_DEMAND (refi only), LEASES_RENT_ROLL (BTP tenanted only), CONTRACTOR_AGMT + `gc_license` + `gc_insurance_certs` (GUC) |
| GATE_CLEAR_TO_CLOSE | DOCS_CLOSING | TITLE_COMMITMENT (final) + required endorsements (§3.3), INS_PROPERTY binder + `premium_paid_receipt` (§3.4), FLOOD_CERT (+ INS_FLOOD policy if zone A/V), `closing_protection_letter`, `signed_loan_docs`, `draw_schedule_signed` (FF w/ holdback, GUC), `settlement_statement_approved` |

---

## 2. Parallel workstreams and the 10–14 day clock

All four diligence tracks launch simultaneously on UNDERWRITING entry (deposit cleared). None may serialize behind another; the UW credit memo consumes them as they land. `critical_path_item` is auto-computed daily (the unreturned item with the longest remaining vendor SLA) and shown on the deal header.

| Track | Task owner | Ordered by | Vendor SLA | Portal status field |
|---|---|---|---|---|
| Title + escrow | PROC | SYS auto-order on stage entry | Prelim 3 bd; final commitment 2 bd after doc request | `title_order_status`: ORDERED → PRELIM_RECEIVED → EXCEPTIONS_UNDER_REVIEW → CLEARED → COMMITMENT_FINAL |
| Valuation | PROC | SYS auto-order per §3.2 matrix | AVM/desktop 1 bd; ext-BPO 3 bd; hybrid 5 bd; full 7 bd | `valuation_status`: ORDERED → INSPECTION_SCHEDULED → REPORT_RECEIVED → UW_ACCEPTED / UW_DISPUTED |
| Insurance | PROC (borrower's agent performs) | SYS request letter on stage entry | Binder 3–5 bd | `insurance_status`: REQUESTED → QUOTE_RECEIVED → BINDER_RECEIVED → VERIFIED |
| Entity + background | PROC | SYS auto-order on stage entry | Background 2 bd; SoS good-standing check instant (API) | `entity_review_status`: PENDING → DOCS_COMPLETE → ACCEPTED; `background_status`: ORDERED → RECEIVED → CLEARED / FLAGGED |

**Reference timeline (FF, clean file):** Day 0 application complete → Day 1 term sheet out → Day 2–3 signed + deposit → Day 3 all orders fire → Day 4 AVM/desktop back → Day 6 prelim title (3 bd vendor SLA) + BPO/hybrid + background back → Day 7–8 UW memo + approval + PRIN sign-off → Day 9 docs out → Day 11–12 signing → Day 12–14 fund. GUC and any full-appraisal deal (> $1.5M, 5+ units, mixed-use) use the 14-day edge of the band (full appraisal + feasibility).

---

## 3. Underwriting specifics

### 3.1 Credit-box guardrails by product

Values are **maximums/minimums enforced by the pre-screen and re-checked at UNDERWRITING** with final figures. "Cost" = purchase price + closing costs + approved budget. For property owned < 6 months, `as_is_value` for leverage = lesser of appraised value or documented cost basis.

| Guardrail (field) | HM_FF | HM_BTP | HM_GUC |
|---|---|---|---|
| `max_ltv_as_is_pct` (initial advance / as-is value) | 80% | 70% | 60% (land, entitled) / 50% (unentitled → exception only) |
| `max_ltarv_pct` (total loan / ARV or as-completed value) | 70% | 70% of as-stabilized | 65% |
| `max_ltc_pct` (total loan / total cost) | 85% | 80% | 85% |
| `min_experience` (verified exits, 36 mo — §3.5) | 1 | 1 (or 24 mo ownership of 2+ investment properties) | 3 ground-up completions, or 5 heavy-rehab exits + licensed GC of record |
| `min_fico_mid` (lowest mid-score among guarantors) | 660 | 680 | 680 |
| `min_liquidity_verified` | 10% of `rehab_budget_total` + 6 mo interest | 9 mo debt service | 10% of `construction_budget_total` + 6 mo interest |
| `min_loan_amount` / `max_loan_amount` | $100k / $3M | $150k / $5M | $250k / $5M |
| `max_term_months` (initial) | 12 | 18 | 18 |
| `interest_reserve_months` (default, financed) | 6 | 6 | 9 |
| `min_contingency_pct` of budget | 5% (10% if structural) | n/a | 10% |

Hard stops (never exceptionable): confirmed OFAC match; fraud/misrepresentation; `fico_mid < 620`; `ltarv > 75%`; owner-occupied/consumer purpose; active bankruptcy of any guarantor; property outside lending footprint.

### 3.2 Property valuation path (by total loan amount)

UW may always upgrade one level; never downgrade. Two AVM sources are pulled at NEW_LEAD/QUALIFIED for sizing but never satisfy the gate alone above $250k.

| Loan amount | Required valuation product | Escalation trigger |
|---|---|---|
| ≤ $250k | Dual AVM + licensed-appraiser desktop review + borrower interior photo set (timestamp/geotag verified) | AVM confidence < 0.80 or inter-AVM variance > 10% → exterior BPO |
| $250k–$750k | Exterior BPO + AVM cross-check | BPO vs AVM variance > 15% → hybrid appraisal |
| $750k–$1.5M | Hybrid appraisal (third-party interior inspection + desktop appraiser) with as-is + ARV | Complex/rural/unique → full appraisal |
| > $1.5M, or any HM_GUC, or 5+ units, or mixed-use | Full appraisal (1004/1025/commercial narrative) with as-is, as-repaired/as-completed, and (GUC) land value | — |
| > $3M | Above **plus** appraisal review (CDA) or second full BPO; UW uses lower concluded value | — |

Concluded values stored as `as_is_value_concluded`, `arv_concluded`; leverage ratios recompute automatically and re-run the guardrail check — a breach reopens the exception flow (§4.3), it does not silently pass.

### 3.3 Title and escrow

- SYS orders title prelim + opens escrow at UNDERWRITING entry via the vendor's API (fallback: templated email order). Preferred national vendor configured per state in `title_vendor_routing`.
- Lender's ALTA loan policy = `loan_amount_total`. Required endorsements: ALTA 8.1 (environmental lien), ALTA 9 (comprehensive), ALTA 22 (location). HM_GUC and FF with holdback add ALTA 32.2 + 33 (construction loan / disbursement down-date, re-issued per draw).
- PROC clears exceptions; standard-acceptable list (current taxes not yet due, utility easements) auto-clears via SYS rules. Non-standard exceptions (liens, judgments, lis pendens, encroachments) create UW review tasks. Uncurable defect → DECL_TITLE_UNCURABLE.
- Closing protection letter (CPL) required in every file; wire only to escrow account verified by out-of-band callback logged as `wire_verification_task` (two-person: PROC verifies, UW releases).

### 3.4 Insurance requirements

| Scenario | Required coverage |
|---|---|
| FF light rehab (`rehab_budget_total` < 25% of as-is and non-structural), BTP | Special-form hazard (commercial property/DP-3 equivalent), replacement cost, coverage ≥ greater of `loan_amount_total` or full RCV; vacancy endorsement if vacant; 12-month term with paid receipt |
| FF heavy rehab (≥ 25% or structural), all HM_GUC | Builder's risk / course-of-construction, completed-value form, coverage ≥ as-completed RCV; soft-cost coverage; CGL $1M/$2M naming Lendrock additional insured; GC workers' comp cert (GUC) |
| BTP tenanted | Landlord/DP-3 + loss of rents ≥ 6 months |
| Flood zone A/V (SYS flood determination on every file) | Flood policy ≥ lesser of `loan_amount_total` or available NFIP max; private flood acceptable |

Mortgagee clause exactly: "Lendrock Capital LLC, ISAOA/ATIMA" + servicing address. SYS parses binder (carrier, coverage, effective dates, mortgagee) and blocks GATE_CLEAR_TO_CLOSE on mismatch. Deductible > $10k → UW review task.

### 3.5 Borrower track-record scoring

`track_record_score` (0–100), computed by SYS from the verified track-record schedule (verification = settlement statement/HUD + deed for each claimed exit; unverifiable rows score zero):

| Component | Points |
|---|---|
| `exits_verified_36mo`: 0 / 1–2 / 3–5 / 6+ | 0 / 15 / 30 / 40 |
| ≥ 2 exits in subject MSA | +15 |
| Average realized gross margin ≥ 15% / 5–15% | +15 / +8 |
| Licensed GC or in-house crew (GUC-relevant) | +10 |
| Rental portfolio ≥ 5 units (BTP-relevant) | +10 |
| Foreclosure/deed-in-lieu (7 yr) on any guarantor | −25 |
| Documented abandoned/unfinished project | −20 |

Tiers: `T1 ≥ 70` (full guardrail leverage), `T2 40–69` (max LTC −5 pts), `T3 < 40` (max LTC −10 pts **and** PRIN sign-off regardless of size). Tier stored as `borrower_experience_tier`, shown on term sheet pricing.

### 3.6 Credit, background, OFAC

- **Credit:** soft tri-merge at APPLICATION on every guarantor (no hard pull ever — business purpose, soft is sufficient and protects borrower). Governing score `fico_mid_low_guarantor` = lowest middle score across guarantors. Re-pull if the report is > 120 days old at funding (shared credit-report freshness rule — Module 06 §1.2, Module 09 §9.2.3).
- **Background (all guarantors + ≥20% owners):** national criminal, sex-offender registry, global watchlists, 7-yr civil judgments/liens/BK, foreclosure history. Auto-clear if empty. FLAGGED routes to UW: financial-crime felony (10 yr) = hard stop; other felony < 7 yr, BK discharged < 2 yr, open judgments > $25k = exception path (§4.3).
- **OFAC:** SDN + consolidated non-SDN scan on entity, guarantors, ≥20% owners at APPLICATION; **mandatory re-scan ≤ 24 h before wire** (SYS blocks wire button otherwise). Potential match → PROC false-positive worksheet; confirmed match → hard stop + DECL_OFAC_MATCH.

### 3.7 Entity document review

Checklist (PROC reviews, UW accepts): `certificate_of_formation`, `operating_agreement` (or bylaws + share ledger for corps), `ein_letter`, `good_standing_certificate` ≤ 90 days old (state of formation **and** foreign qualification in property state if different), SYS-generated `borrowing_resolution` e-signed by all members, `org_chart` drilling layered entities to natural persons (every ≥20% indirect owner becomes a scanned party and required guarantor unless PRIN exception), `w9`. SYS checks Secretary of State status via API and flags signer-vs-authorized-member mismatches. Entity-to-be-formed allowed through UNDERWRITING; formation docs are a PRIOR_TO_FUNDING condition.

---

## 4. Decision points

### 4.1 Automated credit-box pre-screen (TERM_SHEET)

Runs on `application_complete_at` against stated + pulled data (soft credit, AVM, stated liquidity pending verification). Output `prescreen_result`:

- **PASS** — all §3.1 guardrails met → term sheet auto-drafted for LO release (LO may tighten, never loosen, without exception).
- **PASS_WITH_EXCEPTIONS** — ≤ 2 guardrail breaches, none a hard stop → term sheet drafted flagged "subject to exception approval"; exception request (§4.3) auto-opened; LO may send TS before exception decision but the TS states the condition.
- **FAIL** — any hard stop, or > 2 breaches → TS issuance blocked; LO must move to DECLINED (with reason codes) or correct data. Pre-screen failures after a credit review are DECLINED, not DEAD.

Every run stores an immutable `prescreen_snapshot` (inputs, rule results, version of rule set) for audit.

### 4.2 Approval sign-off matrix (APPROVED)

| Tier | Condition (any) | Required signatures |
|---|---|---|
| 1 | `loan_amount_total ≤ 500000` and zero exceptions and tier T1/T2 | UW |
| 2 | $500k–$2M, or exactly 1 approved exception, or tier T3 | UW + PRIN countersign (e-sign, SLA 1 bd) |
| 3 | > $2M, or ≥ 2 exceptions, or HM_GUC > $1M | Deal committee: UW memo + 30-min sync (UW, PRIN, CM); PRIN final authority; minutes logged as `committee_note` |

Declines never require PRIN. PRIN unavailability: no delegation of **credit** authority — tier-2/3 countersigns, exception decisions, and condition waivers wait (by design; PRIN is final credit authority). Non-credit PRIN approvals (complaint responses, purge manifests, distribution co-approval, template publishing) pre-delegate to UW per the Module 00 role coverage map, with delegated-decision audit logging and a PRIN out-of-office mode that surfaces pending-approval queue age on the Monday digest.

### 4.3 Exception handling

One flow for all guardrail breaches, at any stage: SYS or UW opens `exception_request` with `guardrail_field`, `guardrail_value`, `requested_value`, `compensating_factors` (structured multi-select: extra liquidity, lower leverage elsewhere, T1 track record, additional collateral, additional guarantor, rate/fee premium, prior Lendrock payoff history — plus free text), `requested_by`. **PRIN is the sole exception authority**; decision SLA 1 bd; statuses PENDING → APPROVED / DENIED (with note). Max 2 open exceptions per deal — a third auto-suggests DECLINED. Approved exceptions print on the credit memo and commitment letter and feed the quarterly exceptions register (reporting module).

---

## 5. Rehab / construction draw system

### 5.1 Budget review (at UNDERWRITING)

Scope of work must be on the Lendrock SOW template (line items with `cost_code`, description, amount, milestone). SYS validation flags: cost/sqft outside market band (per-MSA reference table `rehab_cost_bands`), contingency below §3.1 minimum, any single line > 30% of budget, permit-required work (structural, additions, GUC always) without permit plan/status. Third-party **feasibility review** mandatory when `rehab_budget_total > 100000` or `hm_product = HM_GUC` (validates budget adequacy, timeline, plans/permits; SLA 3 bd). UW accepts the budget as `approved_budget` — the immutable baseline for all draws.

### 5.2 Draw schedule (created at DOCS_CLOSING)

PROC generates from `approved_budget`: FF default = milestone-based, max 6 draws, `min_draw_amount = 15000` (final draw exempt); GUC default = monthly draws against percent-complete, 10% retainage on GC contract released at certificate of occupancy. `rehab_holdback_amount` = budget financed portion; never disbursed at closing. Per-draw inspection fee ($250 default, config `draw_inspection_fee`) charged to borrower against the draw. Borrower e-signs the schedule (GATE_CLEAR_TO_CLOSE item `draw_schedule_signed`).

### 5.3 Post-funding draw workflow (SERVICING)

Statuses on `draw_request` (canonical `DrawRequest` enum, Module 09 §9.2.4): SUBMITTED → INSPECTION_ORDERED → INSPECTION_RECEIVED → UW_REVIEW → APPROVED / PARTIALLY_APPROVED / REJECTED → DISBURSED.

| Step | Owner | Action | SLA |
|---|---|---|---|
| 1. Request | Borrower (portal) | Select line items, amount, upload photos + invoices + conditional lien waivers (required for GC/sub payments > $10k) | — |
| 2. Acknowledge + order inspection | SYS | Validate against remaining budget per line; auto-order third-party progress inspection | Same business day (order ≤ 4 business hrs) |
| 3. Inspection | Vendor | Percent-complete by line item, photos | 3 bd |
| 4. Reconcile + approve | PROC (≤ $25k and inspection supports 100% of request) else UW | Compare request vs inspected percent-complete; approve funded-on-completed basis; partial-approve mismatches with itemized note to borrower | 1 bd |
| 5. Wire + downdate | PROC | Wire to borrower entity account on file (verified at closing; changes require new callback verification); order ALTA 33 down-date endorsement (GUC/large FF) | Next bd after approval; wire cutoff 2:00 pm ET |

End-to-end target: **≤ 5 bd request-to-wire** (dashboard metric `draw_turn_days`). Overfunding guard: cumulative disbursed per line ≤ inspected percent-complete × line budget; contingency reallocation per §5.5.

### 5.4 Extensions

SYS maturity ticklers at T-90/T-60/T-30/T-15 (borrower + LO; cadence = `SEQ_MATURITY_NOTICE`, Module 08). Borrower requests via portal by T-30. Standard terms: 3-month increments, max 2 extensions; fee 1.0% of unpaid principal (first), 1.5% (second); auto-conditions checked by SYS: payments current, no uncured default, taxes/insurance current, interest reserve replenished to 3 months, updated valuation if last report > 12 months old (path per §3.2 at current balance). Approval: UW for first extension, PRIN for second. Docs: SYS-generated modification agreement, e-signed; fee collected before effective date. Past T-0 with no approved extension → `servicing_status = MATURITY_DEFAULT` and workout flag.

### 5.5 Modifications

- **Budget reallocation** between existing line items: ≤ 10% of total budget and contingency stays ≥ 5% → PROC approves in portal; larger → UW. New scope lines or ARV-affecting changes → UW + valuation re-review.
- **Economic modifications** (rate, term beyond extension policy, principal increase): treated as new credit action — re-run pre-screen, PRIN approval regardless of size, new commitment addendum.
- All modifications version the deal terms (`terms_version` increments; prior versions immutable).

---

## 6. DEAD / DECLINED taxonomy (HM)

### 6.1 DEAD (non-credit; any stage; stage owner sets)

| Code | Meaning |
|---|---|
| DEAD_UNRESPONSIVE | Module 01 §7.1 nurture/auto-DEAD clocks exhausted, no contact |
| DEAD_WITHDRAWN | Borrower withdrew / changed plans |
| DEAD_LOST_RATE | Lost to competitor on pricing |
| DEAD_LOST_LEVERAGE | Lost to competitor on proceeds/structure |
| DEAD_LOST_SPEED | Lost to competitor on close timeline |
| DEAD_PROPERTY_LOST | Purchase contract cancelled / lost the deal |
| DEAD_TIMING | Real deal, not ready — SYS auto-enrolls 90-day re-engagement drip |
| DEAD_DEPOSIT_UNPAID | TS signed but deposit never cleared (auto after 10 cd) |
| DEAD_DOCS_STALLED | Application abandoned > 21 cd despite nudges (SYS auto-suggest) |
| DEAD_DUPLICATE | Duplicate of existing deal (SYS merge) |
| DEAD_OUT_OF_MARKET | Outside geographic footprint |
| DEAD_DEAL_TYPE_MISMATCH | Belongs in BB/WC/SBA — SYS clones lead to correct pathway before closing (single cross-pathway code, Module 09 §9.2.2) |
| DEAD_BROKER_PULLED | Referring broker moved the file |

All codes are extension rows of the shared DeadReason taxonomy (Module 09 §9.2.2), each mapped to one `core_code` (e.g. DEAD_LOST_RATE/DEAD_LOST_LEVERAGE/DEAD_LOST_SPEED → DEAD_LOST_COMPETITOR).

### 6.2 DECLINED (credit decision; TERM_SHEET onward; UW sets; multiple codes allowed, first = principal reason)

Valuation/leverage: DECL_VALUATION_SHORT, DECL_LTV_CAP, DECL_LTC_CAP, DECL_LTARV_CAP. Borrower: DECL_FICO_MIN, DECL_EXPERIENCE_MIN, DECL_LIQUIDITY_MIN, DECL_TRACK_RECORD_ADVERSE, DECL_BACKGROUND_CRIMINAL, DECL_BACKGROUND_FINANCIAL, DECL_OFAC_MATCH, DECL_FRAUD_MISREP. Collateral/deal: DECL_TITLE_UNCURABLE, DECL_PROPERTY_TYPE_INELIGIBLE, DECL_PROPERTY_CONDITION, DECL_BUDGET_INFEASIBLE, DECL_EXIT_WEAK, DECL_MARKET_RISK, DECL_ENTITY_STRUCTURE, DECL_INSURANCE_UNAVAILABLE, DECL_OCCUPANCY_CONSUMER.

**Adverse action (Reg B applies to business-purpose credit):** SYS generates the adverse-action notice from the reason codes within 24 h of DECLINED; PROC reviews and sends within 5 bd (regulatory outer bound 30 days); `aan_sent_at` stamped. For applicants ≤ $1M gross revenue the notice includes the right to request specific reasons within 60 days; SYS retains the full decision snapshot (pre-screen, memo, codes) for 5 years per the shared retention schedule (Module 10 §10.5.4; exceeds the Reg B floor). DECL_FRAUD_MISREP and DECL_OFAC_MATCH additionally flag the borrower record `do_not_lend = true`.

---

## Interfaces with other modules

- **Leads/Intake module:** consumes lead records into NEW_LEAD; DEAD_DEAL_TYPE_MISMATCH clones deals to BB/WC/SBA pathways; DEAD_TIMING and PAID_OFF push borrowers into re-engagement/repeat-borrower campaigns.
- **BB/WC/SBA workflow modules:** shared canonical stage names, terminal-code pattern, exception-request object, and sign-off matrix schema; cross-sell trigger at PAID_OFF (e.g., WC line offer to proven operators).
- **Borrower portal surface:** application smart forms, doc checklist uploads, e-sign, deposit payment, draw requests (§5.3 step 1), extension requests, payoff requests.
- **Investor portal / Capital Markets module:** capital reservation at APPROVED, capital-source assignment and post-close package at FUNDED, draw-funding notices, capital return at PAID_OFF.
- **Servicing/payments module:** payment schedules, interest-reserve ledger, ACH billing, dunning; this module owns HM-specific draw and extension logic on top of it.
- **Compliance/reporting module:** adverse-action notices and retention, OFAC scan logs, exceptions register, `prescreen_snapshot` audit trail, SLA dashboards (`draw_turn_days`, app-to-fund days).
- **Vendor integrations layer:** title API, valuation panel (AVM/BPO/appraisal), inspection vendor, background/OFAC provider, bank-data (liquidity), flood determination, e-sign, doc-prep engine.
# Module 03 — Deal Workflow: BB (Bridge and Business Loans)

BB is Lendrock's short-term secured/unsecured business-credit pathway, split into two sub-paths that share one pipeline: **BB_CRE** (bridge loans collateralized by commercial real estate — quick-close acquisition, cash-out, note purchase) and **BB_BIZ** (business term loans secured by business assets or underwritten on cash flow). Both run the canonical skeleton; they diverge only in collateral workstream, closing mechanics, and SLA (BB_BIZ targets **7–10 business days** lead-to-fund, BB_CRE targets **14–21 days** because of appraisal and title). The design is throughput-first: everything the borrower can do async happens in the borrower portal, all financial analysis is SYS-computed from Plaid or OCR'd bank statements, and the four underwriting workstreams run in parallel the moment the application is complete. Deal record carries `deal_type = BB` and `bb_sub_path ∈ {BB_CRE, BB_BIZ}`, set at QUALIFIED and immutable after TERM_SHEET (change = clone to new deal).

---

## 1. Sub-path routing

Set `bb_sub_path` at QUALIFIED (decision point DP-1, owner LO, SYS-recommended):

| Signal | Route |
|---|---|
| `collateral_type = CRE` (borrower pledging real property) | `BB_CRE` |
| `collateral_type ∈ {EQUIPMENT, AR, INVENTORY, BLANKET, NONE}` | `BB_BIZ` |
| Use of funds = property acquisition/refi on 1–4 unit fix-and-flip or ground-up | **Reroute to HM** (`DEAD_DEAL_TYPE_MISMATCH` + SYS clone into HM pipeline, docs carry over) |
| Recurring/seasonal working-capital need, wants revolver | **Reroute to WC** |
| Non-urgent (>45 days), rate-sensitive, TIB ≥ 24 mo, wants ≥ 5-yr term | **Offer SBA reroute** (LO task; if accepted, clone to SBA pipeline) |

Product box defaults: `loan_amount` $50,000–$2,500,000 (BB_BIZ cap $750,000 without PRIN exception); `term_months` 3–18 (BB_BIZ) / 6–24 (BB_CRE, interest-only); repayment `WEEKLY_ACH` or `MONTHLY_ACH` for BB_BIZ (default weekly for risk tiers T3–T4, monthly for T1–T2), `MONTHLY_ACH` interest-only for BB_CRE. No daily-debit products — that is the MCA pattern we underwrite *against*, not sell.

---

## 2. Stage flow (canonical skeleton, BB specialization)

Where a cell differs by sub-path it is marked `CRE:` / `BIZ:`. Unmarked cells apply to both.

| Stage | Owner | Required actions | Automations (SYS) | Exit criteria | Target SLA |
|---|---|---|---|---|---|
| NEW_LEAD | LO | Review lead card; first call/text/email attempt (capture, dedupe, scoring, routing, speed-to-lead all owned by Module 01) | BB enrichment: dedupe on `business_ein` + `guarantor_email` + `guarantor_phone`; enrich from SOS API (`entity_status`, `formation_date`); owner assigned per Module 01 §5.1 routing rules | First contact attempt logged (`first_touch_at` set) | First touch ≤ 5 business min (Module 01 §5.2) |
| CONTACTED | LO | Discovery call using BB script: capture `stated_monthly_revenue`, `time_in_business_months`, `use_of_funds_category`, `collateral_type`, `requested_amount`, `urgency_days`, existing debt incl. any MCAs | Call logging + transcription; auto-fill deal fields from call summary; nurture cadence + auto-DEAD clocks owned by Module 01 §7.1 (CONTACTED auto-`DEAD_UNRESPONSIVE` at day 21) | Discovery fields complete; borrower verbally interested | 2 business days |
| QUALIFIED | LO | Confirm credit-box prescreen; run soft credit pull (with consent); set `bb_sub_path` (DP-1); if fail → DECLINED or reroute | Prequal score from stated fields + soft pull; auto-flag guardrail misses; sub-path recommendation; prohibited-industry check vs `prohibited_industry_list` | `prequal_result = PASS`; `bb_sub_path` set | 1 business day |
| APPLICATION | PROC | Send borrower-portal invite with sub-path doc checklist; chase gaps; verify signer identity (KYB/KYC) | Checklist templated by `bb_sub_path`; Plaid link request (fallback: statement upload + OCR parse); e-sign application, credit auth, business-purpose attestation; reminder pings every 48h; OFAC/sanctions screen on entity + all ≥20% owners; SOS good-standing check | `application_complete = true` (all REQUIRED checklist items RECEIVED); Plaid linked or 6 mo statements parsed | 3 business days (borrower-gated) |
| TERM_SHEET | LO | Review SYS-drafted indicative term sheet; adjust within pricing matrix; issue; pricing exceptions → DP-2 (PRIN) | Auto-price from `bb_risk_tier` matrix; generate term sheet PDF; e-sign; expiry auto-set (`term_sheet_expires_at` = issue + 10 calendar days — canonical TS window, reminders day 3/7); CRE: collect `deposit_amount` (default $2,500) via ACH/card payment link (same deposit rail as HM) for appraisal/legal | `term_sheet_signed = true`; CRE: deposit cleared | Issue within 1 business day of app complete |
| UNDERWRITING | UW | Run 4 parallel workstreams (§3); review SYS cash-flow output; write credit memo (SYS pre-drafted); credit decision DP-3 | Cash-flow engine (§4.1); UCC + lien + judgment searches auto-ordered; CRE: appraisal/BPO + title auto-ordered on stage entry; stacked-MCA detector (§7); global DSCR calc; auto-draft credit memo | All 4 workstreams `COMPLETE`; DP-3 signed (UW, + PRIN if required) | BIZ: 2 business days · CRE: 5 business days |
| APPROVED | PROC | Issue commitment letter (final terms; re-sign if changed from term sheet); open conditions list; clear pre-closing conditions; condition waivers → DP-4 (PRIN) | Commitment letter doc-gen; conditions checklist templated (insurance, payoff letters, landlord waiver, entity docs); borrower-portal condition tracker; stale-condition escalation at 48h | All conditions `CLEARED` or `WAIVED` | BIZ: 2 business days · CRE: 3 business days |
| DOCS_CLOSING | PROC | Generate + send closing package; schedule signing (BIZ: e-sign; CRE: notary/escrow); confirm insurance; coordinate payoffs; file UCC-1 | Doc-gen from template library (§8); e-sign orchestration; UCC-1 e-filed on execution, funding blocked until `ucc_filing_ack_received`; CRE: title company + recording tracker; payoff per-diem recalc | All docs executed; `ucc_filing_ack_received = true`; CRE: title clear to fund, recording package confirmed | BIZ: 2 business days · CRE: 4 business days |
| FUNDED | CM | Confirm capital-source allocation; second-person wire release (DP-5); verify receipt; book loan to servicing | Funding memo auto-generated; pre-funding Plaid re-pull must be clean (§7) or wire is blocked; wire instructions verified vs `verified_bank_account` (Plaid auth match — no emailed wire instructions accepted); disbursement splits auto-computed (payoffs direct to creditors, vendor invoices direct to vendor, net to borrower); servicing boarding payload emitted | Wire confirmed; loan boarded; `funded_at` set | Same business day as clear-to-fund |
| SERVICING | PROC | Monitor ACH performance; handle payment issues; monthly portfolio review; renewal outreach | ACH auto-debit per schedule; retry ladder on failed debit (retry day+2, day+4, then task to PROC); Plaid refresh monthly → recompute `avg_daily_balance_90d`, `nsf_count_90d` → early-warning flags; renewal offer auto-generated at 50% principal paid with clean pay history | Loan paid off, refinanced, or defaulted (default → collections sub-flow, out of scope here) | Ongoing |
| PAID_OFF | PROC | Verify payoff funds; release liens | Payoff letter auto-gen with per-diem; UCC-3 termination auto-filed within 10 business days; CRE: mortgage release/satisfaction package to title; payoff confirmation letter to borrower; win-back cadence at +90 days | `ucc_terminated = true`; CRE: release recorded | Lien releases within 10 business days of payoff |
| DEAD | LO | Set `dead_reason_code` (§9); log note | Auto-DEAD rules (no-contact, expired term sheet at +10 days idle, app abandoned 14 days); nurture-list assignment by reason | Terminal | — |
| DECLINED | UW | Set `decline_reason_codes[]` (§9); PRIN confirms; adverse action issued | **Identical to HM — shared decline mechanism**: SYS generates ECOA/Reg B business-credit adverse-action notice, 30-day notification clock, statement-of-reasons handling, 5-year decision-file retention (Module 10 §10.5.4). Do not rebuild; call shared service. | Terminal; notice sent | Notice within 5 business days of decision |

---

## 3. Parallelized underwriting workstreams

All four start automatically on entry to UNDERWRITING (WS-A actually starts at APPLICATION the moment Plaid links). Each has exactly one owner and a status: `NOT_STARTED / IN_PROGRESS / BLOCKED / COMPLETE`. DP-3 cannot fire until all are `COMPLETE`.

| Workstream | Owner | Contents | Start trigger | Typical duration |
|---|---|---|---|---|
| WS-A Financials | SYS (UW reviews) | Plaid pull or statement OCR → cash-flow engine (§4.1); tax return / P&L review only for `loan_amount > 500000` | Plaid link at APPLICATION | Minutes (SYS) + 2h UW review |
| WS-B Credit & background | PROC | Refreshed soft tri-merge pull on all guarantors (consented at APPLICATION; soft-pull-only policy portal-wide — Module 09 §9.5 #4); business credit (Experian Intelliscore); OFAC re-screen; criminal/civil litigation search; SOS good standing all registered states | UNDERWRITING entry | 1 business day |
| WS-C Collateral | PROC | CRE: appraisal (default) or exterior BPO+AVM for `loan_amount ≤ 500000`; title commitment; property insurance quote. BIZ: equipment invoices/serials + LiquidityServices comp valuation; AR aging report; inventory listing; site photos via borrower portal | CRE: TERM_SHEET signed + deposit cleared (starts early — longest pole). BIZ: UNDERWRITING entry | CRE: 4–7 days · BIZ: 1 day |
| WS-D Legal & liens | SYS (PROC triages hits) | UCC-1 search (§4.6); federal/state tax lien + judgment search; bankruptcy search (guarantors + entity); payoff letters for liens to be satisfied (§4.7) | UNDERWRITING entry | 1–2 business days |

---

## 4. Underwriting engine

### 4.1 Bank-statement / cash-flow analysis (SYS-computed)

Source of truth: Plaid transactions (preferred, `bank_data_source = PLAID`) or OCR-parsed PDF statements (`bank_data_source = STATEMENT_OCR`; require 6 complete months, reject screenshots). SYS computes across **all linked operating accounts**, deduplicating intra-company transfers (matched by counterpart account number / mirrored amounts within 2 days — excluded from revenue).

| Field | Definition / computation | Guardrail flag |
|---|---|---|
| `monthly_revenue_avg_3m` | Sum of qualifying deposits per month, mean of last 3 full months. Excludes: intra-account transfers, loan/MCA proceeds (matched to funder list or lump-sum + new-debit pattern), refunds/chargeback reversals, tax refunds | Below credit-box min → hard flag |
| `monthly_revenue_avg_6m` | Same over 6 months | Used for seasonality check |
| `revenue_trend_pct` | (`avg_3m` − prior-3m avg) / prior-3m avg | < −20% → `REVENUE_DECLINING` flag |
| `avg_daily_balance_90d` | Mean of end-of-day balances, 90 days, all accounts | < 1.0× `proposed_monthly_payment` → flag |
| `min_daily_balance_90d` | Lowest EOD balance in window | Context for UW, no auto-flag |
| `nsf_count_90d` / `nsf_count_180d` | Count of NSF/returned-item fee transactions | > 3 in 90d → hard flag |
| `negative_balance_days_90d` | Days with any account EOD < 0 | > 5 → hard flag |
| `existing_monthly_debt_service` | Recurring debits identified by (same counterparty, amount ±10%, ≥ 3 occurrences); daily debits ×21, weekly ×4.33 to monthlyize | Feeds debt-to-revenue and DSCR |
| `mca_funder_count` / `mca_debit_monthly_total` | Debits matched to `known_mca_originators` reference table (ACH descriptor regex list, ops-maintained) | See §7 |
| `deposit_count_monthly_avg` | Qualifying deposit count / month | < 5 → concentration review |
| `largest_deposit_source_pct` | Largest single counterparty share of 3m revenue | > 40% → `CUSTOMER_CONCENTRATION` flag |
| `proposed_payment_coverage` | `avg_daily_balance_90d` / `proposed_monthly_payment` | < 1.0 → hard flag |

All computed fields, flags, and the raw transaction categorization are written to `deal.cash_flow_analysis` (versioned JSON) and rendered as the "Cash Flow" tab of the credit memo. UW can recategorize individual transactions; recompute is instant and version-logged.

### 4.2 Collateral valuation

- **BB_CRE:** full appraisal default; exterior BPO + AVM permitted when `loan_amount ≤ 500000` AND `ltv_as_is ≤ 60%`. Value basis = as-is only (no ARV lending in BB — ARV deals belong in HM). Fields: `appraised_value_as_is`, `valuation_type ∈ {APPRAISAL, BPO_AVM}`, `ltv_as_is = loan_amount / appraised_value_as_is`.
- **BB_BIZ:** collateral valued at forced-liquidation haircuts, SYS-applied: equipment 50% of verified invoice/comp value, AR 70% of < 90-day receivables (aging report required), inventory 40% of cost. `collateral_coverage_ratio = haircut_collateral_value / loan_amount`. Unsecured (blanket-lien-only, no specific collateral) permitted up to $150,000 for tiers T1–T2 only.

### 4.3 Use-of-funds validation

`use_of_funds_category ∈ {WORKING_CAPITAL, INVENTORY, EQUIPMENT_PURCHASE, DEBT_REFINANCE, MCA_CONSOLIDATION, PARTNER_BUYOUT, PROPERTY_ACQUISITION, PROPERTY_REFINANCE, OTHER}` + free-text `use_of_funds_detail` (required). Rules:

- Business-purpose attestation e-signed at APPLICATION on every deal (all Lendrock loans are business-purpose; this is the audit artifact).
- `EQUIPMENT_PURCHASE`: vendor invoice required; funds wire directly to vendor.
- `DEBT_REFINANCE` / `MCA_CONSOLIDATION`: payoff letters required for every creditor being retired; funds wire directly to creditors (controlled disbursement — borrower never touches payoff dollars); SYS recomputes post-close `existing_monthly_debt_service` to prove the consolidation improves cash flow (post-close global DSCR must clear the box, else decline).
- `PARTNER_BUYOUT`: executed purchase agreement + attorney contact required; PRIN sign-off regardless of amount.
- Prohibited: any consumer/household purpose, securities purchase, gambling, cannabis-touching, adult entertainment, weapons dealing, crypto speculation, lending-on-lending (funding another lender's book). Match against `prohibited_industry_list` config table (NAICS-keyed) at QUALIFIED and again at UNDERWRITING.

### 4.4 Global DSCR

- `business_dscr = business_net_cash_flow_monthly / (existing_monthly_debt_service + proposed_monthly_payment)` where `business_net_cash_flow_monthly = monthly_revenue_avg_3m × industry_margin_factor` (config table by NAICS, default 0.15) or actual net from P&L when provided.
- `global_dscr = (business_net_cash_flow_monthly + guarantor_personal_income_monthly − guarantor_personal_debt_service_monthly) / (existing_monthly_debt_service + proposed_monthly_payment)`. Guarantor figures from credit report tradelines + stated income (verified via personal Plaid link only if `global_dscr` is the deciding factor).
- BB_CRE with `business_dscr < 1.00`: permitted only with a funded `interest_reserve_months ≥ 6` withheld from proceeds AND a documented exit (`exit_strategy ∈ {SALE, REFINANCE, RECEIVABLE_EVENT}` with evidence field `exit_evidence_doc_id`).

### 4.5 Personal guaranty

Default: unlimited, joint-and-several PG from **every owner ≥ 20%** (`guaranty_type = FULL_RECOURSE`). BB_CRE deals at `ltv_as_is ≤ 60%` and tier T1 may substitute `guaranty_type = BAD_BOY_CARVEOUT` — PRIN approval required. PG waiver of any kind: PRIN only, logged as exception. Spousal consent collected where state law requires (SYS flags from `guarantor_state`).

### 4.6 UCC-1 lien search and filing

- **Search (SYS, WS-D):** via filing-vendor API (default vendor: CSC; single integration also used by HM for title-adjacent searches). Scope: state of formation SOS + state of chief-executive-office + DE, entity name + all trade names/FKAs from SOS record. Hits auto-classified: `PMSI_EQUIPMENT` (specific-collateral purchase-money — acceptable, no action), `BLANKET` (all-assets — conflict, requires payoff or subordination), `MCA_FUNDER` (matched to `known_mca_originators` — feeds §7), `FACTOR_AR` (conflicts if our collateral includes AR), `STALE` (> 5 yrs, no continuation — PROC confirms lapse). PROC triages anything unclassified within 4 business hours.
- **Position requirement (default policy):** first-position blanket lien on all business assets for every BB_BIZ deal; for BB_CRE, first mortgage/deed of trust + blanket UCC. Second position: PRIN exception only, and only behind a bank facility with executed intercreditor.
- **Filing (SYS):** UCC-1 e-filed automatically upon closing-doc execution (authorization contained in signed security agreement); `funding blocked until ucc_filing_ack_received = true`. Landlord waiver (`landlord_waiver_doc_id`) required when collateral is equipment/inventory at leased premises. Continuation: SYS calendars a UCC-3 continuation task at month 54 for any facility still outstanding (renewal/extension chains). Termination: UCC-3 auto-filed within 10 business days of payoff.

### 4.7 Existing-lien payoff / subordination

- PROC requests payoff letters at APPROVED (condition items, templated request emails); fields: `payoff_amount`, `payoff_good_through_date`, `per_diem`. SYS alerts at good-through − 3 days and recalculates with per-diem if closing slips.
- Payoffs disbursed directly from closing (see controlled disbursement, §4.3). Post-funding, PROC confirms the retired creditor files its UCC-3 / release within 30 days; SYS re-runs UCC search at +35 days and opens a task if the old lien persists.
- Subordination in lieu of payoff: `subordination_agreement` template (bank lines) or intercreditor for larger facilities; PRIN approves any deal funding behind a surviving lien.

---

## 5. Credit-box guardrails

SYS evaluates at QUALIFIED (stated/soft data) and re-evaluates at UNDERWRITING (verified data). Any miss = exception requiring PRIN sign-off at DP-3; two or more misses = auto-recommend DECLINE.

| Guardrail (field) | BB_BIZ | BB_CRE |
|---|---|---|
| `min_monthly_revenue` (`monthly_revenue_avg_3m`) | ≥ $30,000 | ≥ $15,000 (asset-based; sponsor liquidity matters more) |
| `min_time_in_business_months` | ≥ 12 (24 preferred → tier boost) | ≥ 12, or sponsor with ≥ 2 comparable CRE deals |
| `min_fico` (lowest mid-score among guarantors) | ≥ 640 | ≥ 600 |
| `max_debt_to_revenue` ((existing + proposed monthly debt service) / `monthly_revenue_avg_3m`) | ≤ 0.20 | ≤ 0.25 |
| `min_business_dscr` | ≥ 1.20 | ≥ 1.00 (or interest reserve per §4.4) |
| `min_global_dscr` | ≥ 1.15 | ≥ 1.10 |
| Collateral coverage | `collateral_coverage_ratio ≥ 1.25`, or unsecured ≤ $150k at T1–T2 | `ltv_as_is ≤ 70%` (≤ 65% for special-use property) |
| `max_nsf_count_90d` | ≤ 3 | ≤ 3 |
| `max_negative_balance_days_90d` | ≤ 5 | ≤ 5 |
| `mca_funder_count` | ≤ 1 (and being consolidated) | ≤ 1 |
| No open guarantor BK; ≥ 4 yrs since discharge | Yes | Yes |
| No open federal/state tax lien without payment plan + subordination | Yes | Yes |

Risk tier `bb_risk_tier ∈ {T1, T2, T3, T4}` SYS-computed from FICO / DSCR / TIB / NSF composite; drives pricing matrix (defaults: BB_BIZ 14%–24% annualized + 2–4 origination pts; BB_CRE 10.5%–13% IO + 2–3 pts) and repayment frequency. Pricing below tier floor = DP-2 PRIN exception.

---

## 6. Decision points and PRIN thresholds

| DP | Stage | Decision | Authority |
|---|---|---|---|
| DP-1 | QUALIFIED | Prequal pass/fail + `bb_sub_path` routing | LO (SYS-recommended) |
| DP-2 | TERM_SHEET | Pricing/structure exception (below tier floor, above max LTV, term > box) | PRIN |
| DP-3 | UNDERWRITING → APPROVED | Credit decision | UW solo when **all** true: in-box on every guardrail, `loan_amount ≤ 250000`, no stacking flag, no related-party. **PRIN co-sign required** when any: `loan_amount > 250000`; any guardrail exception; `STACKING_SUSPECTED` or worse; PG waiver/carve-out; second lien position; `PARTNER_BUYOUT`; insider/related-party; post-term-sheet terms changed materially (rate +100bps, amount ±15%) |
| DP-4 | APPROVED | Waive a pre-closing condition | PRIN only |
| DP-5 | FUNDED | Wire release dual control | PROC prepares, CM releases (two distinct users enforced by system) |
| DP-6 | Any | Confirm DECLINED + adverse-action reasons | UW recommends, PRIN confirms (shared mechanism with HM) |

Every exception is a structured record: `exception_type`, `guardrail_field`, `actual_value`, `approved_by`, `rationale` — reportable, so the credit box can be tuned quarterly from exception performance.

---

## 7. Stacked-MCA detection (SYS)

Stacking (multiple concurrent merchant cash advances) is the #1 loss driver in this asset class. SYS detects it without human review:

| Signal | Detection logic | Result |
|---|---|---|
| Multiple MCA debit streams | ≥ 2 distinct counterparties matched to `known_mca_originators` (ACH descriptor regex table) with active recurring debits in last 30 days | `mca_funder_count ≥ 2` → `STACKING_SUSPECTED` flag; DP-3 escalates to PRIN |
| Heavy stacking | ≥ 3 active MCA debit streams | `STACKING_CONFIRMED` → auto-recommend DECLINE (`DECL_STACKED_MCA`) unless deal is a full consolidation retiring **all** positions with post-close DSCR in-box |
| Daily-debit cadence | Recurring debit, same amount, ≥ 5×/week (weekend-adjusted), counterparty NOT in funder table | Treated as unidentified MCA; PROC task to identify; counts toward `mca_funder_count` until cleared |
| Fresh advance | Lump-sum credit ≥ $15,000 followed within 5 business days by a new recurring daily/weekly debit | `RECENT_ADVANCE` flag — borrower took money after applying with us; PRIN required |
| Hidden debt | `declared_debt_variance_pct` = (detected `existing_monthly_debt_service` − declared debt schedule) / declared > 25% | `DEBT_MISREP` flag; UW confronts borrower with reconciliation task; unresolved → `DECL_UNVERIFIABLE_INFO` or `DECL_FRAUD_MISREP` |
| Pre-funding re-check | SYS re-pulls Plaid transactions 24h before wire release (DP-5); any new MCA debit stream, `RECENT_ADVANCE`, or NSF since decision | Wire blocked; deal auto-returns to UNDERWRITING for UW re-clear |
| UCC evidence | WS-D search returns ≥ 2 `MCA_FUNDER`-classified blanket filings | Corroborates; raises `STACKING_SUSPECTED` → `STACKING_CONFIRMED` |
| Debt-service drain | `mca_debit_monthly_total / monthly_revenue_avg_3m > 0.25` | Hard flag; consolidation-only path |
| Post-funding stacking | Monthly Plaid refresh in SERVICING detects new MCA debit stream | Covenant-breach alert to PROC + UW; anti-stacking covenant in loan agreement triggers default-rate election |

`known_mca_originators` is an ops-editable reference table (name, ACH descriptor regexes, UCC secured-party aliases); PROC adds new funders as encountered — every unidentified-debit resolution feeds the table.

---

## 8. Closing package (doc-gen templates)

BB_BIZ: business loan agreement, promissory note, security agreement (blanket), personal guaranty (per guarantor), ACH authorization, business-purpose certificate, disbursement authorization, insurance requirement acknowledgment; e-sign end-to-end, no notary. BB_CRE adds: mortgage/deed of trust (state-specific templates), assignment of leases and rents, title policy (lender's), property/flood insurance with mortgagee clause, notarized signing + county recording via title company. All templates versioned in the shared doc-gen service (same engine as HM closing docs).

---

## 9. DEAD / DECLINED reason codes (BB)

Mechanics (reason-code capture, auto-DEAD rules, nurture assignment, adverse-action generation, retention) are **identical to HM — use the shared terminal-stage service.** Only the BB code list differs.

**DEAD** (non-credit exits; no adverse action): `DEAD_UNRESPONSIVE` (pre-app; Module 01 clocks), `DEAD_UNRESPONSIVE_IN_PROCESS`, `DEAD_BORROWER_WITHDREW`, `DEAD_LOST_TO_COMPETITOR` (capture `competitor_name`, `losing_terms` when known), `DEAD_RATE_SHOPPER`, `DEAD_TERM_SHEET_EXPIRED`, `DEAD_APP_ABANDONED`, `DEAD_DEAL_TYPE_MISMATCH` (with `rerouted_to ∈ {HM, WC, SBA}` and clone link), `DEAD_DUPLICATE`, `DEAD_OUT_OF_FOOTPRINT`. All extension rows of the shared DeadReason taxonomy (Module 09 §9.2.2), each mapped to one `core_code` (`DEAD_RATE_SHOPPER` → `DEAD_TERMS_REJECTED`, `DEAD_OUT_OF_FOOTPRINT` → `DEAD_OUT_OF_MARKET`).

**DECLINED** (credit decisions; adverse action fires): `DECL_INSUFFICIENT_REVENUE`, `DECL_TIME_IN_BUSINESS`, `DECL_FICO`, `DECL_EXCESSIVE_DEBT_BURDEN`, `DECL_DSCR`, `DECL_STACKED_MCA`, `DECL_NSF_HISTORY`, `DECL_COLLATERAL_INSUFFICIENT`, `DECL_LIEN_POSITION_UNAVAILABLE`, `DECL_USE_OF_FUNDS_INELIGIBLE`, `DECL_INDUSTRY_PROHIBITED`, `DECL_TAX_LIEN_JUDGMENT`, `DECL_BANKRUPTCY_HISTORY`, `DECL_UNVERIFIABLE_INFO`, `DECL_FRAUD_MISREP` (also writes to shared internal fraud list checked at NEW_LEAD dedupe). Multi-select `decline_reason_codes[]`, primary reason first; each code maps to approved adverse-action notice language in the shared mapping table.

---

## Interfaces with other modules

- **Lead Intake & Routing:** receives deals with `deal_type = BB`; BB emits reroutes (HM/WC/SBA clones) back through routing.
- **HM workflow:** shared terminal-stage/decline + adverse-action service; shared doc-gen engine; shared appraisal/title vendor integrations reused by BB_CRE; shared internal fraud list.
- **WC workflow:** reroute target for revolver-shaped needs; BB_BIZ renewal offers may convert to WC lines.
- **SBA workflow:** reroute target for rate-sensitive, non-urgent borrowers; BB decline with near-miss profile triggers SBA cross-offer task for LO.
- **Borrower portal:** application checklist, Plaid consent, e-sign, condition tracker, payoff requests.
- **Investor/CM module:** capital-source allocation at APPROVED, funding memo, wire dual-control at FUNDED.
- **Servicing module:** boarding payload at FUNDED (`payment_schedule`, ACH mandate, covenant set incl. anti-stacking monitor); monthly Plaid refresh flags flow back as covenant alerts.
- **Compliance/audit:** adverse-action archive, OFAC screening log, exception register, 5-year decision-file retention (Module 10 §10.5.4).
- **Notifications/task engine:** all SLAs, reminder cadences, and escalations above are its configuration entries.
# Module 04 — Deal Workflow: WC (Working Capital Lines of Credit)

WC is Lendrock's only revolving product: a 12-month, annually renewable, business-purpose line of credit sized off verified bank cash flow (Plaid-first), activated in **3–7 business days**, and then run almost entirely by SYS. Unlike HM/BB/SBA, origination is the short part of the deal; the economics and the risk live in the **ongoing lifecycle** — portal-initiated draws with rule-based auto-approval, same/next-day ACH disbursement over Dwolla, automated interest billing, monthly bank-feed covenant sweeps, and an auto-assembled annual renewal. For WC, `FUNDED` means **line activation** (no money moves at close; `funded_amount = 0` is expected and valid). Design target: a healthy Tier-A line runs a full year with zero human touches — draws auto-approve, interest auto-debits, covenants auto-check, and the renewal packet lands in the UW queue as a 15-minute review.

---

## 1. Origination pipeline (application → activation)

Canonical skeleton, WC display labels in parentheses. The cash-flow analysis runs as SYS scoring inside `APPLICATION`/`TERM_SHEET` (the limit *is* the term sheet); `UNDERWRITING` is the human confirmation-and-limit-setting pass.

| Stage | Owner | Required actions | Automations (SYS) | Exit criteria | Target SLA |
|---|---|---|---|---|---|
| `NEW_LEAD` → `QUALIFIED` | LO | Owned by Lead Intake module. LO confirms `deal_type = WC`, business purpose, stated revenue vs credit-box floor, MCA-stacking question (mandatory script item); sets `requested_limit` | Dedupe on `business_ein` + `guarantor_email`; SYS pre-screen against guardrails (§8): hard-fail → `DECLINED` with reason code (UW confirms), soft-fail → UW override request | Pre-screen `PASS` or UW override granted; deal created with `pathway = WC` | Per Intake module; pre-screen same day |
| `APPLICATION` | PROC | Send portal application; chase completeness. Borrower completes: business info, ownership (all ≥ 20% owners), guarantor PG consent, **Plaid bank link** (primary operating account + any account receiving > 20% of deposits, 12 mo history) or fallback upload of 6 mo statements | Plaid Link (Transactions + Auth + Identity + Balance); statement fallback → Ocrolus parse to same transaction schema (`bank_data_source = STATEMENTS`); Middesk KYB (SOS status, TIN match, watchlists, **UCC/lien search**); Persona KYC on guarantors; OFAC screen; guarantor soft pull (Experian); SYS computes metrics pack (§2.2) within 15 min of bank data landing; auto-nudge at 24/48/72h | `application_complete = true`: ≥ 6 mo bank data ingested, KYB/KYC/OFAC clear or dispositioned, soft pull done, metrics computed | 2 business days (borrower-paced) |
| `TERM_SHEET` | LO | Review SYS-proposed terms; may reduce limit, never increase above `proposed_limit` without UW; send with one click | SYS generates term sheet from template `TS_WC` (Module 08 registry): `committed_limit`, tier pricing (§2.4), draw fee, 12-mo revolving term, monthly interest-only, PG + blanket UCC-1 required; Dropbox Sign envelope; expires 10 calendar days, reminders day 3/7 | Term sheet e-signed (`term_sheet_signed_at`) | Issue ≤ 1 business day; borrower signature ≤ 10 days |
| `UNDERWRITING` (Cash-Flow Underwrite & Limit Setting) | UW | Substage `CASHFLOW_ANALYSIS`: verify SYS transaction classification, hunt undisclosed MCA/stacking, review anomalies. Substage `LIMIT_SETTING`: confirm/override `risk_tier` and formula limit, set covenant profile, choose standard vs borrowing-base structure (§3); sign credit memo | Refreshed guarantor soft pull + business credit (Experian Intelliscore; soft-pull-only policy portal-wide — Module 09 §9.5 #4); bankruptcy/judgment/tax-lien search auto-ordered; fraud checks (Plaid Identity name-match ≥ 0.85, statement-tamper detection on uploads); anomaly flags: round-number deposits, same-day in/out transfers, single counterparty > 20% of deposits, MCA-signature debits; SYS pre-drafts credit memo with formula output and guardrail checklist | `uw_decision ∈ {APPROVE, APPROVE_WITH_CONDITIONS, DECLINE}` with final `committed_limit`, `risk_tier`, `structure_type` | 1 business day |
| `APPROVED` | UW | UW owns the decision and the stage exit (matching HM/BB, Modules 02–03). Authority matrix: UW solo ≤ **$150,000** standard structure; PRIN co-sign required > $150k, any guardrail exception, or borrowing-base structure. PROC then clears conditions | Conditions checklist with per-condition doc slots; auto-clear conditions satisfiable from data (e.g., lien termination confirmed by refreshed Middesk pull); decline → `DECLINED` + adverse-action flow | `approved_at` set, all conditions `CLEARED`; or terminal `DECLINED` | 0.5 business day approval; 1 business day conditions |
| `DOCS_CLOSING` (LOC Agreement) | PROC | QC executed docs; verify `disbursement_account` = Plaid-verified account; resolve signer issues; countersign | SYS assembles package from templates: LOC agreement `LOC_AGMT` (Module 08 registry), personal guaranty (all ≥ 20% owners), security agreement (first-position blanket lien), ACH authorization (debit + credit), beneficial-ownership cert, business-purpose affidavit, borrowing-base rider if applicable; Dropbox Sign envelope (guarantors → PRIN countersign); on execution **UCC-1 auto-e-filed**, activation blocked until `ucc_filing_ack_received = true`; Dwolla customer + funding source created, micro-deposit/Plaid Auth verification | All signatures complete; `ucc_filing_ack_received = true`; `disbursement_account_verified = true`; ACH authorization active | 1–2 business days |
| `FUNDED` (ACTIVATION) | SYS | None (PROC notified, no action) | `line_status = ACTIVE`; `activation_date = today`; `maturity_date = activation_date + 365d`; `available_credit = committed_limit`; origination fee 2.0% of limit invoiced — **deducted from first draw** (config `origination_fee_collection = NET_FIRST_DRAW`); portal Draw button enabled; welcome email + first-draw walkthrough; recurring jobs scheduled: monthly statement, monthly covenant sweep, weekly lien monitor, renewal clock | Line `ACTIVE`; borrower can draw | Same day as docs completion |
| `SERVICING` | PROC | Ongoing lifecycle (§4–7). Exactly one PROC owns the WC servicing queue | Everything in §4–7 | Renewal (loops in `SERVICING`), term-out, or closure | Continuous |
| `PAID_OFF` (CLOSED) | PROC | Confirm zero balance + close request (or term-out completion); close line | **Zero balance alone never closes a revolver** — needs borrower close request, non-renewal term-out completion, or workout exit. UCC-3 termination auto-filed ≤ 10 business days; payoff/closure letter + guaranty release generated; Plaid item archived after 90 days | `line_status = CLOSED`; `ucc_terminated = true` | UCC-3 within 10 business days |
| `DEAD` | LO | Record `dead_reason_code` (§9) | Auto-dead after 14 days borrower inactivity pre-`TERM_SHEET` (`DEAD_UNRESPONSIVE`) after 3 nudges; revivable ≤ 90 days without new application | Terminal | — |
| `DECLINED` | UW | Record `decline_reason_codes[]` (1–4); UW owns every decline even when SYS pre-screen triggered it | SYS generates adverse-action notice from reason codes via the shared `aan_reason_map` (ECOA/Reg B business-credit rules, 12 CFR 1002.9: written notice discloses the right to request a statement of specific reasons within **60 days of notification**; Lendrock provides the statement within 30 days of any such request — matches Modules 01 §4.4, 02 §6.2, 11 §A3; §1071 demographic-capture schema stubbed behind firewall, toggle OFF by default — Module 10 §10.5.2) | Terminal; notice sent ≤ 30 days from completed application | Notice same day as decision |

**End-to-end: 3 business days best case (Plaid link, clean file, ≤ $150k) — 7 business days worst (statement upload + PRIN + conditions).** SYS tracks `stage_entered_at`; Slack escalation to owner at 100% of SLA, to PRIN at 150%.

---

## 2. Cash-flow underwrite

### 2.1 Bank data rules
- **Plaid is the product spine**, not just an underwriting input: the same link powers draw-time balance checks and monthly covenant sweeps. `bank_link_status ∈ {LINKED, DEGRADED, DISCONNECTED}`; reconnect nags at +3d/+7d; freeze at +10d (§7.1).
- Linked account must show ≥ 70% of stated revenue (primacy check), else SYS demands additional links.
- **Statement-only deals** (`bank_data_source = STATEMENTS`): tier capped at **B**, limit haircut **×0.85**, and a mandatory post-activation covenant to connect Plaid within **30 days** or the line freezes (`FRZ_BANK_LINK_LOST`). Until linked, covenant sweeps degrade to monthly statement-upload borrower tasks.

### 2.2 SYS-computed metrics pack (table `wc_cashflow_metrics`, keyed `line_id` + `as_of_date`; computed at underwrite, recomputed nightly for active lines)

| Field | Definition |
|---|---|
| `avg_monthly_true_revenue_3m` / `_6m` | Deposits excluding transfers, financing proceeds (known lender/MCA counterparties), refunds, owner injections |
| `revenue_trend_pct` | (last 3 mo avg ÷ prior 3 mo avg) − 1 |
| `avg_daily_balance_90d` / `min_daily_balance_90d` | Across all linked operating accounts |
| `negative_balance_days_90d` | EOD-negative day count |
| `nsf_count_90d` | NSF/overdraft item count |
| `deposit_frequency_score` | 0–100 regularity/diversity (daily card settlement high, single monthly wire low) |
| `largest_depositor_pct` | Top counterparty share of true revenue |
| `existing_debt_service_monthly` | Recurring debt debits incl. MCA daily/weekly debits normalized monthly |
| `mca_position_count` | Distinct MCA/alt-lender debit counterparties (stacking detector) |
| `dscr_proxy` | (avg monthly net cash flow + existing_debt_service_monthly) ÷ (existing_debt_service_monthly + pro-forma monthly interest at 100% utilization) |
| `cash_buffer_days` | `avg_daily_balance_90d ÷ avg daily operating outflow` |

### 2.3 Credit limit formula (standard structure)
```
base_limit     = 0.75 × avg_monthly_true_revenue_3m
tier_mult      = { A: 1.20, B: 1.00, C: 0.75 }
adj_limit      = base_limit × tier_mult[risk_tier]
               × (bank_data_source == STATEMENTS ? 0.85 : 1.00)
               × (revenue_trend_pct < −15% ? 0.80 : 1.00)
proposed_limit = round_down_5000( clamp(adj_limit, 25_000, 250_000) )
```
Floor **$25,000** (below → `DECL_REVENUE_LOW`, reroute to BB micro-term). Ceiling **$250,000**; PRIN exception to **$500,000** with memo. UW override of formula output in either direction requires a one-line justification stored on `wc_underwrites.limit_override_note`.

### 2.4 Risk tier scorecard (weakest-link rule: tier = lowest tier of any criterion; UW may move one notch with memo)

| Criterion | Tier A | Tier B | Tier C (floor to qualify) |
|---|---|---|---|
| `guarantor_fico` | ≥ 700 | ≥ 650 | ≥ 620 |
| `time_in_business_months` | ≥ 36 | ≥ 24 | ≥ 12 |
| `dscr_proxy` | ≥ 1.50 | ≥ 1.25 | ≥ 1.10 |
| `nsf_count_90d` | 0 | ≤ 2 | ≤ 3 |
| `negative_balance_days_90d` | 0 | ≤ 3 | ≤ 5 |
| `revenue_trend_pct` | ≥ 0 | ≥ −10% | ≥ −15% |

**Pricing defaults** (floating WSJ Prime, floor 12.00% APR, interest on drawn balance only, no unused-line fee): A = Prime + 6.00, `draw_fee_pct` 1.00% · B = Prime + 9.00, 1.50% · C = Prime + 12.00, 2.00%. `origination_fee_pct` 2.00% at activation; `renewal_fee_pct` 1.00% per renewal; late fee 5% of amount due, min $25; default rate +5.00% APR.

---

## 3. Borrowing-base variant (AR-heavy borrowers)

`structure_type = BORROWING_BASE` when the borrower is B2B/invoice-driven and needs more than the cash-flow formula supports. Always PRIN-approved at origination.

- **AR ingestion**: QuickBooks Online AR aging pull (reuses shared QBO integration); non-QBO borrowers upload aging on the standard CSV template. `ar_aging_source ∈ {QBO, UPLOAD}`.
- **Eligible AR** = invoices < 90 days old, minus: cross-aged debtors (> 50% of a debtor's AR at 90+ → exclude that debtor entirely), affiliate/intercompany AR, foreign (non-US/CA) AR, contra accounts, unassigned government AR, and per-debtor concentration over **25%** of total AR (excess only).
- **`advance_rate_pct` default 80%** (UW range 70–85%).
- **Availability** = `min(committed_limit, borrowing_base_amount) − outstanding_principal`, where `borrowing_base_amount = eligible_ar_total × advance_rate_pct`.
- **Monthly Borrowing-Base Certificate**: SYS drafts BBC on the 5th from QBO data → borrower officer e-signs in portal (Dropbox Sign `BORROWING_BASE_CERT` template) by the **15th** (`bbc_due_day`) → SYS recomputes availability on execution. QBO-connected = one-click confirm; upload borrowers attach aging. `bbc_status: PENDING → SIGNED → APPLIED`. Overdue > 5 days → `FRZ_BBC_OVERDUE`.
- BBC availability **decreases apply immediately**. If `outstanding_principal > borrowing_base_amount`: over-advance task → PROC demands paydown of excess within **10 business days**, draws frozen meanwhile; unresolved → UW workout review.

---

## 4. Ongoing lifecycle — draws

### 4.1 Draw state machine (`wc_draws.status`)
`REQUESTED → CHECKS_PASSED | CHECKS_FAILED → AUTO_APPROVED | PENDING_PROC | PENDING_UW → APPROVED | REJECTED → DISBURSING → SETTLED | RETURNED`; `CANCELLED` reachable from any pre-`DISBURSING` state (borrower or ops).

### 4.2 Draw flow

| Stage | Owner | Required actions | Automations (SYS) | Exit criteria | Target SLA |
|---|---|---|---|---|---|
| Request | Borrower (portal) | Tap **Draw**, enter `requested_amount`; portal shows live `available_credit`, fee preview, and estimated arrival before confirm | Button disabled with plain-language reason if `line_status ≠ ACTIVE`; min `draw_floor` = $1,000; input capped at availability | `wc_draws` row `REQUESTED` | Instant |
| Auto-checks | SYS | — | Run battery (§4.3); write per-check results to `auto_check_results` (jsonb); route per matrix (§4.4) | `CHECKS_PASSED` → routed; `CHECKS_FAILED` → auto-reject with borrower-safe reason (fraud-related checks show generic "additional review" + open PROC task) | < 60 seconds |
| Approval | SYS / PROC / UW per §4.4 | Human paths: one-screen review card (line metrics, last sweep result, recent draws/payments, check results) → Approve / Reject with `draw_reject_reason_code` | Auto path skips humans; borrower notified on every transition (email + portal) | `APPROVED` or `REJECTED` | AUTO instant · PROC 4 business hrs · UW 1 business day |
| Disburse | SYS | — | Plaid Balance real-time check (borrower account open) + warehouse headroom check (§ Interfaces); Dwolla ACH credit, net of draw fee (and origination fee on first draw); double-entry ledger postings; **same-day ACH when approved before 1:00 PM ET**, else next business day; wire option > $100k on PROC request ($25 fee) | `SETTLED` on Dwolla webhook; `RETURNED` (R03/R04 etc.) → PROC task, availability restored, `fail_reason_code` set, disbursement account re-verification forced | Same/next business day |

### 4.3 Auto-check battery (all must pass)
1. `chk_line_active` — `line_status = ACTIVE`, no open freeze.
2. `chk_availability` — `requested_amount + pending_draws_total ≤ available_credit` (§3 availability for borrowing-base lines).
3. `chk_no_past_due` — no unpaid billed amount past due.
4. `chk_covenants` — latest sweep `PASS`; `WATCH` forces human review (soft-fail, not hard-fail).
5. `chk_bank_link` — Plaid healthy, last successful refresh < 7 days.
6. `chk_velocity` — ≤ 2 draws per business day AND trailing-5-business-day draws ≤ 50% of `committed_limit`.
7. `chk_account_change` — disbursement account unchanged in last 7 days; change → mandatory PROC review + Plaid Auth re-verification.
8. `chk_maturity` — `today < maturity_date − 5 business days` unless renewal executed.
9. `chk_bbc_current` — (borrowing-base only) BBC signed for current cycle.

### 4.4 Approval matrix (first matching row wins; thresholds live in `wc_settings`, PRIN-editable, audit-logged)

| Condition | Path | Approver |
|---|---|---|
| First draw on the line, any amount | `PENDING_PROC` | PROC |
| ≤ **$25,000** AND ≤ 25% of `available_credit` AND all checks pass | `AUTO_APPROVED` | SYS |
| ≤ $100,000, checks pass | `PENDING_PROC` | PROC |
| > $100,000 OR covenant `WATCH` OR any soft-flag | `PENDING_UW` | UW |

---

## 5. Ongoing lifecycle — repayments & utilization

- **Billing**: monthly interest-only, billed in arrears. Statement generated on the **1st** (`wc_statements`: `interest_accrued`, `fees_billed`, `min_payment_due`, `outstanding_principal`, `utilization_pct`); **autopay ACH debit on the 5th** via Dwolla. Autopay enrollment is mandatory at closing (`autopay_enrolled = true` gates activation). Principal due at maturity, renewal, or term-out.
- **Application order**: fees → accrued interest → past-due principal → current principal.
- **Voluntary paydown**: portal **Pay Down** button, ≥ $100, ACH debit initiated same day. **Availability replenishes 3 business days after debit initiation** (`wc_payments.availability_release_at`) to cover ACH return risk; wire paydowns replenish on receipt.
- **Failed autopay**: one auto-retry at +3 days; second failure → `FRZ_ACH_RETURN` + delinquency ladder (§7.2). Return codes R02/R16 (account closed/frozen) skip the retry and freeze immediately.
- **Utilization tracking**: daily snapshot `wc_utilization_daily (line_id, date, outstanding_principal, committed_limit, utilization_pct, available_credit)` powers the borrower gauge, limit-increase triggers (§6.3), renewal charts, and portfolio dashboards. `ALR_UTIL_MAXED` when utilization ≥ 95% for 30 consecutive days → PROC outreach task (growth or distress conversation).
- **Payoff**: portal-requested payoff quote, SYS-generated, good for 10 days. Zero balance parks the line at $0 — closure only per `PAID_OFF` rules (§1).

---

## 6. Monitoring, annual review, limit changes

### 6.1 Monthly covenant sweep (SYS, 2nd business day monthly; nightly metric recompute feeds it)
Recomputes §2.2 metrics from the live feed, compares to baseline snapshot (`wc_underwrites` at activation or last renewal). Line result `PASS | WATCH | FAIL` → `wc_covenant_checks`. Per-line thresholds overridable via `covenant_profile_id`.

| Alert code | Default trigger | Severity → action |
|---|---|---|
| `ALR_BAL_DECLINE` | `avg_daily_balance_30d` < 70% of baseline | WATCH → PROC task |
| `ALR_DEPOSIT_DROP` | Monthly true revenue < 75% of baseline, 2 consecutive months | WATCH; 3rd consecutive month → FAIL (`FRZ_COVENANT_BREACH`) |
| `ALR_NSF_SPIKE` | ≥ 3 NSF items trailing 30 days | FAIL → `FRZ_NSF_SPIKE` |
| `ALR_NEG_DAYS` | ≥ 3 EOD-negative days trailing 30 days | WATCH |
| `ALR_NEW_LIEN` | New UCC/tax lien/judgment on **weekly** Middesk monitor | FAIL → `FRZ_LIEN_ALERT`; auto-clears if filing is Lendrock's own or a disclosed equipment PMSI (PROC dispositions) |
| `ALR_STACKING_DETECTED` | New recurring daily/weekly debit matching MCA signature | FAIL → freeze + UW review (negative covenant breach under LOC agreement) |
| `ALR_LARGE_TRANSFER_OUT` | Single outbound transfer > 50% of `avg_monthly_true_revenue_3m` to non-payroll/non-vendor counterparty | WATCH |
| `ALR_LINK_DISCONNECTED` | Plaid errored/revoked > 10 days after 3 relink nudges | FAIL → `FRZ_BANK_LINK_LOST` |

WATCH alerts land in a single PROC monitoring queue, disposition ∈ {`DISMISS_WITH_NOTE`, `ESCALATE_TO_UW`, `FREEZE`}, 2-business-day SLA. FAIL alerts freeze first, review after.

### 6.2 Annual review / renewal

| Stage | Owner | Required actions | Automations (SYS) | Exit criteria | Target SLA |
|---|---|---|---|---|---|
| Packet generation (maturity − 60d) | SYS | — | Auto-assemble renewal packet: 12-mo utilization/draw/repay charts, payment performance, current vs baseline metrics, refreshed soft pull + Middesk + lien search, sweep history, SYS recommendation `RENEW_AS_IS | RENEW_INCREASE | RENEW_DECREASE | TERM_OUT` with recomputed formula limit | Packet in UW queue | Day of trigger |
| UW review | UW | Approve/modify recommendation; set renewal limit, re-rate tier/pricing | Pre-filled renewal memo | Decision recorded; PRIN co-sign if increase > 20% or new limit > $150k | 5 business days |
| Borrower execution | PROC | Send renewal amendment (not a new closing) | Dropbox Sign; on execution: `maturity_date += 365d`, `renewal_fee_pct` (1.0%) billed, baseline metrics re-snapshotted, `wc_renewals` row written | Executed ≥ 5 business days before maturity | 10 business days |
| Non-renewal / no response | SYS | — | At maturity unexecuted: `FRZ_MATURITY_PASSED`; line converts to **TERM_OUT** — outstanding amortizes over 6 months, level monthly P&I on autopay; borrower notices at −30/−15/−5 days | Term-out schedule active, or balance = 0 → `PAID_OFF` | Automatic |

A Lendrock-initiated non-renewal, `RENEW_DECREASE`, or `TERM_OUT` decision is a termination/unfavorable change on an existing account: unless the trigger is borrower delinquency/default under the LOC agreement (12 CFR 1002.2(c)(2) exception), SYS generates the Reg B business-credit adverse-action notice via the shared service (Module 10 §10.5.2) alongside the operational notices. Borrower no-response to an offered renewal requires no AAN.

### 6.3 Limit increase / decrease (all changes append to immutable `wc_limit_changes`: `old_limit`, `new_limit`, `limit_change_reason_code`, `request_source`, `approved_by`, `effective_date`)
- **Increase — SYS-suggested**: utilization ≥ 70% avg over 90 days AND zero lates in 6 months AND current deposits ≥ 110% of baseline → SYS proposes min(+25%, recomputed §2.3 formula) → UW approves (PRIN if new limit > $150k) → amendment e-signed → limit updated. Borrower-requested increases enter the same flow from a portal form (`request_source = BORROWER`).
- **Decrease — SYS-suggested**: two consecutive WATCH sweeps or any FAIL disposition → SYS proposes `new_limit = max(0.60 × current avg_monthly_true_revenue × tier_mult, outstanding_principal)` → UW approves → **10-day advance written notice** (portal + email) **plus**, whenever the `limit_change_reason_code` is not borrower delinquency/default under the LOC agreement (e.g. `LMT_COVENANT_DETERIORATION`, `LMT_RISK_REDUCTION`), a **Reg B business-credit adverse-action notice via the shared service (Module 10 §10.5.2)** — an unfavorable change in terms on an existing account is adverse action under 12 CFR 1002.2(c)(1)(ii) unless the 1002.2(c)(2) delinquency/default exception applies (Module 11 §A3). Limit never set below outstanding (no forced paydown from a decrease), but draws stay frozen until utilization < 100% of new limit.

---

## 7. Freeze rules & delinquency

### 7.1 Auto-freeze (SYS sets `line_status = FROZEN`, appends `wc_freezes` event with `freeze_reason_code`; portal Draw button disabled with plain-language reason; PROC notified instantly). Freeze stops **draws only** — billing, autopay, and monitoring continue.

| Code | Trigger | Unfreeze |
|---|---|---|
| `FRZ_PAST_DUE` | Billed amount 5+ days past due | SYS auto, on payment settlement |
| `FRZ_ACH_RETURN` | Autopay returned twice, or once with R02/R16 | Cleared funds + account re-verified (PROC) |
| `FRZ_BANK_LINK_LOST` | Plaid disconnected > 10 days (or statement-deal Plaid covenant missed at +30d) | SYS auto, on relink + successful refresh |
| `FRZ_NSF_SPIKE` / `FRZ_COVENANT_BREACH` | §6.1 FAIL results | UW disposition memo |
| `FRZ_LIEN_ALERT` | New undisclosed lien/judgment | PROC/UW disposition |
| `FRZ_BBC_OVERDUE` | BBC > 5 days late | SYS auto, on BBC signed |
| `FRZ_MATURITY_PASSED` | Maturity without executed renewal | Renewal executed, else term-out |
| `FRZ_FRAUD_REVIEW` | Disbursement-account change + draw request within 7 days; identity-alert webhook | PROC clears after re-verification |
| `FRZ_MANUAL` | PROC/UW/PRIN manual freeze (note required) | Same role or higher, note required |

Human unfreezes always require a note. SYS auto-unfreezes only the three objective conditions marked "SYS auto".

**Adverse action (Reg B):** every `wc_freezes` event whose `freeze_reason_code` is not borrower delinquency/default under the LOC agreement (e.g. `FRZ_BANK_LINK_LOST`, `FRZ_COVENANT_BREACH` from an `ALR_DEPOSIT_DROP`-driven sweep, `FRZ_BBC_OVERDUE`) also routes through the shared adverse-action service (Module 10 §10.5.2): counsel maps each freeze code in the `aan_reason_map` to `AAN_REQUIRED` vs `EXEMPT_DEFAULT_DELINQUENCY` (`FRZ_PAST_DUE` and `FRZ_ACH_RETURN` are exempt under 12 CFR 1002.2(c)(2)), and SYS generates the Reg B business-credit notice (action taken + reasons/right-to-request + ECOA notice) alongside the plain-language freeze messaging.

### 7.2 Delinquency ladder (days past due on billed amount; `delinquency_status` on `wc_lines`)

| DPD | Status | Owner | Actions |
|---|---|---|---|
| 1–5 | `LATE_GRACE` | SYS | ACH auto-retry day 3; reminder email/SMS day 1 and 4 |
| 6 | `DELINQUENT_1` | SYS | Late fee (5%, min $25); `FRZ_PAST_DUE`; PROC call task |
| 15 | `DELINQUENT_2` | PROC | Documented outreach; payment-plan offer (≤ 3-month catch-up, PROC authority, template `WC_CATCHUP_PLAN`) |
| 30 | `DELINQUENT_3` | UW | Default rate +5.00% APR engages per agreement; UW workout review: plan vs term-out vs demand |
| 60 | `PRE_DEFAULT` | PRIN | Demand letter (SYS template, PRIN releases); PG enforcement assessment |
| 90 | `DEFAULT` | PRIN | Charge-off review; collections counsel referral; `line_status = IN_WORKOUT` or `CHARGED_OFF`; UCC position re-confirmed |

`line_status` enum: `ACTIVE | FROZEN | TERM_OUT | IN_WORKOUT | CHARGED_OFF | CLOSED`.

---

## 8. Credit-box guardrails (SYS pre-screen at `QUALIFIED`; re-checked at `UNDERWRITING`; every override logged with authority + note)

| Guardrail | Threshold | Hard/Soft | Override authority |
|---|---|---|---|
| `time_in_business_months` | ≥ 12 | Hard | PRIN |
| `avg_monthly_true_revenue_3m` | ≥ $35,000 | Hard | PRIN |
| `guarantor_fico` | ≥ 620 | Hard | PRIN |
| `nsf_count_90d` | ≤ 3 | Soft | UW |
| `negative_balance_days_90d` | ≤ 5 | Soft | UW |
| Open bankruptcy (entity or guarantor) | None; discharged ≥ 24 months OK | Hard | None |
| Tax liens / judgments | None undisclosed; disclosed require payoff plan or subordination | Soft | UW |
| MCA stacking | ≤ 1 existing position, paid off from first draw (condition) | Soft | UW |
| Existing blanket UCC-1 (another lender) | Terminated or subordinated pre-activation | Hard | PRIN |
| Industry | NAICS blocklist: adult, firearms dealers, plant-touching cannabis, crypto exchanges, gambling, MSBs | Hard | None |
| Geography | US entity, US operating account | Hard | None |
| Use of funds | Business purpose only; affidavit at closing | Hard | None |
| Entity type | LLC/Corp/LP only — natural-person borrowers (incl. sole proprietorships) are barred portal-wide (Module 11 §A1 rule 3, ratified Module 12 B7); SOLE_PROP leads are knocked out at intake with the "form an LLC first" path (Module 01 §4.4) | Hard | None |
| PG coverage | All ≥ 20% owners; ≥ 51% of ownership guaranteed | Hard | PRIN |

---

## 9. Reason codes

- **Decline** (`decline_reason_codes[]`, mapped to adverse-action notice language): `DECL_REVENUE_LOW`, `DECL_TIB_SHORT`, `DECL_FICO_MIN`, `DECL_NSF_HISTORY`, `DECL_BALANCE_TREND`, `DECL_NEGATIVE_DAYS`, `DECL_EXISTING_LIENS`, `DECL_STACKED_MCA`, `DECL_BANKRUPTCY`, `DECL_INDUSTRY_INELIGIBLE`, `DECL_GEOGRAPHY`, `DECL_OFAC_MATCH`, `DECL_FRAUD_MISREP`, `DECL_UNABLE_TO_VERIFY` (KYB/KYC/bank-data failure; never expose fraud suspicion in the notice — pair with `DECL_UNABLE_TO_VERIFY` externally).
- **Dead** (`dead_reason_code`): `DEAD_UNRESPONSIVE`, `DEAD_WITHDREW`, `DEAD_TERMS_REJECTED`, `DEAD_LOST_COMPETITOR`, `DEAD_DOCS_STALLED`, `DEAD_DUPLICATE`, `DEAD_DEAL_TYPE_MISMATCH` (rerouted to BB/SBA; links to successor deal). All extension rows of the shared DeadReason taxonomy (Module 09 §9.2.2), each mapped to one `core_code`.
- **Draw rejection** (`draw_reject_reason_code`): `DRJ_INSUFFICIENT_AVAIL`, `DRJ_FROZEN`, `DRJ_PAST_DUE`, `DRJ_COVENANT`, `DRJ_VELOCITY`, `DRJ_BBC_STALE`, `DRJ_NEAR_MATURITY`, `DRJ_VERIFICATION`, `DRJ_MANUAL_UW`.
- **Freeze**: §7.1 codes. **Limit change** (`limit_change_reason_code`): `LMT_UTILIZATION_EARNED`, `LMT_BORROWER_REQUEST`, `LMT_RENEWAL_RERATE`, `LMT_COVENANT_DETERIORATION`, `LMT_RISK_REDUCTION`.

## 10. Module-owned tables
`wc_lines`, `wc_underwrites`, `wc_cashflow_metrics`, `wc_draws`, `wc_payments`, `wc_statements`, `wc_covenant_checks`, `wc_alerts`, `wc_freezes`, `wc_borrowing_base_certs`, `wc_limit_changes`, `wc_renewals`, `wc_utilization_daily`, `wc_settings`.

Key `wc_lines` fields: `line_id`, `deal_id`, `borrower_id`, `line_status`, `delinquency_status`, `risk_tier`, `structure_type`, `committed_limit`, `outstanding_principal`, `available_credit` (computed), `utilization_pct`, `interest_rate_apr`, `base_rate_index`, `rate_margin_bps`, `draw_fee_pct`, `origination_fee_pct`, `renewal_fee_pct`, `draw_floor`, `activation_date`, `maturity_date`, `payment_day`, `autopay_enrolled`, `plaid_item_ids[]`, `bank_link_status`, `bank_data_source`, `borrowing_base_enabled`, `advance_rate_pct`, `borrowing_base_amount`, `bbc_due_day`, `ar_aging_source`, `covenant_profile_id`, `ucc_filing_number`, `ucc_filing_ack_received`, `freeze_reason_code`.

---

## Interfaces with other modules
- **Lead Intake & Routing**: hands WC-pathway deals in at `QUALIFIED`; receives `DEAD_DEAL_TYPE_MISMATCH` reroutes back (need > $500k or term debt fits → BB/SBA), with successor-deal linkage.
- **Borrower Portal (shared surface)**: WC contributes Draw, Pay Down, live availability gauge, statements, BBC signing, renewal execution, and freeze-state messaging; reuses shared upload and embedded Dropbox Sign components.
- **Documents & Templates module**: template registry entries `TS_WC`, `LOC_AGMT`, `BORROWING_BASE_CERT`, `WC_RENEWAL_AMEND`, `WC_CATCHUP_PLAN`, adverse-action (`DECLINE_LTR`), demand letters (`DEMAND_LTR`); WC supplies merge fields.
- **Payments/Ledger + Servicing**: all draws/repayments/fees ride the shared Dwolla rails and double-entry ledger; shares ACH return-code handling, same-day cutoff config, and QuickBooks JE posting with HM/BB servicing; charge-off hands into the shared workout/recovery flow at `DEFAULT`.
- **Capital Markets (CM / investor surface)**: WC is balance-sheet/warehouse funded; SYS checks facility headroom before any disbursement > $50k and alerts CM at ≥ 85% facility utilization; portfolio tape (utilization, tier mix, delinquency, sweep results) feeds investor reporting.
- **Compliance module**: adverse-action generation/retention, Reg B §1071 capture firewall, KYB/KYC records (Middesk/Persona), OFAC re-screen before first disbursement to any new account.
- **Monitoring/Alerts infrastructure (shared)**: covenant sweeps and weekly Middesk lien monitoring publish to the shared alert queue + Slack escalation bus used by HM draw inspections and BB covenant checks.
- **Integration layer**: consumes shared webhook inbox (`plaid`, `dwolla`, `dropboxsign`, `middesk`, `quickbooks`) with idempotent processing per the integration module's `webhook_inbox` contract.
# Module 05 — Deal Workflow: SBA (SBA & Bank-Facilitated Financing)

On the SBA pathway Lendrock is a **packager/referral agent, not the lender**: it pre-screens eligibility, signs a packaging engagement, assembles a lender-ready SBA package, matches and submits the deal to partner banks/SBLCs, quarterbacks lender underwriting and SBA authorization, coordinates closing, and collects a packaging fee (borrower-paid) plus a referral fee (lender-paid) — both disclosed on SBA Form 159. Because Lendrock does not control credit decisions, the portal's job is different from HM/BB/WC: it is a **document factory + multi-lender submission tracker + borrower communication machine** over a 30–90 day cycle where most elapsed time sits inside partner banks. Every stage below therefore has aggressive automation for doc chasing, lender follow-up, and borrower status updates, and one accountable human owner per stage.

---

## 5.1 Pathway summary and deviations from the canonical skeleton

`deal.deal_type = SBA`. Stage enum (`deal.stage`):

```
NEW_LEAD -> CONTACTED -> QUALIFIED -> ENGAGED -> APPLICATION -> LENDER_MATCHING
-> SUBMITTED -> UNDERWRITING -> APPROVED -> DOCS_CLOSING -> FUNDED
Terminal: DEAD(reason_code), DECLINED(reason_code)
```

Deviations from canonical, all intentional:

- **`ENGAGED` inserted** between `QUALIFIED` and `APPLICATION`: Lendrock earns nothing without a signed packaging agreement + Form 159; the fee event must be an explicit gate, not a substep.
- **`TERM_SHEET` replaced by `LENDER_MATCHING` + `SUBMITTED`**: Lendrock issues no term sheet on SBA; partner-lender proposal letters play that role and are tracked per-submission, not on the deal.
- **`UNDERWRITING`/`APPROVED`/`DOCS_CLOSING` are liaison stages**: the owner drives responsiveness to the lender, not a credit decision.
- **No `SERVICING`/`PAID_OFF`**: Lendrock exits at `FUNDED` once fees are reconciled. `deal.post_funded_status = FEE_PENDING | FEE_COLLECTED | FEE_DISPUTED` covers the tail. A `SYS` job creates a WC/BB cross-sell lead 6 months post-funding.
- `PRIN` and `UW` appear only as reviewers/escalation on this pathway (no Lendrock credit approval exists). `UW` performs one quality gate: pre-submission package review.

Deal-level SBA fields: `sba_program` (`SBA_7A | SBA_504 | SBA_EXPRESS | BANK_CONVENTIONAL`), `naics_code`, `use_of_proceeds[]` (enum list), `requested_amount`, `time_in_business_months`, `is_startup` (bool, derived: < 24 months), `entity_type`, `owner_count_20pct`, `prescreen_result`, `package_completion_pct` (SYS-computed), `active_submission_count`, `winning_submission_id`, `authorization_number` (SBA loan number), `funded_amount`, `projected_funding_date`.

## 5.2 Stage flow

| Stage | Owner | Required actions | Automations (SYS) | Exit criteria | Target SLA |
|---|---|---|---|---|---|
| NEW_LEAD | LO | Review intake payload; confirm `deal_type = SBA` is right (re-route to BB/WC if speed matters more than rate) | Auto-create deal from landing-page CTA or manual entry; owner LO assigned per Module 01 §5.1 routing rules; send borrower ack email with "what SBA takes" expectations (30–90 days, doc list preview) | LO logs first contact attempt | 1 business day (bd) |
| CONTACTED | LO | Discovery call: amount, use of proceeds, timeline tolerance, revenue, credit self-report; set expectation that SBA is slow-but-cheap | Auto-sequence: 5-touch email/SMS cadence over 7 days if unresponsive; call logged via click-to-call | Discovery call completed, intake fields populated | 3 bd |
| QUALIFIED | LO | Run the **eligibility pre-screen checklist** (§5.4) in-portal; resolve all REVIEW flags with UW async comment | Auto-evaluate HARD_FAIL rules as LO types; auto-generate `prescreen_result` PDF snapshot to doc vault; auto-DEAD with reason code on hard fail (LO can override to REVIEW once, logged) | `prescreen_result = PASS`; borrower verbally committed | 2 bd |
| ENGAGED | LO | Send packaging agreement + SBA Form 159 (fee disclosure) for e-sign; collect engagement deposit (50% of packaging fee) | Auto-generate both docs from templates with fee schedule merged in; e-sign envelope; auto-invoice deposit via payment link; auto-reminders at 2/5/8 days; auto-DEAD at 21 days unsigned (`reason_code = ENGAGEMENT_NOT_SIGNED`) | Packaging agreement + Form 159 signed by all required parties, deposit paid | 5 bd |
| APPLICATION | PROC | Drive **package assembly** (§5.6): request, review, accept every checklist item; build lender-ready package PDF + financial summary | Auto-generate doc checklist from `sba_program` + `is_startup` + `use_of_proceeds`; borrower-portal upload requests with per-item reminders (2 bd cadence); OCR/date-check tax returns and financials; staleness timers (120-day financials); compute `package_completion_pct` nightly | All checklist items `ACCEPTED` or `WAIVED`; UW package quality review = PASS | 15 bd |
| LENDER_MATCHING | CM | Run match engine against partner-lender directory (§5.7); pick target list (default max 3 simultaneous); confirm referral agreements current | Auto-score all `ACTIVE` lenders; auto-exclude expired referral agreements and appetite mismatches; render side-by-side match sheet | ≥1 `deal_submission` created in `DRAFT`; borrower notified which lenders were selected | 3 bd |
| SUBMITTED | CM | Transmit package to each target lender (per `submission_method`); log acknowledgments; chase lender pre-screen responses | Auto-assemble per-lender submission bundle (package + Lendrock deal summary memo); auto-follow-up to lender at 3/5/7 bd without acknowledgment; **block stage entry unless `form_159_record.status = SIGNED_APPLICANT_AGENT` (or later) and engagement executed (hard compliance gate)** | ≥1 submission reaches `IN_UNDERWRITING` or `PROPOSAL_ISSUED` | 5 bd to first lender response |
| UNDERWRITING | PROC | Liaison: receive lender condition lists, translate to borrower tasks, return items ≤ 2 bd; weekly lender check-in call logged; manage competing proposals with CM | Conditions inbox: each lender request becomes a tracked `condition_item`; borrower-portal tasks auto-created; auto-escalate to CM if lender silent 7 bd; auto-request refreshed financials at deal-age day 100 (pre-empts staleness) | Borrower accepts one proposal (`winning_submission_id` set) and that lender issues credit approval; losing submissions auto-`WITHDRAWN` | 20 bd (lender-controlled; Lendrock-side condition turnaround SLA 2 bd) |
| APPROVED | CM | Confirm lender credit approval; track SBA authorization (PLP lenders self-authorize within days; non-delegated go to SBA LGPC 5–10 bd); record `authorization_number` | Auto-request authorization status from lender every 3 bd; borrower congratulation + closing-prep email with closing checklist preview; seasonal LGPC-delay warning banner Aug 15–Oct 15 | SBA authorization issued (or bank commitment letter for `BANK_CONVENTIONAL`) | 10 bd |
| DOCS_CLOSING | PROC | Coordinate closing: insurance, entity docs, landlord waivers, equity-injection evidence, payoff letters; schedule closing with the lender's closer | Closing checklist auto-seeded from authorization conditions; per-item reminders; equity-injection wire-evidence task; 48h pre-closing confirmation sequence to borrower | Loan closed and funded by lender (lender confirmation received) | 15 bd |
| FUNDED | CM | Verify funded amount vs. authorization; trigger final fee events; confirm winning lender has the executed Form 159 for its closing file; send borrower wrap-up + review request | Auto-invoice packaging-fee balance and lender referral fee per referral agreement; set `post_funded_status = FEE_PENDING`; auto-dun at 15/30 days; auto-create cross-sell lead at +6 months; archive package to cold storage | `post_funded_status = FEE_COLLECTED` | Fee invoices 1 bd after funding; collection ≤ 15 days |

Total realistic elapsed time: **~30 bd best case, 60–90 calendar days typical.** The portal computes `projected_funding_date` = sum of remaining stage SLAs, recomputed nightly, and shows it to the borrower.

## 5.3 Automated borrower status-update cadence (mandatory on this pathway)

SBA's long cycle kills deals via borrower anxiety and silence. The `SYS` communication contract:

1. **Event-driven (immediate):** every `deal.stage` change; every borrower-visible `deal_submission.status` change (submitted, proposal received, approved, authorized, closing scheduled); every checklist item accepted or rejected (rejection message includes exactly what to fix).
2. **Weekly digest:** every Monday 9:00 AM borrower-local, sent from the deal's LO identity: current stage in plain English, `package_completion_pct`, items waiting on borrower (named), items waiting on lender/SBA, `projected_funding_date`. Suppressed only if an event email went out in the prior 24h.
3. **Stall reassurance:** no borrower-visible event for 5 bd → SYS drafts a "still moving, here's exactly where it sits" note and opens a task for the stage owner to add one human sentence (owner has 4h to edit before auto-send).
4. **Escalation:** no deal activity of any kind for 10 bd → task to LO + alert to PRIN with stage, owner, days stalled.

All sends logged to `status_update_log` (`deal_id`, `sent_at`, `channel`, `template_id`, `trigger` = `EVENT | WEEKLY | STALL`, `opened_at`). The borrower portal mirrors the same data as a live timeline so email is never the only source of truth.

## 5.4 Eligibility pre-screen (QUALIFIED stage)

Designed so a non-expert (LO, or eventually the borrower via self-serve form) can run it. Stored as an `sba_prescreen` record: `deal_id`, `completed_by`, `completed_at`, one field per check below, `result` (`PASS | REVIEW | HARD_FAIL`), `fail_codes[]`, `notes`. Any HARD_FAIL → `result = HARD_FAIL`. Any REVIEW flag without a HARD_FAIL → route to UW async review (SLA 1 bd). All green → PASS.

| # | Check | Field(s) | Plain-language question | Logic |
|---|---|---|---|---|
| 1 | For-profit, US-based | `is_for_profit`, `is_us_located` | Is it a for-profit business operating in the US? | Either false → HARD_FAIL `SBA_NOT_FOR_PROFIT_US` |
| 2 | Size standard | `tangible_net_worth`, `avg_net_income_2yr` | Is tangible net worth ≤ $20M AND average after-tax net income (last 2 fiscal years) ≤ $6.5M? | Default = SBA **alternative size standard** (works for any industry; no NAICS lookup needed by the LO). Both yes → pass. Either no → REVIEW `SBA_SIZE_REVIEW` (UW checks the NAICS-based size table before failing). Automated NAICS-table lookup is a v2 enhancement. |
| 3 | Eligible use of proceeds | `use_of_proceeds[]` | What is the money for? | Eligible enum: `WORKING_CAPITAL, EQUIPMENT, INVENTORY, OWNER_OCCUPIED_RE_PURCHASE, CONSTRUCTION_RENOVATION, BUSINESS_ACQUISITION, PARTNER_BUYOUT, DEBT_REFINANCE, STARTUP_COSTS, FRANCHISE_PURCHASE`. Ineligible selections (`PASSIVE_RE_INVESTMENT, LENDING_ACTIVITY, OWNER_DISTRIBUTION, DELINQUENT_TRUST_TAXES, SPECULATION`) → HARD_FAIL `SBA_INELIGIBLE_PROCEEDS`. `DEBT_REFINANCE`, or real estate with < 51% owner occupancy (60% for ground-up), → REVIEW `SBA_PROCEEDS_REVIEW`. |
| 4 | Citizenship / ownership | `owners[] {name, pct, citizenship_status}` | Is every direct AND indirect owner a US citizen or US national with principal residence in the US? List everyone with any ownership. | Any owner whose status is not in `sba_eligible_citizenship_statuses` → HARD_FAIL `SBA_CITIZENSHIP` — unless the borrower proposes divesting that owner to 0% ownership (a management role may remain), which routes REVIEW `SBA_CITIZENSHIP_CURE` instead. The eligible-status set is **not hard-coded**: it lives in a PRIN-editable config table keyed to the governing SBA notice number (current value `CITIZEN | NATIONAL` per SBA Procedural Notice 5000-876626, eff. 2026-03-01, which supersedes Notice 5000-872050 and updates SOP 50 10 8 — LPRs are now Ineligible Persons for ownership; E-Tran auto-rejects, codes 4435/4438). This rule changed three times in 13 months, so the table sits on the annual counsel review cadence (Module 08 §8.4). The ownership table also drives who signs Forms 1919/413 later (≥20% owners). |
| 5 | Credit-elsewhere test | `personal_liquidity_total`, `was_bank_declined` | Could the owners fund this themselves or get a normal bank loan on reasonable terms? | Combined non-retirement liquid assets of business + owners > `requested_amount` → REVIEW `SBA_CREDIT_ELSEWHERE` (lender will scrutinize). A prior conventional-bank decline is helpful evidence but not required. Never a HARD_FAIL at prescreen — the lender owns the formal test. |
| 6 | Prohibited industry | `naics_code`, `industry_flags[]` | Does the business do any of: lending/finance, gambling (> 1/3 revenue), adult entertainment, cannabis or hemp-derived THC, speculative trading, pyramid/MLM, lobbying/political, religious instruction, private club with restricted membership, passive real-estate landlording, government-owned entity? | Rendered as explicit yes/no toggles, not a free-text NAICS judgment call. Any yes → HARD_FAIL `SBA_INELIGIBLE_INDUSTRY`. Landlord toggle has one carve-out prompt: "will the applicant's own operating business occupy the property?" → REVIEW `SBA_EPC_REVIEW` (Eligible Passive Company structure) instead of fail. |
| 7 | Prior government debt default | `prior_gov_default`, `gov_debt_delinquent` | Has the business or any owner ever defaulted on federal debt causing a loss to the government (prior SBA loan, FHA/VA, federal student loan, charged-off federal tax debt)? Any federal debt currently delinquent? | Default-with-loss → HARD_FAIL `SBA_PRIOR_GOV_DEFAULT`. Currently delinquent, no loss → REVIEW `SBA_GOV_DEBT_REVIEW` (often curable via repayment plan). Lender/SBA verifies via CAIVRS; we prescreen by attestation only. |
| 8 | Character | `has_criminal_history` | Is any owner currently incarcerated, on parole/probation, or facing pending charges? | Yes → HARD_FAIL `SBA_CHARACTER`. Past **resolved** history → REVIEW `SBA_912_REQUIRED` (adds Form 912 to the doc checklist; most lenders can still do the deal). |
| 9 | Fundamentals sanity | `credit_score_self_reported`, `annual_revenue`, `is_startup` | FICO < 640? Pre-revenue with no collateral and no equity injection? | Either → REVIEW `SBA_WEAK_FILE` (UW decides whether any partner lender has appetite before Lendrock takes a fee). Never auto-fail — some partners buy 640s. |

HARD_FAIL auto-moves the deal to `DEAD` with the fail code as `reason_code`, sends a templated "not SBA-eligible, here's why, here are alternatives" email, and — key cross-sell rule — **auto-creates a linked HM/BB/WC lead whenever the fail reason doesn't disqualify those pathways** (size or industry fails often make fine BB deals).

## 5.5 Engagement (ENGAGED stage)

Record: `packaging_engagement` — `deal_id`, `agreement_template_version`, `packaging_fee_amount`, `fee_schedule` (`FIFTY_FIFTY` default: 50% at signing, 50% at submission-ready), `deposit_invoice_id`, `signed_at`, `form_159_record_id`, `status` (`SENT | PARTIALLY_SIGNED | EXECUTED | EXPIRED`).

Defaults (PRIN may override per-deal, logged): packaging fee **$3,500 flat** for requests ≤ $500k, **$5,000** above $500k or any 504/real-estate deal. The fee is for packaging services actually rendered, **not contingent on approval or funding**, and never expressed as a percentage of loan amount (§5.10). The deposit is non-refundable once package work begins (defined as the first checklist item reaching `ACCEPTED`).

Form 159 is generated and signed **at engagement**, not at closing: the applicant must see total agent compensation before work starts, and the winning lender needs the executed form for its closing package. If the referral-fee amount changes (it is a percentage of funded amount), SYS re-issues an updated 159 at `APPROVED` for re-signature and marks the old record `SUPERSEDED`.

## 5.6 Package assembly (APPLICATION stage)

Per-item tracking rides the shared `doc_request` lifecycle (Module 06 §2.1: `REQUESTED → UPLOADED → IN_REVIEW → ACCEPTED | REJECTED → …`, plus `WAIVED`/`EXPIRED`), extended with SBA fields: `phase` (`PACKAGE | CLOSING`) and `applies_to` (`BUSINESS` or `owner_id` for per-owner items). Only PROC sets `ACCEPTED`; only UW sets `WAIVED`. `EXPIRED` is SYS-set when `expires_at` passes before submission (financial statements: 120 days; payoff letters: 30 days).

Checklist (auto-generated from deal facts; `[S]` = startups only, `[C]` = conditional). Item codes are the Module 06 master-matrix `doc_code`s — SBA-only extras (`RE_DOCS`, `EQUITY_INJ`) are registered in the matrix's SBA sections:

| item_code | Document | Scope | Staleness | Rule |
|---|---|---|---|---|
| SBA_1919 | SBA Form 1919 Borrower Information Form | Business; signed by every ≥20% owner + key managers | — | Always |
| PFS | SBA Form 413 Personal Financial Statement (SBA deals render the shared PFS as Form 413 — Module 06 §1.2) | Each ≥20% owner (incl. spouse info) | 90 days | Always for 7(a)/504 |
| SBA_912 | SBA Form 912 Statement of Personal History | Each owner with affirmative character answers | — | [C] only if prescreen flag `SBA_912_REQUIRED` or a "yes" on 1919 character questions |
| FORM_4506C | Signed IRS Form 4506-C transcript authorization | Business + each ≥20% owner | — | Always (lender pulls transcripts; an unsigned 4506-C is the #1 closing delay) |
| TAX_RETURN_BIZ | Business federal tax returns, 3 most recent years, all schedules | Business | — | Always; `is_startup` → auto-`WAIVED` reason `STARTUP_NO_HISTORY` |
| TAX_RETURN_PERS | Personal federal tax returns, 3 years | Each ≥20% owner | — | Always |
| FIN_STMT_INTERIM | YTD P&L + balance sheet | Business | 120 days | Always |
| DEBT_SCHEDULE_BIZ | Business debt schedule (creditor, original amount, balance, rate, payment, maturity, collateral) | Business | 90 days | Always; portal provides the fillable template (Module 06 §5.6b) — free-form spreadsheets get bounced by lenders |
| PROJECTIONS | 2-year projections, monthly for year 1, with assumptions page | Business | — | [C] if `is_startup`, acquisition, expansion proceeds, or trailing-12 cash flow doesn't cover proposed debt service |
| BUSINESS_PLAN | Business plan | Business | — | [S] startups; acquisitions substitute a transition plan |
| ENT_ARTICLES + ENT_OPERATING_AGMT + ENT_EIN_LETTER + ENT_GOOD_STANDING | Formation docs, operating agreement/bylaws, EIN letter, good-standing certificate (Module 06 §1.1 set) | Business | Good standing: 90 days | Always |
| ENT_BUSINESS_LICENSE | Business licenses/permits | Business | — | [C] licensed industries |
| RESUME | Management resumes | Each ≥20% owner + key managers | — | Always (cheap; every lender asks) |
| BANK_STMT_BIZ | Business bank statements, 6 months | Business | 60 days | Always |
| BIZ_PURCHASE_AGMT (or PURCHASE_CONTRACT for RE) | Executed purchase agreement / LOI | Business | — | [C] acquisition or RE purchase |
| RE_DOCS | Property details; existing appraisal/environmental if any; rent roll | Business | — | [C] real-estate proceeds |
| FRANCHISE_AGMT | Franchise agreement + FDD; franchise must appear in the SBA franchise directory | Business | — | [C] franchise deals; SYS checks `franchise_directory_id` |
| PREMISES_LEASE | Premises lease + landlord contact | Business | — | [C] leased premises |
| AR_AGING + AP_AGING | A/R and A/P aging reports | Business | 60 days | [C] working-capital proceeds or revenue > $1M |
| EQUITY_INJ | Evidence of equity-injection source (statements showing seasoned funds; personal statements ride BANK_STMT_PERS) | Owners | 60 days | [C] acquisitions, startups, RE purchases (assume 10% injection requirement) |

Automations: single borrower-portal upload hub grouped by owner; every `REQUESTED` item reminds on a 2-bd cadence (email + SMS) until `UPLOADED`; OCR validates tax-year coverage and statement dates and auto-sets `REJECTED` (reason `STALE_DATE`/`WRONG_PERIOD`, Module 06 §2.1) with a specific message; `package_completion_pct` = (accepted + waived) / required, shown to the borrower and in the weekly digest.

**Exit gate:** when all items are `ACCEPTED/WAIVED`, SYS compiles the **lender package**: a bookmarked PDF in fixed section order (Lendrock deal-summary memo → SBA forms → financials → tax returns → supporting) plus a one-page credit summary (`dscr_estimate`, `collateral_summary`, `injection_pct`, ownership table). UW then runs a 1-bd package quality review (`package_review = PASS | FIX_LIST`) before `LENDER_MATCHING` opens. A weak package never goes to a partner bank — package quality is Lendrock's entire reputation with lenders.

## 5.7 Lender matching and submission (LENDER_MATCHING, SUBMITTED)

### Partner-lender directory (owned by CM; shared with the Partners module)

`partner_lender`: `id`, `name`, `lender_type` (`BANK | SBLC | CREDIT_UNION | CDC`), `status` (`ACTIVE | PAUSED | OFFBOARDED`), `is_plp` (delegated authority — self-authorizes, faster), `referral_agreement_status` (`EXECUTED | EXPIRED | NEGOTIATING | NONE`), `referral_agreement_expires_on`, `referral_fee_bps` (default 100 = 1% of funded amount), `submission_method` (`EMAIL | LENDER_PORTAL | API`), `submission_instructions`, `primary_contact {name, email, phone}`, `escalation_contact`, `notes`.

`lender_program_appetite` (one row per lender × program): `partner_lender_id`, `program` (`SBA_7A | SBA_504 | SBA_EXPRESS | BANK_CONVENTIONAL`), `loan_min`, `loan_max`, `naics_include[]` (empty = all), `naics_exclude[]`, `states[]` (empty = nationwide), `min_fico`, `min_time_in_business_months` (0 = does startups), `startup_ok`, `collateral_required`, `special_appetites[]` (free tags: `ACQUISITIONS`, `MEDICAL`, `NO_TRUCKING`, …), `prescreen_turnaround_bd`, `underwriting_turnaround_bd`, `active`.

SYS maintains rolling-12-month stats per lender × program, computed from `deal_submission` history: `submissions_count`, `approval_rate`, `avg_days_to_decision`, `avg_days_to_fund`, `fee_paid_on_time_rate`. These feed the match score, so the directory self-corrects toward lenders that actually close and pay.

### Match-and-submit workflow

1. SYS scores every `ACTIVE` lender with an `EXECUTED` referral agreement: hard filters first (program, size band, state, NAICS exclude, startup_ok, min_fico), then rank = `0.4*approval_rate + 0.3*speed_score + 0.2*appetite_tag_match + 0.1*fee_reliability`. Lenders failing hard filters are shown greyed-out with the failing filter named (keeps directory data honest).
2. CM selects targets. **Default max 3 simultaneous submissions** (enough competition for terms, few enough to stay credible with partners); 4+ requires PRIN approval. If a clear #1 exists (PLP + high approval rate in this NAICS), CM may run sequential: submit #1 alone with a 5-bd exclusivity timer; SYS auto-releases #2/#3 on expiry.
3. Each target gets a `deal_submission`: `id`, `deal_id`, `partner_lender_id`, `program`, `status` (`DRAFT | SUBMITTED | ACKNOWLEDGED | IN_UNDERWRITING | MORE_INFO_REQUESTED | PROPOSAL_ISSUED | APPROVED | AUTHORIZED | DECLINED | WITHDRAWN`), `submitted_at`, `acknowledged_at`, `proposal_terms {amount, rate_structure, term_months, guaranty_fee_treatment, conditions_summary}`, `decline_reason_text`, `decline_letter_file_id`, `decision_at`, `submission_bundle_file_id`.
4. Child table `submission_event` logs every touch: `submission_id`, `at`, `actor`, `direction` (`IN | OUT`), `type` (`FOLLOW_UP | CONDITION_REQUEST | CONDITION_RESPONSE | CALL_NOTE | STATUS_CHANGE`), `body`. This is the liaison system of record.
5. Multi-submission rules enforced by SYS: proposals are presented to the borrower side-by-side in the borrower portal (rate, term, injection, conditions); when the borrower accepts one, `winning_submission_id` is set and all other non-terminal submissions auto-move to `WITHDRAWN` with a templated courtesy email to the losing lenders (relationship hygiene is automated, not optional). `MORE_INFO_REQUESTED` on one submission creates condition tasks without blocking the others.

## 5.8 Underwriting liaison, approval, authorization (UNDERWRITING, APPROVED)

PROC owns condition turnaround. Every lender information request becomes a `condition_item`: `submission_id`, `description`, `borrower_action_required` (bool), `status` (`OPEN | WITH_BORROWER | RETURNED_TO_LENDER | CLEARED`), `due_at` = request + 2 bd. Borrower-facing conditions surface as portal tasks with upload widgets; internal ones (e.g., clarify the debt schedule) PROC clears directly. SYS chases lenders that go quiet for 7 bd (email + CM alert) and pre-emptively requests refreshed financials at deal-age day 100, before any lender flags staleness.

At `APPROVED`: CM records lender credit approval, then tracks SBA authorization. PLP lenders self-authorize (days); non-delegated submissions go to the SBA LGPC (budget 5–10 bd; longer in the September fiscal-year-end crunch — SYS shows a seasonal warning banner Aug 15–Oct 15). Store `authorization_number`, `authorized_amount`, `authorization_conditions_file_id`. If `authorized_amount ≠ requested_amount`, SYS recomputes fee math and, if the referral fee changes, re-issues Form 159.

## 5.9 Closing coordination and FUNDED

The `DOCS_CLOSING` checklist is auto-seeded from the authorization's conditions plus standard items: hazard/liability insurance with lender as loss payee, life-insurance assignment if required, entity good-standing refresh, landlord waiver/subordination, equity-injection wire evidence, payoff letters for refinanced debt, IRS transcript reconciliation cleared. Each is a `doc_checklist_item` with `phase = CLOSING`. PROC coordinates with the **lender's** closer — Lendrock never prepares loan documents on SBA deals.

On lender funding confirmation: stage → `FUNDED`; SYS (a) invoices any remaining packaging-fee balance to the borrower, (b) invoices the referral fee to the lender at `referral_fee_bps × funded_amount`, cross-checked against the executed referral agreement, (c) verifies the executed Form 159 is in the doc vault — hard alert to CM + PRIN if missing (the lender needs it in its closing file and it is Lendrock's compliance evidence), (d) duns at 15/30 days. `post_funded_status = FEE_COLLECTED` closes the deal. Revenue posts to the Fees/Accounting ledger as `SBA_PACKAGING_FEE` / `SBA_REFERRAL_FEE`.

## 5.10 Fee mechanics and compliance (Form 159 and referral-agent rules)

`form_159_record`: `deal_id`, `version`, `agent_name` (Lendrock Capital), `services_description`, `applicant_paid_fee_amount`, `lender_paid_fee_amount`, `itemization_file_id`, `signed_by_applicant_at`, `signed_by_agent_at`, `signed_by_lender_at`, `submitted_by_lender_at`, `status` (`DRAFT | SENT | SIGNED_APPLICANT_AGENT | SIGNED_LENDER | SUBMITTED_BY_LENDER | SUPERSEDED` — the single canonical 159 lifecycle; the Module 06 §2.2 stage gate and Module 11 §A5 build spec reference these values), `superseded_by_id`.

Guardrails encoded in the system (validations, not memos):

- **Form 159 on every SBA deal where Lendrock is compensated by anyone** — applicant-paid packaging fee, lender-paid referral fee, or both; both streams appear on the same form. SYS blocks `SUBMITTED` without a 159 at `SIGNED_APPLICANT_AGENT` (or later) and blocks fee invoicing at `FUNDED` if the 159 on file doesn't match invoiced amounts (mismatch → `FEE_DISPUTED` + PRIN alert).
- **Itemization**: any applicant-paid fee over $2,500 requires an attached itemization of services performed (`itemization_file_id` mandatory above the threshold; template provided).
- **Fees must be for services actually performed and reasonable.** The packaging fee is flat-rate and documented against the checklist work product. Never quote packaging as a percentage of loan amount.
- **No double-charging**: Lendrock may not collect a fee from the applicant and the lender **for the same service**. Packaging fee (applicant) covers document assembly; referral fee (lender) covers the origination referral under the referral agreement. The `services_description` on the 159 states this split explicitly.
- **Agent fees are never paid out of SBA loan proceeds.** The packaging-fee balance is collected from the borrower's own funds before or at closing; the SYS invoice says so explicitly.
- Lendrock as referral agent/packager **MAY**: collect and organize documents, prepare the application package and financial summaries, assist with projections, refer the applicant to lenders, relay underwriting conditions, coordinate closing logistics.
- Lendrock **MAY NOT**: represent itself as approved, endorsed, or certified by the SBA (marketing rule: "SBA loan packaging" yes, "SBA-approved packager" never); guarantee approval or advertise approval odds; sign SBA forms on the applicant's behalf; author or alter borrower financial documents (assist ≠ author); charge the applicant contingent success fees; take fees from loan proceeds; accept lender compensation not disclosed on the 159.
- Referral agreements live on `partner_lender`; SYS blocks submissions to lenders with `referral_agreement_status != EXECUTED` — no handshake referrals, because undisclosed compensation is the cardinal Form 159 violation.

## 5.11 Reason codes and adverse-action handling

`DEAD` reason codes (SBA pathway): `ENGAGEMENT_NOT_SIGNED`, `BORROWER_UNRESPONSIVE`, `BORROWER_WITHDREW`, `CHOSE_OTHER_LENDER` (outside Lendrock), `DOCS_STALLED` (package < 100% for 45 days), `TIMELINE_MISMATCH` (needed money faster — auto-offer BB/WC), `NO_LENDER_MATCH` (zero eligible partners), plus the prescreen hard-fail codes: `SBA_NOT_FOR_PROFIT_US`, `SBA_SIZE_FAIL`, `SBA_INELIGIBLE_PROCEEDS`, `SBA_CITIZENSHIP`, `SBA_INELIGIBLE_INDUSTRY`, `SBA_PRIOR_GOV_DEFAULT`, `SBA_CHARACTER`.

`DECLINED` (all targeted lenders declined) reason codes, set from lender decline letters: `LENDER_CASH_FLOW`, `LENDER_COLLATERAL`, `LENDER_CREDIT_HISTORY`, `LENDER_INDUSTRY_RISK`, `LENDER_INJECTION_INSUFFICIENT`, `LENDER_ELIGIBILITY` (lender's own SBA-eligibility finding), `LENDER_UNSPECIFIED`.

Adverse action: the **declining lenders**, as the creditors, own Reg B adverse-action notices — Lendrock is not the creditor on SBA deals. Portal duties: marking a submission `DECLINED` requires both the lender's decline letter on file (`decline_letter_file_id`) and CM confirmation that the lender delivered its adverse-action notice to the applicant — not merely to Lendrock (`lender_aan_confirmed_at` timestamp; on applications submitted through a third party to multiple creditors, 12 CFR 1002.9(g) is satisfied by each declining creditor's own notice, and this confirmation is the audit evidence). When the deal itself goes `DECLINED`, SYS sends Lendrock's templated wind-down letter (facts only, no credit characterization: "the lenders we submitted to did not extend an offer; here are alternative pathways") and auto-creates a BB/WC cross-sell lead when the decline reasons aren't disqualifying there. Retention: per the shared retention schedule (Module 10 §10.5.4 — declined-application class, 5 years from decision).

## 5.12 SLA timers and dashboards

SYS runs per-stage countdowns from §5.2; breaches paint the deal amber (100% of SLA) and red (150%) on the pipeline board, and red adds a line to PRIN's daily digest. CM's lender-ops dashboard: submissions by lender × status, lenders past `prescreen_turnaround_bd`, referral agreements expiring within 60 days, fees `FEE_PENDING` > 15 days. PROC's dashboard: checklist items `REQUESTED` > 4 bd, conditions `WITH_BORROWER` > 2 bd, financials expiring within 20 days.

---

## Interfaces with other modules

- **Leads & Intake**: consumes `NEW_LEAD` deals with `deal_type = SBA`; sends cross-sell leads back (prescreen fails, timeline mismatches, post-funding +6 months) with source attribution preserved.
- **Documents/Vault**: `doc_checklist_item` storage, package compilation, e-sign envelopes (packaging agreement, Form 159), lender decline letters; retention per the shared schedule (Module 10 §10.5.4): declined/adverse-action files 5 years, DEAD files 3 years.
- **Borrower Portal**: upload hub, checklist progress, side-by-side lender proposals, live status timeline fed by `status_update_log`.
- **Partners/Investor module (CM surface)**: `partner_lender` + `lender_program_appetite` directory and referral-agreement lifecycle live there; this workflow reads appetites and writes performance stats.
- **Fees/Accounting**: engagement deposit, packaging balance, and lender referral-fee invoices; `SBA_PACKAGING_FEE` / `SBA_REFERRAL_FEE` revenue types; dunning.
- **Compliance module**: Form 159 registry, marketing-claims rules (no "SBA-approved" language), wind-down letter templates, retention schedule.
- **Reporting/Analytics**: stage-SLA breach feed, lender approval-rate/turnaround stats, fee pipeline forecast from `projected_funding_date`.
- **HM/BB/WC workflow modules**: bidirectional re-routing (`deal_type` change preserves deal history) when speed or eligibility points a borrower at a different pathway.
# Module 06 — Document Collection System

Document collection is the single biggest cycle-time killer in private lending, so this module is built as a state machine, not a shared drive: every deal instantiates a checklist of `doc_request` records from a deal-type-driven requirements matrix, each request moves through a strict lifecycle (REQUESTED → UPLOADED → IN_REVIEW → ACCEPTED/REJECTED → EXPIRED), and pipeline stage transitions are hard-gated on ACCEPTED documents. Borrowers never create accounts — they upload via passwordless magic links with automated email/SMS chasing — and SYS does the sorting (auto-classification), freshness policing, and reminder work so PROC reviews instead of chases. One owner per request at all times; PROC owns first-pass review, UW owns financial-document acceptance, SYS owns everything that can be templated.

---

## 1. Master Document Matrix

This matrix is seed data for the `doc_requirement` table, keyed by `doc_code`. When a deal enters APPLICATION, SYS instantiates one `doc_request` per row where the deal's type is REQUIRED, and evaluates CONDITIONAL rules against application data (conditions are stored as JSON-logic expressions on `doc_requirement.condition_expr` so PROC can edit them without code deploys). PROC can manually add/waive requests on any deal; waivers require `waiver_reason` and are visible to UW/PRIN.

**Legend:** REQ = REQUIRED · COND(x) = CONDITIONAL on x · N.A. = not applicable. Freshness = maximum document age, enforced at the checkpoint noted (default checkpoint: funding date).

### 1.1 Entity & Organizational Documents

| doc_code | Document | HM | BB | WC | SBA | Freshness rule |
|---|---|---|---|---|---|---|
| ENT_ARTICLES | Articles of Organization / Incorporation (filed, stamped) | REQ | REQ | REQ | REQ | Any age; entity name must match application exactly |
| ENT_OPERATING_AGMT | Operating Agreement / Bylaws incl. all amendments | REQ | REQ | REQ | REQ | Any age; must reflect current ownership |
| ENT_GOOD_STANDING | Certificate of Good Standing / Existence (state of formation + property state if different) | REQ | REQ | REQ | REQ | ≤30 days at closing |
| ENT_EIN_LETTER | IRS EIN assignment letter (CP-575 or 147-C) | REQ | REQ | REQ | REQ | Any age |
| ENT_OWNERSHIP_SCHEDULE | Ownership schedule / cap table down to natural persons (all owners ≥20%) | REQ | REQ | REQ | REQ | ≤90 days; re-attest at closing |
| ENT_RESOLUTION | Borrowing resolution / member consent authorizing loan and signer | REQ | REQ | REQ | COND(partner bank requires) | Dated within 30 days of closing (generated by SYS from template, e-signed) |
| ENT_DBA_FILING | Fictitious name / DBA registration | COND(operates under DBA) | COND(operates under DBA) | COND(operates under DBA) | COND(operates under DBA) | Unexpired per state rules |
| ENT_BUSINESS_LICENSE | Industry/professional license | N.A. | COND(licensed industry) | COND(licensed industry) | COND(licensed industry) | Unexpired |
| ENT_W9 | Form W-9 for borrower entity | REQ | REQ | REQ | N.A. | Current tax year |
| ENT_BOI_CERT | Beneficial ownership certification (portal form, e-signed) | REQ | REQ | REQ | REQ | ≤90 days at closing |

### 1.2 Guarantor / Personal Documents

| doc_code | Document | HM | BB | WC | SBA | Freshness rule |
|---|---|---|---|---|---|---|
| GOV_ID | Government photo ID, every guarantor and signer | REQ | REQ | REQ | REQ | Unexpired at closing |
| CREDIT_AUTH | Credit report authorization (e-sign, business-purpose certification embedded) | REQ | REQ | REQ | REQ | ≤120 days; re-pull if closing slips past |
| PFS | Personal financial statement, every guarantor (SBA deals use SBA Form 413 as the PFS) | REQ | REQ | COND(line > $150k) | REQ (Form 413) | Signed ≤90 days at UW decision |
| TAX_RETURN_PERS | Personal tax returns, all schedules | COND(bridge-to-perm exit or UW request) — 1 yr | REQ — 2 yrs | COND(line > $250k) — 2 yrs | REQ — 3 yrs | Most recent filed year; if on extension: extension filing + prior year |
| TRACK_RECORD | RE experience schedule: address, buy/sell dates, prices, role; settlement statements for 3 most recent | REQ | N.A. | N.A. | N.A. | Projects within last 36 months |
| RESUME | Management resume, each owner ≥20% | N.A. | N.A. | N.A. | REQ | ≤12 months |
| FORM_4506C | IRS Form 4506-C transcript authorization (e-sign) | N.A. | COND(loan > $500k) | COND(line > $500k) | REQ | Signed ≤120 days (IRS rejects older) |
| SBA_1919 | SBA Form 1919 Borrower Information (portal-rendered, e-sign) | N.A. | N.A. | N.A. | REQ | ≤90 days at bank submission |
| SBA_912 | SBA Form 912 Statement of Personal History | N.A. | N.A. | N.A. | COND("yes" to any 1919 character question) | ≤90 days at bank submission |
| CITIZENSHIP_DOC | Green card / visa evidence | COND(non-citizen guarantor) | COND(non-citizen guarantor) | COND(non-citizen guarantor) | COND(non-citizen guarantor) | Unexpired |

### 1.3 Business Financials

| doc_code | Document | HM | BB | WC | SBA | Freshness rule |
|---|---|---|---|---|---|---|
| BANK_STMT_BIZ | Business bank statements, all operating accounts | REQ — 2 mo (liquidity proof) | REQ — 4 mo | REQ — 6 mo (or Plaid link, preferred) | REQ — 6 mo | Most recent statement ≤60 days old at closing |
| BANK_STMT_PERS | Personal bank/brokerage statements | COND(liquidity held personally) — 2 mo | COND(UW request) | N.A. | COND(equity injection sourcing) — 2 mo | Most recent ≤60 days at closing |
| TAX_RETURN_BIZ | Business tax returns, all schedules/K-1s | COND(bridge-to-perm exit) — 1 yr | REQ — 2 yrs | REQ — 2 yrs | REQ — 3 yrs | Most recent filed year; extension rule as above |
| FIN_STMT_INTERIM | Interim P&L + balance sheet, YTD | N.A. | REQ | REQ | REQ | Through most recent quarter-end; ≤90 days old |
| AR_AGING | Accounts receivable aging (portal template §5.7) | N.A. | COND(AR pledged as collateral) | COND(structure_type = BORROWING_BASE — Module 04 §3; standard Plaid-first lines never require it) | COND(partner bank request) | As-of date ≤30 days |
| AP_AGING | Accounts payable aging | N.A. | COND(AR pledged) | COND(structure_type = BORROWING_BASE) | COND(partner bank request) | As-of date ≤30 days |
| DEBT_SCHEDULE_BIZ | Business debt schedule (portal template §5.6) | COND(entity has existing debt) | REQ | REQ | REQ | As-of date ≤30 days at UW decision |
| MERCHANT_STMTS | Merchant/card processing statements — 3 mo | N.A. | COND(card revenue > 30% of sales) | COND(card revenue > 30% of sales) | N.A. | Most recent ≤60 days |
| CUSTOMER_CONTRACTS | Key customer contracts / POs | N.A. | COND(single customer > 20% revenue, or contract-backed loan) | COND(single customer > 20% revenue) | N.A. | Currently in force |
| PROJECTIONS | Financial projections, monthly yr 1 + annual yrs 2–3 | N.A. | COND(expansion use of funds) | N.A. | COND(startup or acquisition) | Prepared ≤90 days |
| BUSINESS_PLAN | Business plan | N.A. | N.A. | N.A. | COND(startup < 2 yrs operating) | Prepared ≤6 months |
| PAYOFF_LETTER_DEBT | Payoff letters for debts being refinanced | N.A. | COND(use of funds = refi) | COND(use of funds = refi) | COND(use of funds = refi) | ≤30 days; good-through date past funding date |

### 1.4 Property / Collateral Documents

| doc_code | Document | HM | BB | WC | SBA | Freshness rule |
|---|---|---|---|---|---|---|
| PURCHASE_CONTRACT | Fully executed purchase contract + all addenda | COND(purpose = purchase) | N.A. | N.A. | COND(RE or business acquisition) | In force; closing date consistent with pipeline target |
| EMD_PROOF | Earnest money deposit evidence (escrow receipt) | COND(purpose = purchase) | N.A. | N.A. | N.A. | Matches contract terms |
| TITLE_COMMITMENT | Preliminary title report / commitment (SYS-ordered) | REQ | COND(RE collateral) | N.A. | COND(RE-secured; partner bank orders) | ≤90 days at closing; date-down at funding |
| APPRAISAL | Valuation report — HM: product per the loan-size valuation matrix (Module 02 §3.2, dual-AVM/desktop through full appraisal); BB_CRE: full appraisal, or exterior BPO+AVM ≤ $500k (Module 03 §4.2) — SYS-ordered from AMC panel | REQ | COND(RE collateral) | N.A. | COND(partner bank orders own) | ≤120 days at closing |
| REHAB_BUDGET | Rehab budget / scope of work (portal form §5.2) | COND(fix-and-flip or ground-up) | N.A. | N.A. | N.A. | Matches current contractor bid; re-baseline on change orders |
| PLANS_PERMITS | Architectural plans + issued permits | COND(ground-up or structural rehab) | N.A. | N.A. | N.A. | Permits unexpired |
| CONTRACTOR_AGMT | GC contract + GC license + GC liability COI | COND(rehab budget > $50k or ground-up) | N.A. | N.A. | N.A. | License and COI unexpired |
| LEASES_RENT_ROLL | Leases and rent roll | COND(tenant-occupied or rental exit) | COND(CRE collateral, tenant-occupied) | N.A. | COND(tenant income underwritten) | Rent roll as-of ≤30 days |
| PAYOFF_DEMAND | Mortgage payoff demand statement | COND(purpose = refi) | COND(refi of RE debt) | N.A. | N.A. | Good-through date past funding date |
| SURVEY | ALTA survey | COND(title requires or new construction) | N.A. | N.A. | N.A. | Per title company requirement |
| ENVIRONMENTAL | Phase I ESA | COND(commercial/industrial property) | COND(commercial/industrial collateral) | N.A. | COND(partner bank requires) | ≤180 days |
| FLOOD_CERT | Flood zone determination, life-of-loan (SYS-ordered) | REQ | COND(RE collateral) | N.A. | N.A. (partner orders) | Ordered per transaction |
| UCC_SEARCH | UCC/lien/judgment search on entity + guarantors (SYS-ordered) | COND(UW request) | REQ | REQ | N.A. (partner runs) | ≤30 days at closing |
| EQUIPMENT_DOCS | Equipment invoices, titles, serial numbers | N.A. | COND(equipment collateral) | N.A. | COND(equipment purchase use) | Invoices match use of funds |

### 1.5 Insurance

| doc_code | Document | HM | BB | WC | SBA | Freshness rule |
|---|---|---|---|---|---|---|
| INS_PROPERTY | Hazard policy (builder's risk if ground-up) — Lendrock as mortgagee/loss payee, coverage ≥ loan amount or replacement cost | REQ | COND(RE collateral) | N.A. | N.A. (partner requires own) | Bound evidence at closing; expiry tracked in SERVICING, renewal chased at T-30 days |
| INS_FLOOD | Flood policy | COND(flood zone A/V per FLOOD_CERT) | COND(flood zone + RE collateral) | N.A. | N.A. | Bound at closing; renewal tracked |
| INS_GL | General liability COI | COND(ground-up or rehab > $50k) | N.A. | N.A. | COND(partner requires) | Unexpired at closing |
| INS_LIFE | Key-man life insurance + collateral assignment | N.A. | COND(loan > $1M with thin secondary repayment) | N.A. | COND(partner bank requires) | In force at closing |

### 1.6 SBA Package Extras

| doc_code | Document | HM | BB | WC | SBA | Freshness rule |
|---|---|---|---|---|---|---|
| FRANCHISE_AGMT | Franchise agreement + FDD receipt | N.A. | N.A. | N.A. | COND(franchise business) | Current agreement |
| BIZ_PURCHASE_AGMT | Business purchase agreement + asset list | N.A. | N.A. | N.A. | COND(acquisition) | Fully executed |
| BIZ_VALUATION | Independent business valuation | N.A. | N.A. | N.A. | COND(acquisition; partner bank orders) | ≤12 months |
| PREMISES_LEASE | Premises lease + landlord contact | N.A. | N.A. | N.A. | COND(leased premises) | Term (incl. options) ≥ loan term per SBA rule |
| AFFILIATE_DOCS | Affiliate entity tax returns + financials | N.A. | N.A. | N.A. | COND(any owner controls another entity ≥50%) | Same freshness as TAX_RETURN_BIZ |
| RE_DOCS | Property details for real-estate proceeds: existing appraisal/environmental if any, rent roll | N.A. | N.A. | N.A. | COND(real-estate proceeds) | Existing reports accepted as-is; rent roll ≤90 days |
| EQUITY_INJ | Evidence of equity-injection source (statements showing seasoned funds; personal statements ride BANK_STMT_PERS) | N.A. | N.A. | N.A. | COND(acquisition, startup, RE purchase) | ≤60 days |
| SBA_159 | SBA Form 159 Fee Disclosure & Compensation Agreement — discloses Lendrock's packaging/referral fee. SYS-drafted from the SBA module's `packaging_engagement` + `form_159_record` (itemized services + compensation), e-signed by applicant + Lendrock at engagement; winning lender countersigns at closing. Lifecycle state (`form_159_records`) is owned by the SBA workflow module; the executed PDF stores here and ships in every lender submission package | N.A. | N.A. | N.A. | REQ (every compensated deal) | Regenerate + re-execute if final compensation differs from the disclosed amount |

### 1.7 Closing & Banking

| doc_code | Document | HM | BB | WC | SBA | Freshness rule |
|---|---|---|---|---|---|---|
| VOIDED_CHECK | Voided check or bank ACH letter for payment account | REQ | REQ | REQ | N.A. | Account open and matching BANK_STMT_BIZ |
| TERM_SHEET_SIGNED | Countersigned term sheet / proposal letter (e-sign; SBA: engagement + fee agreement) | REQ | REQ | REQ | REQ | Current version; re-sign on repricing |
| BORROWING_BASE_CERT | Borrowing base certificate (portal form; recurring monthly in SERVICING) | N.A. | N.A. | COND(structure_type = BORROWING_BASE — monthly; Module 04 §3) | N.A. | As-of month-end; due by day 15 |

**Freshness enforcement (SYS):** every `doc_request` stores `freshness_days` and `freshness_checkpoint` (`AT_UW_DECISION` | `AT_CLOSING` | `RECURRING`). A nightly job compares document `period_end_date` / `signed_date` (OCR-extracted, PROC-confirmed) against the deal's `target_close_date`; any ACCEPTED doc that will be stale at its checkpoint flips to EXPIRED, reopens as REQUESTED, and notifies the borrower with a pre-written "your closing date requires an updated X" message.

---

## 2. Document Request Lifecycle

### 2.1 Status machine

`doc_request.status`: REQUESTED → UPLOADED → IN_REVIEW → ACCEPTED | REJECTED → (REJECTED reverts to REQUESTED) ; ACCEPTED → EXPIRED → REQUESTED. Side state: WAIVED (PROC or UW action, requires `waiver_reason`; PRIN notified on waiver of any REQ doc).

| Status | Owner | Required actions | Automations (SYS) | Exit criteria | Target SLA |
|---|---|---|---|---|---|
| REQUESTED | PROC | None (SYS chases); PROC intervenes only on escalation | Instantiate from matrix; send magic link; reminder cadence day 1/3/5/7 email+SMS; day-7 escalation task to LO | File uploaded into slot | Borrower upload ≤7 days |
| UPLOADED | SYS | None | Virus scan; auto-classification; OCR extraction of dates/entity name/period; auto-flag stale or name-mismatched docs; queue for review | Scan clean + classified → IN_REVIEW (instant) | ≤5 min |
| IN_REVIEW | PROC (tier 1) then UW (tier 2, financial docs only) | PROC: completeness, legibility, correct doc/entity/period. UW: content acceptance on financial docs | Route by `review_tier`; pre-populate review panel with OCR findings; one-click accept/reject with reason picker; SYS flags the item GATE_CRITICAL when the doc blocks a pending stage exit or a closing scheduled within 5 business days; review queue is priority-ordered, not FIFO: GATE_CRITICAL first (docs gating DOCS_CLOSING → FUNDED at the top), then by deal `target_close_date` proximity, then FIFO | ACCEPTED or REJECTED recorded | PROC: GATE_CRITICAL ≤4 business hrs, all other docs ≤1 bd; UW ≤1 business day. Non-gate SLAs auto-relax per the Module 00 aggregate capacity guardrail |
| ACCEPTED | SYS | None | Pin file version; stamp `accepted_by`, `accepted_at`; re-evaluate stage gates; recompute checklist progress | Freshness breach → EXPIRED; else terminal | — |
| REJECTED | PROC | Confirm reason code; add borrower-readable note if reason = OTHER | Instantly notify borrower with reason + fix instructions; revert to REQUESTED; restart reminder cadence at day 1 | Reverted to REQUESTED | Notification ≤5 min |
| EXPIRED | SYS | None | Reopen as REQUESTED with "updated version needed" template; keep prior version linked for reference | Fresh doc ACCEPTED | Same as REQUESTED |
| WAIVED | PROC/UW | Record `waiver_reason`; UW must waive financial docs, PROC may waive others | Notify PRIN if waived doc was REQ; exclude from gates and progress bar | Terminal (revocable) | — |

**Rejection reason codes** (`rejection_reason`): ILLEGIBLE, WRONG_DOCUMENT, INCOMPLETE_PAGES, STALE_DATE, WRONG_ENTITY, WRONG_PERIOD, UNSIGNED, PASSWORD_PROTECTED, CORRUPT_FILE, OTHER (free-text note required). Each maps to a canned borrower-facing message template.

**Review tiers** (`doc_requirement.review_tier`):
- `SYS_AUTO`: e-signed portal forms (CREDIT_AUTH, ENT_BOI_CERT, SBA_1919, FORM_4506C, TERM_SHEET_SIGNED, BORROWING_BASE_CERT) and SYS-ordered third-party docs (FLOOD_CERT, UCC_SEARCH, TITLE_COMMITMENT, APPRAISAL) auto-ACCEPT on completion callback.
- `PROC_ONLY`: entity docs, IDs, insurance, contracts, licenses.
- `PROC_THEN_UW`: all §1.3 financials, PFS, TAX_RETURN_PERS, AR/AP agings, debt schedules, PROJECTIONS, REHAB_BUDGET, TRACK_RECORD, LEASES_RENT_ROLL. PROC accepts form; UW accepts substance; status shows ACCEPTED only after UW.

### 2.2 Stage-gating map

SYS blocks the pipeline transition until every listed doc is ACCEPTED (or WAIVED). The gate table is data (`stage_gate`: deal_type, to_stage, doc_codes[]), editable by PRIN only.

| Transition | Gating ACCEPTED docs (all deal types unless noted) |
|---|---|
| APPLICATION → TERM_SHEET | Universal application submitted; CREDIT_AUTH; GOV_ID; per-type supplement form submitted; HM: TRACK_RECORD; WC: BANK_STMT_BIZ or bank link connected; SBA: SBA_159 signed by applicant + Lendrock with the engagement packet (gate applies at ENGAGED → APPLICATION on the SBA pathway, Module 05 §5.5) |
| TERM_SHEET → UNDERWRITING | TERM_SHEET_SIGNED; PFS (where REQ); BANK_STMT_BIZ; HM: PURCHASE_CONTRACT or PAYOFF_DEMAND ordered, EMD_PROOF; BB/WC: TAX_RETURN_BIZ, FIN_STMT_INTERIM, DEBT_SCHEDULE_BIZ; WC borrowing-base variant only (structure_type = BORROWING_BASE): AR_AGING, AP_AGING (SBA has no TERM_SHEET stage — see the SBA rows below) |
| UNDERWRITING → APPROVED | All REQ + triggered COND docs ACCEPTED except closing-checkpoint docs (ENT_GOOD_STANDING, ENT_RESOLUTION, INS_*, PAYOFF_DEMAND refresh, VOIDED_CHECK); HM: APPRAISAL, TITLE_COMMITMENT, FLOOD_CERT; BB/WC: UCC_SEARCH |
| APPROVED → DOCS_CLOSING | ENT_GOOD_STANDING (≤30d); ENT_RESOLUTION; ENT_BOI_CERT; VOIDED_CHECK; HM: INS_PROPERTY bound, INS_FLOOD if triggered, SURVEY if triggered |
| DOCS_CLOSING → FUNDED | Executed closing package (from Closing module); SYS freshness re-check passes on BANK_STMT_BIZ, PAYOFF_DEMAND, APPRAISAL, TITLE_COMMITMENT; SBA: SBA_159 lender-countersigned (`form_159_record.status` = `SIGNED_LENDER` or `SUBMITTED_BY_LENDER` — Module 05 §5.10) on file |
| SBA: APPLICATION → LENDER_MATCHING | Full package ACCEPTED or WAIVED = "bank-ready" (SBA_1919, FORM_4506C, TAX_RETURN_PERS, TAX_RETURN_BIZ, and all other package-phase items — Module 05 §5.6); UNDERWRITING → APPROVED on the SBA pathway is the partner lender's credit approval, not a Lendrock doc gate |
| SBA: LENDER_MATCHING → SUBMITTED | `form_159_record.status` = `SIGNED_APPLICANT_AGENT` (or later) + executed packaging agreement (Module 05 §5.10); package transmission to partner banks happens here (CM owns transmission) |
| WC: SERVICING (recurring, borrowing-base lines only — structure_type = BORROWING_BASE) | BORROWING_BASE_CERT monthly; cert overdue > 5 days past `bbc_due_day` → `FRZ_BBC_OVERDUE` freeze + PROC follow-up task, owned end-to-end by Module 04 §3/§7.1 (PROC chases; SYS auto-unfreezes on signing) |

### 2.3 Data model (core tables)

```
doc_requirement: id, doc_code, display_name, category, hm_rule, bb_rule, wc_rule, sba_rule,
  condition_expr (jsonlogic), review_tier, freshness_days, freshness_checkpoint,
  investor_visible_default (bool), borrower_help_text, sample_file_url, sort_order

doc_request: id, deal_id, doc_code, status, review_tier, owner_role, assigned_user_id,
  requested_at, due_at, uploaded_at, reviewed_at, accepted_at, expired_at,
  rejection_reason, rejection_note, waiver_reason, waived_by, applies_to_party_id
  (nullable — per-guarantor docs like GOV_ID create one request per guarantor)

doc_file: id, doc_request_id, version, s3_key, original_filename, mime_type, size_bytes,
  sha256, uploaded_by_party_id, upload_channel (PORTAL|EMAIL_IN|INTERNAL|ESIGN|VENDOR_API),
  virus_scan_status (PENDING|CLEAN|INFECTED), classification_confidence,
  ocr_period_start, ocr_period_end, ocr_signed_date, ocr_entity_name, is_pinned_version
```

---

## 3. Collection UX

### 3.1 Borrower portal checklist
- Route: `portal.lendrockcapital.com/u/{magic_token}`. Single page: deal header, progress bar (`accepted_required_count / total_required_count`, WAIVED excluded), then checklist grouped by category in matrix order. Each item shows status chip (color-coded), freshness requirement in plain English ("must be dated within the last 30 days"), `borrower_help_text`, and a "see example" link (`sample_file_url`).
- Items in REJECTED-reverted state pin to top with the fix instruction. ACCEPTED items collapse. Progress bar animates on each acceptance — this is deliberately gamified; completion rate is the KPI.
- Per-guarantor docs render as separate rows ("Photo ID — Jane Smith"). A guarantor-specific magic link can be sent so co-guarantors upload their own sensitive docs without seeing each other's.
- Periodic docs (BANK_STMT_*) render as a month grid (one tile per required statement month) so borrowers see exactly which months are missing; a multi-month PDF is auto-split by detected statement periods and fills each month tile separately.

### 3.2 Passwordless magic link
- `magic_token`: 128-bit random, single-deal scope, 30-day TTL, rotated on every send; old tokens revoke on rotation. No account creation, ever.
- Upload requires only the link. Viewing/downloading previously uploaded documents or e-signing requires a 6-digit OTP to the borrower's mobile on first use per device (30-day device cookie). This keeps upload friction at zero while protecting stored financials if a link is forwarded.
- Every send (email + SMS) logs to the deal activity feed. LO/PROC can copy a fresh link from the deal screen for phone-call situations.

### 3.3 Upload mechanics
- Drag-drop multi-file, max 20 files per batch, 50 MB per file. Accepted types: pdf, jpg, jpeg, png, heic, tif, docx, xlsx, csv. HEIC → PDF conversion server-side; multi-image batches offer "combine into one PDF."
- Password-protected PDFs are detected at upload time and bounced in-UI immediately ("remove the password and re-upload") — no REJECTED cycle, no reviewer time burned; the PASSWORD_PROTECTED reason code is reserved for files that slip through via email-in.
- Mobile: `capture="environment"` camera input with client-side edge detection, de-skew, and multi-page scan-to-PDF (use a JS document-scanner lib; no native app).
- Uploads land in UPLOADED regardless of slot: borrower may upload into a specific checklist row (pre-classified) or into a "drop everything here" zone (auto-classified per §3.6).
- Email-in fallback: each deal gets `docs+{deal_id}@lendrockcapital.com`; attachments ingest with `upload_channel = EMAIL_IN` and run the same pipeline.

### 3.4 Reminder cadence (SYS)
- Trigger: any doc_request in REQUESTED. Cadence per deal (digested — one message covering all outstanding docs, never one per doc): day 1, 3, 5, 7 after request; email + SMS simultaneously; quiet hours 21:00–08:00 borrower local time (portal-wide send window 08:00–21:00, Module 10 §10.3.1); stop immediately when all outstanding docs reach UPLOADED.
- Day 7 with items still outstanding: SYS creates task `DOC_CHASE` assigned to LO (the relationship owner makes the call, not PROC), due in 1 business day, and pauses automated messages until LO logs an outcome (`resume_cadence` | `snooze_7d` | `mark_deal_stalled`). The pause is never indefinite: if no outcome is logged within 2 business days, SYS auto-resumes the reminder cadence, and an untouched `DOC_CHASE` task escalates like a gate task — PRIN notified at +24 business hours.
- SMS copy is short with the magic link; email lists the exact outstanding items. All sends templated in the Notifications engine; templates keyed by `deal_type` + `days_outstanding`.

### 3.5 E-sign
- Default vendor: Dropbox Sign embedded API (webhooks → auto-ACCEPT per `SYS_AUTO` tier). Templates maintained for: CREDIT_AUTH, ENT_BOI_CERT, ENT_RESOLUTION, FORM_4506C, SBA_1919, SBA_912, SBA_159 (drafted by the SBA module, routed through this rail), TERM_SHEET_SIGNED, PFS attestation page, BORROWING_BASE_CERT.
- Signature requests are checklist rows like any doc — same statuses, same reminders. Completed envelope PDF + certificate of completion both store as `doc_file` versions.

### 3.6 Auto-classification (SYS)
Pipeline on every upload, in order, first confident hit wins:
1. **Slot context** — uploaded from a specific checklist row → classification = that `doc_code`, confidence 1.0.
2. **Filename regex** — table of patterns per doc_code (e.g., `(?i)bank.*(stmt|statement)` → BANK_STMT_BIZ; `(?i)(operating|op).?agmt|agreement` → ENT_OPERATING_AGMT).
3. **OCR heuristics** — text of first 2 pages against keyword fingerprints ("Form 1040" → TAX_RETURN_PERS; "Statement Period" + bank name → BANK_STMT_*; "CERTIFICATE OF GOOD STANDING" → ENT_GOOD_STANDING; "ACORD" → INS_*).
4. **LLM classifier fallback** — first-2-pages text + open request list → (doc_code, confidence).
- Confidence ≥ 0.85 → file attaches to the matching open doc_request; else file lands in the deal's **Unsorted bin** with a PROC task. PROC re-slotting is one drag; every manual correction is logged as training data.
- OCR also extracts `ocr_period_start/end`, `ocr_signed_date`, `ocr_entity_name`; mismatches vs. deal data surface as warning badges in the review panel (auto-suggest STALE_DATE / WRONG_ENTITY / WRONG_PERIOD rejections — PROC confirms, never auto-rejects).

---

## 4. Storage Architecture

### 4.1 Layout, naming, versioning
- S3 (or R2), one bucket per environment. Key template:
  `deals/{deal_id}/{category}/{doc_code}/v{version}/{deal_number}_{doc_code}_{period_or_date}_v{version}.{ext}`
  Example: `deals/8f3a…/business_financials/BANK_STMT_BIZ/v2/LRC-2026-0142_BANK_STMT_BIZ_2026-05_v2.pdf`
- `deal_number` format: `LRC-{yyyy}-{seq4}`. `period_or_date`: statement period end (`yyyy-mm`) for periodic docs, signed/issue date (`yyyy-mm-dd`) otherwise, `na` if none.
- Objects are immutable; re-upload creates `v{n+1}`. ACCEPTED pins a version (`is_pinned_version`); later uploads to an ACCEPTED request require PROC to explicitly supersede (flips request to IN_REVIEW). Deletion is soft (tombstone + audit row); hard delete only via retention job or PRIN-approved purge.

### 4.2 Retention & encryption
- FUNDED deals: retain 7 years after PAID_OFF. DEAD: retain 3 years after terminal date; DECLINED: 5 years from decision (matches the APPLICATION_DECLINED class, Module 10 §10.5.4); then hard-purge borrower documents (adverse-action notice records themselves live in the Compliance module and follow its schedule). `legal_hold` flag on deal blocks all purges. Nightly retention job, purge actions written to immutable audit log.
- Encryption: SSE-KMS at rest (annual key rotation); TLS 1.2+ in transit. All access via presigned URLs, 15-minute expiry, generated only after permission check; no public objects. SSN/EIN/DOB captured by forms are field-level encrypted in Postgres (separate app-layer key), never stored in filenames or S3 metadata. Every upload virus-scans (ClamAV worker) before any presigned read URL can be issued; INFECTED files quarantine to a separate prefix and alert PROC.

### 4.3 Access permission matrix

| Capability | LO | PROC | UW | CM | PRIN | BORROWER | INVESTOR |
|---|---|---|---|---|---|---|---|
| View all deal docs | ✔ (own deals) | ✔ | ✔ | Sanitized set only | ✔ | Own uploads + own executed docs | Sanitized set only (allocated deals) |
| Upload | ✔ | ✔ | ✔ | ✖ | ✔ | ✔ (via magic link) | ✖ |
| Review/accept/reject | ✖ | ✔ (tier 1) | ✔ (tier 2) | ✖ | ✔ | ✖ | ✖ |
| Waive requirement | ✖ | ✔ (non-financial) | ✔ (any) | ✖ | ✔ | ✖ | ✖ |
| Soft delete / supersede | ✖ | ✔ | ✔ | ✖ | ✔ | ✖ | ✖ |
| Edit matrix / gates / retention | ✖ | Matrix conditions only | ✖ | ✖ | ✔ | ✖ | ✖ |

- **Sanitized set** (`investor_visible = true`, defaulted from `doc_requirement.investor_visible_default`, per-file override by UW/PRIN): APPRAISAL, TITLE_COMMITMENT, INS_*, PURCHASE_CONTRACT, REHAB_BUDGET, LEASES_RENT_ROLL, executed loan documents, FLOOD_CERT. **Never investor-visible** (hard-coded denylist, override impossible): TAX_RETURN_*, BANK_STMT_*, PFS, CREDIT_AUTH and credit reports, GOV_ID, FORM_4506C, SBA_912, anything containing SSN. CM sees the same sanitized set (CM's job is investor packaging; no need for raw PII).
- Investor downloads are watermarked server-side: "Confidential — prepared for {investor_email} — {timestamp}". All views/downloads by any role write to `doc_access_log` (who, what, when, IP).

---

## 5. Borrower-Facing Intake Forms

All forms are portal-native (mobile-first, autosave per field, resume via magic link), submit as structured data AND render a signed PDF stored as a `doc_file`. Field names below are the API/DB names.

### 5.1 Universal Loan Application (all deal types; gates NEW_LEAD data → APPLICATION)
`deal_type` (HM|BB|WC|SBA — drives supplement), `requested_amount`, `use_of_funds_summary`, `target_close_date`, `legal_business_name`, `dba_name`, `entity_type` (LLC|CORP|LP|OTHER — no SOLE_PROP option: natural-person borrowers are knocked out at intake and never reach the application, Module 01 §4.4 / Module 11 §A1 rule 3), `state_of_formation`, `date_of_formation`, `ein`, `business_address_*` (street/city/state/zip), `business_phone`, `website`, `industry_naics`, `years_in_business`, `annual_revenue`, `number_of_employees`, `referral_source` (LANDING_PAGE|BROKER|REFERRAL|EVENT|OTHER), `referral_source_detail`; guarantors[] (each: `first_name`, `last_name`, `ssn` (encrypted), `dob`, `home_address_*`, `ownership_pct`, `email`, `mobile_phone`, `us_citizen` (bool), `fico_estimate_band`); consents: `esign_consent`, `credit_pull_consent`, `tcpa_sms_consent`, `business_purpose_certification` (all required checkboxes, timestamped + IP-stamped).

### 5.2 HM Supplement — Property & Rehab Budget
`property_address_*`, `property_type` (SFR|MULTI_2_4|MULTI_5PLUS|MIXED_USE|COMMERCIAL|LAND — canonical enum, Module 09 §9.2.2), `loan_purpose` (PURCHASE|REFI|CASH_OUT_REFI|GROUND_UP), `purchase_price`, `current_lien_balance`, `as_is_value_estimate`, `arv_estimate`, `rehab_budget_total`, `exit_strategy` (SELL|REFI_PERM|HOLD_RENT), `projected_hold_months`, `occupancy_status` (VACANT|TENANT|OWNER_NA), `projects_completed_36mo`, `gc_relationship` (SELF_GC|THIRD_PARTY_GC|NONE); rehab_line_items[] (`category` enum: DEMO|FOUNDATION|FRAMING|ROOF|PLUMBING|ELECTRICAL|HVAC|KITCHEN|BATH|FLOORING|EXTERIOR|LANDSCAPING|PERMITS|CONTINGENCY|OTHER, `description`, `cost`); SYS validates `sum(cost) == rehab_budget_total`.

### 5.3 BB Supplement — Use of Funds
`loan_purpose_detail` (min 200 chars), `use_of_funds_items[]` (`purpose` enum: INVENTORY|EQUIPMENT|EXPANSION|REFI_DEBT|ACQUISITION|MARKETING|PAYROLL_BRIDGE|OTHER, `amount`), `requested_term_months`, `collateral_offered[]` (`collateral_type` enum: REAL_ESTATE|EQUIPMENT|AR|INVENTORY|BLANKET_UCC|NONE, `description`, `estimated_value`, `existing_liens` bool), `monthly_revenue_avg_6mo`, `monthly_debt_service_current`, `seasonal_business` (bool + `peak_months`).

### 5.4 WC Supplement — Banking
`requested_line_amount`, `primary_operating_bank`, `bank_link_consent` (Plaid connect — **default path**; manual statement upload is the fallback and adds BANK_STMT_BIZ requests), `avg_daily_balance_3mo`, `monthly_deposits_avg_3mo`, `nsf_count_90d`, `existing_locs[]` (`lender`, `limit`, `drawn`, `expiry`), `ar_total_outstanding`, `ar_concentration_top_customer_pct`, `accounting_system` (QUICKBOOKS|XERO|NETSUITE|OTHER|NONE) + optional accounting OAuth link (auto-generates AR_AGING/AP_AGING).

### 5.5 SBA Supplement — Package Intake
`sba_program_pref` (7A|504|EXPRESS|UNSURE — LO confirms), `business_acquisition` (bool → BIZ_PURCHASE_AGMT, BIZ_VALUATION conditions), `franchise` (bool → FRANCHISE_AGMT), `premises` (OWNED|LEASED → PREMISES_LEASE), `equity_injection_amount`, `equity_injection_source` (SAVINGS|GIFT|HELOC|INVESTOR|OTHER), `startup` (bool → BUSINESS_PLAN, PROJECTIONS), 1919 character questions (`q_criminal_history`, `q_pending_charges`, `q_prior_government_debt_default`, `q_prior_sba_loan`, each bool + detail text on true → SBA_912 condition), affiliates[] (`entity_name`, `ownership_pct`, `naics`).

### 5.6a Personal Financial Statement (per guarantor; SBA renders as Form 413)
`as_of_date`; assets: `cash_in_banks`, `brokerage_accounts`, `retirement_accounts`, `life_insurance_cash_value`, `real_estate_owned[]` (`address`, `market_value`, `mortgage_balance`, `monthly_payment`, `monthly_rent_income`), `vehicles_value`, `business_ownership_value`, `notes_receivable`, `other_assets[]` (`description`, `value`); liabilities: `credit_card_debt`, `auto_loans`, `student_loans`, `mortgage_debt_total` (SYS-derived), `notes_payable[]` (`creditor`, `balance`, `monthly_payment`), `taxes_owed`, `other_liabilities[]`; income: `salary_annual`, `business_income_annual`, `rental_income_annual`, `other_income_annual`; `contingent_liabilities[]` (`description`, `amount`, includes guarantees on other loans); SYS computes `total_assets`, `total_liabilities`, `net_worth`, `total_annual_income`; e-sign attestation page.

### 5.6b Business Debt Schedule
Rows[]: `creditor_name`, `debt_type` (TERM_LOAN|LOC|MCA|EQUIPMENT|CC|MORTGAGE|OTHER), `original_amount`, `origination_date`, `current_balance`, `interest_rate`, `monthly_payment`, `maturity_date`, `collateral_description`, `personal_guarantee` (bool), `payment_status` (CURRENT|PAST_DUE_30|PAST_DUE_60_PLUS), `to_be_refinanced_by_this_loan` (bool → generates PAYOFF_LETTER_DEBT request per checked row). SYS totals balance and monthly payment; feeds Underwriting DSCR calc directly — this form is why the debt schedule is structured data, not an upload.

### 5.7 AR Aging Template (WC; conditional BB/SBA)
Preferred: auto-pull from accounting OAuth (§5.4). Manual path: downloadable XLSX template with locked headers — `customer_name`, `invoice_count`, `total_due`, `current_0_30`, `days_31_60`, `days_61_90`, `days_90_plus`, `notes` — uploaded file is parsed and validated (`sum(buckets) == total_due` per row); parse failures reject with INCOMPLETE_PAGES-style guidance. `as_of_date` required on upload. Same template pattern for AP aging.

---

## Interfaces with other modules

- **Pipeline/Deal Engine:** consumes `stage_gate` evaluations (this module blocks/permits stage transitions); deal `target_close_date` drives freshness EXPIRED logic; deal_type + application data evaluate CONDITIONAL rules.
- **Lead Intake/CRM:** provides borrower/guarantor contact records and `referral_source`; universal application submission is the CONTACTED/QUALIFIED → APPLICATION trigger.
- **Underwriting:** receives structured data (PFS, debt schedule, AR aging, rehab budget, OCR-extracted bank statement metrics) for credit memo auto-population; UW acts as tier-2 reviewer inside this module's queues.
- **Term Sheet/Closing & Funding:** TERM_SHEET_SIGNED and executed closing package flow through this module's e-sign rail and storage; closing module reads the pinned ACCEPTED versions for the funding package; wire/ACH details sourced from VOIDED_CHECK.
- **Investor Portal (CM):** serves only `investor_visible` sanitized docs with watermarking; CM assembles investor packages from the same sanitized view.
- **Notifications Engine:** executes all reminder cadences, rejection notices, and magic-link sends from templates owned here.
- **Servicing:** recurring requirements (BORROWING_BASE_CERT monthly for WC borrowing-base lines only, INS_PROPERTY renewals at T-30) are doc_requests with `freshness_checkpoint = RECURRING`; missed WC certs signal draw freeze.
- **Compliance/Audit:** `doc_access_log`, waiver log, retention/purge events, and adverse-action-related retention holds are exposed to the compliance module; DECLINED deals trigger its adverse-action workflow while this module enforces the shared retention schedule (Module 10 §10.5.4: DECLINED + adverse-action file 5 years; DEAD 3 years).
- **Task Engine:** DOC_CHASE (LO), Unsorted-bin triage (PROC), and review-queue SLAs surface as tasks with the standard one-owner rule.
# Module 07 — Investor Management

Lendrock funds HM, BB, and WC deals with a blend of balance-sheet capital and private investor participations; SBA deals are referral-only and **never** touch investor capital. This module is the system of record for investors (identity, accreditation, KYC/OFAC, banking, preferences, documents), runs the onboarding pipeline to ACTIVE, auto-matches investor capital to deals and manages the participation lifecycle from soft commit through repayment, powers the investor-facing portal surface (dashboard, per-deal tracker, statements, tax docs), gives CM a real-time capital utilization and forecast view, and executes interest distributions triggered by servicing payment events. Ownership is strict: CM owns every human step in this module, PRIN approves overrides, SYS does everything else. Money follows the platform convention — integer cents in `*_cents` columns (Module 09 §9.1; amount fields below are logical names) — rates as basis points (int `*_bps`), interest convention **actual/360** matching loan notes.

---

## 1. Investor Record Data Model

### 1.1 `investors` (core table)

| Field | Type | Notes |
|---|---|---|
| `investor_id` | uuid PK | |
| `investor_number` | string, unique | Human-readable `INV-0001`, SYS-assigned |
| `investor_type` | enum | `INDIVIDUAL` \| `ENTITY` |
| `status` | enum | `PROSPECT` → `ONBOARDING` → `ACTIVE` → `INACTIVE` (machine in 1.7) |
| `status_reason` | string, nullable | Required on move to `INACTIVE` (`DORMANT_12MO`, `REQUESTED_EXIT`, `ACCREDITATION_LAPSED`, `COMPLIANCE`) |
| `compliance_hold` | boolean | SYS-set on OFAC hit or lapsed accreditation, paired with `compliance_hold_reason` (`OFAC` \| `ACCREDITATION`); blocks new allocations/commits in both cases without changing `status`, but **only `OFAC` freezes outbound payments** — accreditation governs new offers/sales, never distributions on existing holdings (§1.3, §6.2) |
| `legal_name` | string | Person full legal name or entity legal name, exactly as on W-9 |
| `display_name` | string | Portal display; defaults to `legal_name` |
| `entity_type` | enum, nullable | `LLC` \| `LP` \| `CORP` \| `TRUST` \| `IRA` \| `SD_401K`; required when `investor_type = ENTITY` |
| `tax_id_last4` | string(4) | Full TIN lives only in the encrypted W-9 vault record, never in this table |
| `tax_id_type` | enum | `SSN` \| `EIN` |
| `state_of_formation` | string(2), nullable | Entity only |
| `signatory_name` / `signatory_title` | string, nullable | Entity only — authorized signer on all envelopes |
| `email` | string, unique | Portal login identity |
| `phone` | string | E.164 |
| `mailing_address_*` | strings | `street`, `street2`, `city`, `state`, `zip` |
| `source` | enum | `REFERRAL` \| `EXISTING_NETWORK` \| `EVENT` \| `BROKER` \| `WEBSITE` \| `BORROWER_CONVERT` \| `OTHER` |
| `source_detail` | string, nullable | Referrer name, event name |
| `relationship_owner` | enum | Always `CM` at launch; field exists so a second CM hire is config, not migration |
| `capital_available` | decimal(14,2) | Self-reported deployable capital; staleness rules in 5.1 |
| `capital_available_updated_at` | timestamp | SYS flags stale after 60 days |
| `notes` | text | Internal only; never rendered in investor portal |
| `invited_at` / `activated_at` / `deactivated_at` | timestamps | |
| `created_at` / `updated_at` | timestamps | |

### 1.2 `investor_banking`

One `is_active = true` row per investor; history retained.

| Field | Type | Notes |
|---|---|---|
| `banking_id` | uuid PK | |
| `investor_id` | uuid FK | |
| `verification_method` | enum | `PLAID` \| `MICRO_DEPOSIT` \| `MANUAL_DOCUMENT` (voided check + CM review) |
| `plaid_item_id` / `plaid_account_id` | string, nullable | When `PLAID` |
| `bank_name` | string | |
| `account_type` | enum | `CHECKING` \| `SAVINGS` |
| `routing_number` | string | Field-level encrypted (KMS) |
| `account_number` | string | Field-level encrypted (KMS); masked `••••1234` everywhere including internal UI |
| `account_holder_name` | string | SYS flags mismatch vs `legal_name` for CM review |
| `verification_status` | enum | `PENDING` → `VERIFIED` \| `FAILED` |
| `is_active` | boolean | |

**Default:** Plaid Auth primary. Micro-deposit fallback (two deposits, investor confirms amounts in portal, 3 attempts max). `MANUAL_DOCUMENT` requires an explicit CM approval click and is discouraged.

### 1.3 Accreditation — `investor_accreditations` (append-only; latest non-expired row governs)

| Field | Type | Notes |
|---|---|---|
| `accreditation_id` | uuid PK | |
| `investor_id` | uuid FK | |
| `accreditation_status` | enum | `NOT_STARTED` \| `PENDING_REVIEW` \| `VERIFIED` \| `EXPIRED` \| `REJECTED` |
| `verification_method` | enum | `SELF_CERT_506B` \| `THIRD_PARTY_LETTER_506C` |
| `accreditation_basis` | enum | `INCOME` \| `NET_WORTH` \| `LICENSE_HOLDER` (Series 7/65/82) \| `ENTITY_5M_ASSETS` \| `ENTITY_ALL_ACCREDITED_OWNERS` |
| `verified_at` | timestamp | |
| `expires_at` | timestamp | SYS-computed from method (rules below) |
| `letter_document_id` | uuid FK, nullable | Required for `THIRD_PARTY_LETTER_506C` |
| `verifier_name` / `verifier_type` | string / enum, nullable | `CPA` \| `ATTORNEY` \| `RIA` \| `BROKER_DEALER` \| `PLATFORM` (e.g., VerifyInvestor) |
| `reviewed_by` | enum | `SYS` for self-cert auto-verify; `CM` for letters |

**Rules (defaults; confirm with securities counsel — see open questions):**
- Default posture is **Reg D 506(b)**: no general solicitation of specific deal terms; investors self-certify via in-portal questionnaire (`SELF_CERT_506B`). `expires_at = verified_at + 365 days`; SYS renewal reminders at 45/21/7 days before expiry (shared ladder, Module 10 §10.5.6).
- Each deal carries `offering_exemption` (`506B` default \| `506C`). On a `506C` deal, every participant must hold a `THIRD_PARTY_LETTER_506C` dated within **90 days** of participation signing (`expires_at = letter_date + 90 days`). SYS blocks soft commits on 506(c) deals for investors without a valid letter.
- An investor cannot reach `ACTIVE` without at least a valid self-cert. Lapse → SYS sets `compliance_hold = true` with `compliance_hold_reason = ACCREDITATION` — this blocks **new allocations/commits only**; distribution lines on existing participations are **never** held for an accreditation lapse (accreditation governs new offers and sales, not payments on existing holdings — §6.2). Unresolved 30 days after expiry → `INACTIVE` with `status_reason = ACCREDITATION_LAPSED`.

### 1.4 Preferences — `investor_preferences` (1:1 with investor; drives matching in 3.2)

Empty array = "all".

| Field | Type | Default |
|---|---|---|
| `deal_types` | enum[] | `[HM, BB, WC]` — SBA never allocatable |
| `states` | string(2)[] | `[]` (nationwide) |
| `min_check_size` | decimal(14,2) | 25,000.00 (also platform floor) |
| `max_check_size` | decimal(14,2) | Required at onboarding |
| `target_yield_bps` | int | 900 — deals priced below investor's floor are not auto-matched |
| `max_ltv_bps` | int | 7500 — applies to HM and secured BB; ignored for unsecured/WC |
| `term_min_months` / `term_max_months` | int | 3 / 36 |
| `lien_positions` | enum[] | `[FIRST]`; options `FIRST` \| `SECOND` \| `UNSECURED` |
| `auto_match_enabled` | boolean | true — false means CM must manually add investor to teaser lists |
| `notification_channel` | enum | `EMAIL` \| `EMAIL_AND_SMS` (default `EMAIL`) |

### 1.5 KYC / OFAC — `investor_screenings` (append-only)

| Field | Type | Notes |
|---|---|---|
| `screening_id` | uuid PK | |
| `investor_id` | uuid FK | |
| `screening_type` | enum | `KYC_IDENTITY` (individuals) \| `KYB_ENTITY` \| `OFAC_SDN` |
| `provider` | string | Default **Persona** for all three (identity, KYB, watchlist) |
| `result` | enum | `PASSED` \| `FAILED` \| `MANUAL_REVIEW` |
| `provider_ref` | string | Provider inquiry/report id |
| `screened_at` | timestamp | |

Rules: KYC/KYB runs during onboarding and re-runs on legal-name or banking change. SYS re-screens **all `ACTIVE` investors against OFAC monthly** (cron, 1st of month). `FAILED`/`MANUAL_REVIEW` OFAC → `compliance_hold = true` with `compliance_hold_reason = OFAC`, CM + PRIN notified, new allocations and distributions to that investor frozen until PRIN clears in-app (logged) — the OFAC reason is the only trigger that holds distribution lines (§1.3, §6.2).

### 1.6 Documents — `investor_documents`

| Field | Type | Notes |
|---|---|---|
| `document_id` | uuid PK | |
| `investor_id` | uuid FK | |
| `document_type` | enum | `W9` \| `PARTICIPATION_MASTER_AGREEMENT` \| `PARTICIPATION_CERTIFICATE` \| `ACCREDITATION_LETTER` \| `ENTITY_FORMATION_DOCS` \| `OPERATING_AGREEMENT` \| `TRUST_CERT` \| `VOIDED_CHECK` \| `STATEMENT` \| `TAX_1099INT` \| `OTHER` |
| `storage_key` | string | Shared vault with Documents module, prefix `investors/` |
| `esign_envelope_id` | string, nullable | Dropbox Sign envelope id for signed docs |
| `status` | enum | `PENDING` \| `SIGNED` \| `ON_FILE` \| `EXPIRED` |
| `effective_date` / `expiry_date` | date, nullable | Master agreement is evergreen (no expiry) |
| `uploaded_by` | enum | `SYS` \| `CM` \| `INVESTOR` |

**Master agreement design:** ONE evergreen **Participation Master Agreement** signed at onboarding governs all future participations; each deal then needs only a 2-page **Participation Certificate** (deal terms, amount, rate). This is what makes per-deal docs a same-day step and 72-hour raises possible.

### 1.7 Status machine

`PROSPECT → ONBOARDING → ACTIVE ⇄ INACTIVE`

- `PROSPECT`: record exists (CM manual add or referral capture); no portal access.
- `ONBOARDING`: invite accepted, wizard in progress.
- `ACTIVE`: all onboarding exit criteria met (section 2); eligible for matching.
- `INACTIVE`: CM-set (opt-out, dormant 12+ months) or SYS-set (accreditation lapse per 1.3). Keeps read-only portal access to historical positions, statements, and tax docs; existing participations continue to distribute. Reactivation: CM moves to `ONBOARDING` if accreditation/banking stale, else directly to `ACTIVE` (logged).
- `compliance_hold` is orthogonal and always wins for new money movement.

---

## 2. Onboarding Flow

Trigger: CM creates the `PROSPECT` and clicks **Send Invite**, or a personal referral link auto-creates a `PROSPECT` and queues CM approval. No public self-serve signup (consistent with 506(b) posture).

| Stage | Owner | Required actions | Automations (SYS) | Exit criteria | Target SLA |
|---|---|---|---|---|---|
| INVITE | CM | Approve/send invite with unique magic link (7-day expiry) | Templated invite email; reminder at 72h; expire + notify CM at 7d | Investor sets credentials (passkey preferred), accepts ToS + e-delivery consent | 7 days |
| PROFILE_WIZARD | CM | Review flagged mismatches only | Resumable multi-step wizard collects 1.1 identity fields (entity branch uploads formation docs), preferences (1.4), `capital_available`; runs Persona KYC/KYB + OFAC inline; W-9 captured as in-wizard e-form rendered to signed PDF | Required fields complete; KYC/KYB + OFAC `PASSED` (or CM cleared `MANUAL_REVIEW`); W-9 `ON_FILE` | 2 business days from invite acceptance |
| ACCREDITATION | CM | Review 506(c) letters within 1 business day of upload | Serve self-cert questionnaire (auto-verify on pass) or letter-upload flow routed to CM queue; set `expires_at`; schedule renewal reminders | `accreditation_status = VERIFIED` | Same day (self-cert) / 3 business days (letter) |
| MASTER_AGREEMENT | CM | Countersign envelope | Generate Participation Master Agreement from template with merged investor data; Dropbox Sign envelope; nudges at 48h/96h; file signed PDF | Envelope `SIGNED` by both parties | 4 business days |
| BANKING | CM | Approve `MANUAL_DOCUMENT` fallback cases only | Plaid Link in portal; micro-deposit fallback orchestration; name-match check vs `legal_name` | `investor_banking.verification_status = VERIFIED` | 2 business days |
| ACTIVATION | SYS | — | Flip `status = ACTIVE`, stamp `activated_at`; welcome email with portal tour + any currently open teasers matching preferences; add row to CM utilization dashboard | `status = ACTIVE` | Instant |

ACCREDITATION, MASTER_AGREEMENT, and BANKING run **in parallel** after PROFILE_WIZARD; ACTIVATION fires when all three complete. SYS sends "resume onboarding" nudge after 48h idle at any step. End-to-end target: **invite → ACTIVE in 7 calendar days**.

---

## 3. Deal Allocation

### 3.1 `participations` data model

| Field | Type | Notes |
|---|---|---|
| `participation_id` | uuid PK | |
| `deal_id` | uuid FK | Deals module; only `HM`/`BB`/`WC` allocatable |
| `investor_id` | uuid FK | |
| `status` | enum | `SOFT_COMMIT` → `DOCS_OUT` → `SIGNED` → `WIRED` → `ACTIVE` → `REPAID`; terminals `WITHDRAWN` (investor backed out pre-wire) and `CANCELLED` (SYS-set when deal goes `DEAD`/`DECLINED`; if funds already landed, the return-of-funds flow below §3.2 fires) |
| `committed_amount` | decimal(14,2) | Set at soft commit; CM may trim before `DOCS_OUT` |
| `funded_amount` | decimal(14,2) | Confirmed wire amount; must equal `committed_amount` unless CM records partial + reason code |
| `pricing_type` | enum | `FIXED_RATE` (default) \| `SPREAD` |
| `investor_rate_bps` | int | Investor's fixed annual yield on funded principal (`FIXED_RATE`) |
| `spread_bps` | int, nullable | Deduction from borrower note rate (`SPREAD`; used for WC revolvers with floating borrower rates) |
| `position` | enum | `PARI_PASSU` — default and only class at launch; `SENIOR_A` / `SUB_B` reserved for future structuring |
| `pct_of_deal` | decimal(7,4) | SYS: `funded_amount / deal_total_principal`; recomputed for WC as the line draws/repays |
| `commit_window_expires_at` | timestamp | 48h soft-commit hold |
| `esign_envelope_id` | string | Participation Certificate envelope |
| `expected_wire_by` | date | Signing + 2 business days |
| `wire_reference` | string | `LRC-{deal_number}-{investor_number}` — investor-visible, used for bank-feed auto-match |
| `soft_commit_at` / `docs_out_at` / `signed_at` / `wired_at` / `activated_at` / `repaid_at` | timestamps | Full audit trail |

**Pricing default:** CM sets ONE `investor_rate_bps` per deal from the house rate sheet — all participants in a deal get the same rate; no bespoke per-investor negotiation at launch. Lendrock's margin = borrower rate − investor rate = **servicing spread**, retained automatically in the distribution waterfall (section 6).

### 3.2 Allocation workflow

Trigger: deal enters `APPROVED`. (CM may open "early syndication" at `TERM_SHEET` per deal; default off.)

| Stage | Owner | Required actions | Automations (SYS) | Exit criteria | Target SLA |
|---|---|---|---|---|---|
| MATCH | SYS | — | Filter: `ACTIVE`, no `compliance_hold`, valid accreditation (506(c) letter if deal is `506C`), preference fit on deal_type/state/yield/LTV/term/lien, headroom > 0. Rank by (1) preference fit score, (2) longest time since last allocation (rotation fairness), (3) waitlist priority carryover (3.3). Write `deal_match_list`; notify CM | Match list generated | Instant on deal `APPROVED` |
| TEASER | CM | Review list (add/remove rows), click **Send Teaser** | Render templated teaser (anonymized borrower; deal type, open participation amount, `investor_rate_bps`, term, LTV, lien position, collateral summary, expected close date) as portal card + email with **Commit** CTA; log every send for exemption evidence | Teaser sent to ≥ 1 investor | 4 business hours from match |
| SOFT_COMMIT | CM | Approve any commit that trips a concentration flag (5.3) | Portal commit flow: amount ≥ $25,000, $5,000 increments, capped at min(`max_check_size`, remaining unfilled). **Default rule: first-come-first-served** by commit timestamp until 100% filled; each commit holds 48h pending docs; live fill thermometer; auto-close at fill or at `commitment_deadline` (72h after teaser) | Fill = 100% of open amount, or deadline reached | 72 hours |
| DOCS_OUT | SYS | CM countersigns certificates | Generate Participation Certificate per commit; Dropbox Sign envelope; nudges at 24h/48h; unsigned at 72h → auto-`WITHDRAWN`, amount released, CM notified to backfill from waitlist | All certificates `SIGNED` | 48 hours |
| WIRE | CM | Resolve unmatched/short wires | Wire instructions issued on signing (funding account + `wire_reference`); bank-feed webhook auto-matches amount + reference → `WIRED`; **on match SYS immediately emails the investor + posts a portal event: "funds received — expected deal funding {expected_close_date}"**, and auto-sends a delay notice with the new date whenever `expected_close_date` slips while any participation sits `WIRED`; reminder at `expected_wire_by`, CM escalation at +1 day | All participations `WIRED`; total received = participation target | 2 business days from signing |
| CONFIRM | SYS | — | On deal `FUNDED` (Servicing event): flip participations `ACTIVE`, start accrual clocks at deal funding date, send funding confirmation with final position summary, decrement each investor's `capital_available` by `funded_amount` | All participations `ACTIVE` | Instant on deal funding |

**Return of funds on cancellation.** When a deal goes `DEAD`/`DECLINED` after any participation is `WIRED` (or later, pre-`ACTIVE`), SYS sets it `CANCELLED`, immediately notifies the investor (email + portal event: deal cancelled, funds being returned), and opens a blocking CM task to initiate an outbound `RETURN_OF_FUNDS_OUT` Transaction (Module 09 §9.2.4) back to the investor's verified account on file, under standard dual control and wire-verification rules (Module 09 §9.5 #14) — **SLA 2 business days from cancellation**. Settlement auto-matches via the Plaid feed; on settlement SYS restores the investor's `capital_available` and sends a return confirmation. Any return not settled by day 3 escalates to PRIN.

### 3.3 Oversubscription

- FCFS stops accepting at 100%, so overshoot only happens on the boundary commit: SYS auto-trims the final commit to the exact remainder; if the trim would breach the $25k floor, the commit is rejected and the next investor in line is offered the remainder.
- Excess demand after fill → ordered **waitlist** (`deal_waitlist` rows); auto-promotion on any `WITHDRAWN`.
- Waitlisted investors carry a +1 rank-tier boost into the next matching deal's MATCH stage — the fairness release valve that keeps FCFS palatable.

### 3.4 Undersubscription and Lendrock co-invest

- Lendrock **co-invests 10% of every deal's principal** from balance sheet (alignment; stated in the teaser). Open-to-participation amount = 90% of principal by default.
- If undersubscribed at `commitment_deadline`: (1) SYS widens matching (−50bps yield-floor tolerance, next rotation tier) and CM re-teasers the widened list for 48h; (2) remaining gap absorbed by balance sheet up to the deal's `max_coinvest_pct` (default **35%**; above that requires PRIN in-app approval); (3) still short → blocking task on the deal for CM/PRIN: delay closing, downsize, or kill.
- Lendrock's house position is a normal `participations` row under reserved `INV-0000` (`investor_type = ENTITY`), so deal math, waterfalls, and reporting use one code path; house rows are exempt from concentration checks and skipped in ACH batches.

---

## 4. Investor Portal (investor-facing surface)

Same portal app, `investor` role; row-level scoping to own records only. Figures are cash-basis unless labeled accrued.

### 4.1 Dashboard

- `total_committed` — Σ `committed_amount`, statuses `SOFT_COMMIT`..`ACTIVE`.
- `total_deployed` — Σ `funded_amount`, status `ACTIVE`.
- `capital_available` — inline-editable (writes `capital_available_updated_at`).
- `blended_yield_bps` — deployed-weighted average `investor_rate_bps` across `ACTIVE`.
- `interest_paid_ytd` and `lifetime_interest_paid`.
- `upcoming_maturities` — next 90 days: deal, principal, maturity date, expected payoff proceeds.
- Open teasers matched to them, with Commit CTA and fill thermometer.
- Action-needed strip: unsigned docs, pending wires, accreditation renewal, stale `capital_available` (> 60 days).

### 4.2 Per-deal tracker (one page per participation)

- Header: deal number, deal-type badge (HM/BB/WC), state, lien position, investor-safe status chip — `PENDING_FUNDING` \| `ACTIVE` \| `PAST_MATURITY` \| `PAID_OFF` \| `IN_DEFAULT`. Investors never see internal pipeline stage names.
- Position: `committed_amount`, `funded_amount`, `funded_date`, `investor_rate_bps`, `pct_of_deal`, `term_months`, `maturity_date`.
- Economics: `accrued_interest_to_date` (daily SYS accrual, actual/360), `interest_paid_to_date`, `next_expected_distribution` (date + amount), `expected_total_return`, `principal_outstanding` (moves for WC revolvers and amortizing BB).
- Distribution history table (date, period, type, amount, status).
- Documents: signed Participation Certificate, deal teaser, statements filtered to this deal. **Never shown:** borrower identity, credit file, internal UW memo.
- Delinquency: borrower ≥ 15 days past due → SYS posts a neutral templated status note ("payment delayed; servicing engaged"); no ad-hoc CM messaging required.

### 4.3 Monthly statements

- SYS generates per-investor PDFs (template `INV_STATEMENT`, Module 08 registry) by the **5th calendar day** for the prior month: opening balances, per-deal accrual and payment lines (fed from `distribution_lines`), principal events (fundings, paydowns, payoffs), closing balances, blended yield.
- Stored as `investor_documents` (`STATEMENT`), Statements tab + email notification with portal deep link (links only, no attachments).

### 4.4 Year-end tax documents

- Participation interest → **1099-INT** per investor (TIN pulled from W-9 vault). SYS builds the 1099 data file by **Jan 15**; CM reviews and files via Tax1099 export; recipient copies delivered in-portal (`TAX_1099INT`) by **Jan 31**. E-delivery consent captured at INVITE (ToS bundle).
- Corrections: CM edits → SYS regenerates, versions the document, notifies the investor.

---

## 5. Internal Capital Utilization Dashboard (CM-facing)

### 5.1 Per-investor rows

Columns: investor, status chips (`ACTIVE`, `compliance_hold`, accreditation days-to-expiry), `capital_available` (staleness badge > 60 days; SYS emails the investor a refresh prompt quarterly), `committed_not_wired` (Σ committed in `SOFT_COMMIT`/`DOCS_OUT`/`SIGNED`), `deployed` (Σ funded in `ACTIVE`), `headroom = capital_available − committed_not_wired`, last allocation date, preference chips. Default sort: headroom desc. Row click → investor detail.

### 5.2 Aggregate dry powder

- `total_dry_powder` = Σ headroom over `ACTIVE`, non-held investors.
- **By deal-type appetite:** an investor's headroom counts toward every deal type in their `deal_types` — overlapping buckets, labeled "capital reachable by HM deals" (not partitioned sums).
- Secondary cuts: state coverage, lien-position appetite, yield-floor bands (capital requiring ≥ 10%, ≥ 9%, ...).

### 5.3 Concentration flags (SYS-evaluated on every commit and nightly; logged to `concentration_events` with overrider + reason)

- **Investor-in-deal:** outside investor > **40%** of a deal's principal → soft flag (CM click-approve required); > **60%** → hard block, PRIN in-app override required. `INV-0000` exempt.
- **Deal-in-investor:** a single deal > **25%** of (investor's deployed + this commit) → soft flag to CM **and** a suitability notice rendered to the investor in the commit flow ("this would be N% of your capital deployed with Lendrock").

### 5.4 Pipeline-vs-capital forecast

- Input: Deals pipeline — deals in `TERM_SHEET`/`UNDERWRITING`/`APPROVED`/`DOCS_CLOSING` with `expected_close_date` inside the horizon (default **45 days**; 30/60/90 selectable).
- `probability_weighted_need` per deal = (principal × 90% outside share) × stage probability (shared `stage_probability` config with the revenue forecast, Module 10 §10.1.7) — `TERM_SHEET` 50%, `UNDERWRITING` 65%, `APPROVED` 85%, `DOCS_CLOSING` 95%.
- Chart: weekly buckets of weighted need vs **appetite-matched** dry powder (per-deal preference filtering, not gross).
- SYS alerts: CM when any weekly bucket coverage < **125%** (raise-capital trigger); PRIN when < 100%. Inverse alert: dry powder idle > 45 days with no matching pipeline → CM prompt to adjust sourcing or investor expectations.

---

## 6. Interest Distribution Workflow (tied to Servicing)

Cash-basis: investors are paid only from **collected** borrower payments, batched monthly. Accruals display continuously; cash moves on the batch date.

### 6.1 Data model

`distributions` (one per batch): `distribution_id`, `period_start`, `period_end`, `run_date`, `status` (`DRAFT` → `CM_APPROVED` → `ACH_SUBMITTED` → `SETTLED` \| `PARTIAL_FAILED`), `total_amount`, `ach_batch_ref`.

`distribution_lines`: `line_id`, `distribution_id`, `participation_id`, `investor_id`, `line_type` (`INTEREST` \| `PRINCIPAL_RETURN` \| `DEFAULT_INTEREST_SHARE` \| `ADJUSTMENT`), `amount`, `period_days`, `rate_bps_applied`, `source_payment_ids` (uuid[] → Servicing payment records), `status` (`PENDING` → `SENT` → `SETTLED` \| `RETURNED` \| `HELD`), `ach_trace_number`.

### 6.2 Flow

| Stage | Owner | Required actions | Automations (SYS) | Exit criteria | Target SLA |
|---|---|---|---|---|---|
| ACCRUE | SYS | — | Daily 02:00 job: per `ACTIVE` participation accrue `funded_amount × investor_rate_bps/10000 / 360` per day (actual/360); WC revolvers accrue on daily drawn balance at borrower rate − `spread_bps` | Continuous | Daily |
| COLLECT | SYS | — | Servicing emits `payment.received` (borrower payment cleared); SYS tags collected interest/principal to the deal capital ledger | Continuous | Event-driven |
| COMPUTE | SYS | — | **8th of month**: build `DRAFT` distribution for prior calendar month. Per participation: payout = min(accrued unpaid interest, pro-rata share of collected interest); shortfalls from partial borrower payments allocated pro-rata by accrued amounts, unpaid accrual carries forward. Lendrock servicing spread = collected interest − Σ investor lines (house `INV-0000` line auto-generated, excluded from ACH). Collected principal (payoffs/paydowns) → `PRINCIPAL_RETURN` lines by `pct_of_deal` in the same batch; full payoff flips participation `REPAID` and restores investor `capital_available` | `DRAFT` with full line detail | 8th, 06:00 |
| APPROVE | CM | Review exception report (shortfalls, `HELD` lines, prior ACH returns); click **Approve batch**. Batches > $250,000 require PRIN co-approval | Diff vs prior month; anomaly highlights (line ± 25% vs trailing 3-month avg) | `CM_APPROVED` | 9th EOD |
| PAY | SYS | — | **10th**: submit batch ACH credits via banking provider (default **Dwolla** API — shared ACH rail, Module 09 §9.5 #13; NACHA file export as fallback); lines marked `HELD` **only** for `compliance_hold_reason = OFAC` or unverified banking — an accreditation-lapse hold never holds distribution lines (§1.3) — CM notified; write `ach_trace_number` per line | `ACH_SUBMITTED` | 10th |
| SETTLE | SYS | CM dispositions `RETURNED` items (bad account auto-triggers banking re-verification for that investor) | Settlement webhooks update line + batch status; emit statement line items (feeds 4.3); portal + email payment notifications with per-deal breakdown | `SETTLED` (or `PARTIAL_FAILED` with all returns dispositioned) | Settlement + 2 business days |

**Default-interest / late-fee policy:** borrower default-rate uplift, when collected, is split **50/50** with investors (`DEFAULT_INTEREST_SHARE` lines); ordinary late fees are retained 100% by Lendrock as servicer. Constants: `default_interest_investor_share_pct = 50`, `late_fee_investor_share_pct = 0`.

---

## Interfaces with other modules

- **Deals/Pipeline module:** consumes stage events (`APPROVED` opens allocation; `DEAD`/`DECLINED` cancels participations; `FUNDED` activates them); reads deal_type, principal, `borrower_rate_bps`, LTV, term, state, lien position, `expected_close_date` for matching and forecasting; writes `participation_fill_pct` back to the deal as a funding-readiness gate before DOCS_CLOSING can complete.
- **Servicing module:** subscribes to `payment.received`, payoff, and delinquency events (drives section 6 distributions and 4.2 status notes); publishes `participation.repaid` so servicing closes the deal capital ledger.
- **Documents/E-sign module:** shared document vault and Dropbox Sign integration for master agreements, participation certificates, W-9s, statements, 1099s.
- **Communications module:** all templated sends (invites, teasers, nudges, payment notices, renewal reminders) route through the shared template + send-log service.
- **Compliance/Audit module:** OFAC screening records, concentration override log, teaser send log (exemption evidence), e-consent records.
- **Auth/Users module:** `investor` role scoping for the investor surface; CM/PRIN role gates on overrides and batch approvals.
- **Reporting module:** dry powder, deployment, blended yield, and forecast metrics feed the firm-wide KPI dashboard.
# Module 08 — Templates and Standardized Forms Library

Every document, form, email, and SMS that leaves the Lendrock portal is generated from a version-controlled template in this library — no one drafts deal documents in Word, and no merge value is ever hand-typed into a legal instrument. Templates are HTML files with `{{snake_case}}` merge tags resolved exclusively from the canonical deal record (Module: Deal Data Model), rendered server-side to PDF via headless Chromium, and delivered as e-sign envelopes (Dropbox Sign), generated PDFs, portal web forms, or email/SMS messages. Published versions are immutable; every render stores the exact `template_version_id` plus a frozen JSON snapshot of merge values, so any document in any closed file can be byte-reproduced for audit, litigation, or investor diligence.

---

## 8.1 Architecture and data model

**Rendering stack (defaults — build these, not alternatives):**

- Template source: HTML + Handlebars-syntax merge tags stored in Postgres (`template_versions.body_html`), edited in an in-portal Monaco editor with live preview against a sample deal.
- Merge syntax: `{{field_name}}`, formatters `{{loan_amount|currency}}`, `{{maturity_date|date_long}}`, `{{interest_rate|pct2}}`, conditionals `{{#if lien_position_second}}...{{/if}}`, loops `{{#each guarantors}}...{{/each}}`.
- PDF generation: Playwright headless Chromium, Letter size, embedded fonts, print CSS in a shared `pdf_base.css` (firm header/footer, page numbers, `deal_id` + `template_version_id` micro-footer on every page).
- E-sign: **Dropbox Sign API** with embedded signing in the borrower/investor portals (vendor decision owned by the Integration module; chosen over DocuSign on API price and embedded-signing fit). Each `E_SIGN_ENVELOPE` template maps 1:1 to a stored signer-tab layout (`esign_tab_config` JSON on the template version). Signing order default: borrower signer(s) → guarantor(s) → Lendrock countersigner (PRIN). Webhook events update `template_renders.status`.
- Government/bureau forms (`SBA_FORM_159`, plus the Documents-module rail forms SBA 1919, SBA 912, IRS 4506-C) are **AcroForm field-overlay templates**, not HTML: the official PDF is stored per version with a `field_map` JSON binding form fields to merge fields; never re-typeset a government form.
- Email: transactional provider Postmark, one `email_template` row per message, sends logged to `comm_log` (Communications module).
- SMS: Twilio, transactional only, gated on `sms_consent = true`, quiet hours 8:00–21:00 borrower local time (queued otherwise).

**Delivery format enum (`delivery_format`):** `E_SIGN_ENVELOPE | GENERATED_PDF | WEB_FORM | EMAIL_TEMPLATE | SMS_TEMPLATE`

**Tables:**

| Table | Key fields |
|---|---|
| `templates` | `template_id`, `template_code` (SCREAMING_SNAKE, unique), `name`, `category` (`ORIGINATION\|CREDIT_LETTER\|LEGAL_INSTRUMENT\|SERVICING\|INVESTOR\|PARTNER\|COMMS`), `deal_types` (array of `HM\|BB\|WC\|SBA`, empty = all), `delivery_format`, `owner_role`, `attorney_review_required` (bool), `state_variant_enabled` (bool), `active_version_id` |
| `template_versions` | `version_id`, `template_id`, `version_number` (int, monotonic), `state_code` (nullable; null = national), `body_html`, `esign_tab_config` (jsonb), `status` (`DRAFT\|INTERNAL_REVIEW\|ATTORNEY_REVIEW\|PUBLISHED\|DEPRECATED\|ARCHIVED`), `created_by`, `attorney_approved_by`, `attorney_approved_at`, `changelog_note`, `published_at` |
| `merge_fields` | `field_name` (snake_case, PK), `data_type` (`STRING\|MONEY\|PCT\|DATE\|INT\|BOOL\|TEXT_BLOCK\|LIST`), `source_path` (JSONPath into canonical deal record, e.g. `deal.loan_terms.interest_rate`), `required_null_behavior` (`BLOCK_RENDER\|BLANK\|DEFAULT_VALUE`), `default_value`, `pii_flag` |
| `template_merge_fields` | `template_id`, `field_name`, `is_required` (join table; auto-synced by parsing `body_html` on save — a template can never reference an unregistered field) |
| `template_renders` | `render_id`, `deal_id`, `template_version_id`, `merge_snapshot` (jsonb, frozen), `status` (`QUEUED\|BLOCKED_MISSING_FIELDS\|RENDERED\|SENT\|DELIVERED\|VIEWED\|PARTIALLY_SIGNED\|COMPLETED\|DECLINED_BY_SIGNER\|VOIDED\|EXPIRED\|ERROR`), `output_document_id` (FK → Documents module), `esign_envelope_id`, `requested_by`, `rendered_at`, `completed_at` |
| `state_instrument_map` | `state_code` (PK), `security_instrument` (`MORTGAGE\|DEED_OF_TRUST\|SECURITY_DEED`), `foreclosure_type` (`JUDICIAL\|NON_JUDICIAL\|BOTH`), `attorney_confirmed` (bool) |

**Render pipeline (SYS):** stage-transition or manual trigger → resolve all merge fields from deal record → if any `is_required` field is null with `BLOCK_RENDER`, set `BLOCKED_MISSING_FIELDS` and open a task for the template's `owner_role` listing the missing fields (never render a legal doc with blanks) → render PDF → route per `delivery_format` → write completed artifact to the deal's document vault with auto-classification (Documents module).

---

## 8.2 Template inventory

Legend: AR = `attorney_review_required`. Merge-field cells list the distinctive fields; all templates also consume the company/system block (`lendrock_*`, `today_date_long`, `deal_id`).

### A. Application and intake

| Code | Template name | Deal types | Purpose | Format | Key merge fields | Owner | AR |
|---|---|---|---|---|---|---|---|
| `APP_UNIVERSAL` | Universal Loan Application | ALL | Single business-purpose credit application; entity, ownership, financial summary, business-purpose attestation, credit-pull + SMS consent | WEB_FORM (portal) + GENERATED_PDF archive copy | `borrower_legal_name`, `borrower_entity_type`, `borrower_ein`, `requested_loan_amount`, `use_of_proceeds`, `sms_consent` | LO | Yes |
| `SUP_HM` | HM Application Supplement | HM | Property, purchase/refi details, rehab budget, exit strategy, borrower track record (deals completed) | WEB_FORM | `property_address`, `purchase_price`, `as_is_value`, `arv`, `rehab_budget`, `exit_strategy` | LO | No |
| `SUP_BB` | BB Application Supplement | BB | Business financials, collateral offered, existing debt schedule | WEB_FORM | `collateral_description`, `annual_revenue`, `existing_debt_schedule` | LO | No |
| `SUP_WC` | WC Application Supplement | WC | AR/AP aging, borrowing-base inputs, banking history | WEB_FORM | `loc_requested_limit`, `ar_balance`, `inventory_value`, `monthly_deposits_avg` | LO | No |
| `SUP_SBA` | SBA Application Supplement | SBA | SBA eligibility screen (size standard, citizenship, prior government debt, franchise), program fit | WEB_FORM | `sba_program_type`, `employee_count`, `franchise_flag` | LO | No |
| `CHK_HM` | HM Document Checklist | HM | Auto-provisioned doc request list: entity docs, 2yr returns, bank stmts, purchase contract, rehab budget, insurance, track record | WEB_FORM (borrower portal checklist) + EMAIL_TEMPLATE | `checklist_items_list`, `borrower_portal_url` | PROC | No |
| `CHK_BB` | BB Document Checklist | BB | Entity docs, financial statements, collateral docs, debt schedule | WEB_FORM + EMAIL_TEMPLATE | same | PROC | No |
| `CHK_WC` | WC Document Checklist | WC | Adds AR aging, inventory reports, bank read-only link (Plaid) | WEB_FORM + EMAIL_TEMPLATE | same | PROC | No |
| `CHK_SBA` | SBA Document Checklist | SBA | Full SBA package list: 1919/912 equivalents, 3yrs returns, PFS, business plan/projections | WEB_FORM + EMAIL_TEMPLATE | same | PROC | No |

### B. Term sheets and credit-decision letters

| Code | Template name | Deal types | Purpose | Format | Key merge fields | Owner | AR |
|---|---|---|---|---|---|---|---|
| `TS_HM` | Hard Money Term Sheet | HM | Non-binding proposal: amount, rate, points, term, LTV/LTC/ARV, draws, conditions | E_SIGN_ENVELOPE | `loan_amount`, `interest_rate`, `origination_fee_pct`, `term_months`, `ltv_pct`, `ltc_pct`, `arv`, `holdback_amount`, `ts_expiration_date` | LO | Yes |
| `TS_BB` | Bridge/Business Term Sheet | BB | Non-binding proposal: amount, rate, fees, collateral, guaranty requirement | E_SIGN_ENVELOPE | `loan_amount`, `interest_rate`, `term_months`, `collateral_description`, `guarantor_full_name`, `ts_expiration_date` | LO | Yes |
| `TS_WC` | Working Capital LOC Term Sheet | WC | Non-binding: credit limit, rate, draw period, borrowing base, draw fee (no unused-line fee — Module 04 §2.4) | E_SIGN_ENVELOPE | `loc_credit_limit`, `interest_rate`, `advance_rate_pct`, `draw_fee_pct`, `draw_period_months`, `ts_expiration_date` | LO | Yes |
| `SBA_PROPOSAL` | SBA Financing Proposal Letter | SBA | Proposal to package/refer to partner lender; states Lendrock is packager not lender; packaging fee disclosure | E_SIGN_ENVELOPE | `sba_program_type`, `requested_loan_amount`, `packaging_fee_amount`, `partner_bank_name` (optional at this stage) | LO | Yes |
| `COMMIT_LTR` | Commitment / Approval Letter | HM, BB, WC | Binding-on-conditions approval: final terms, closing conditions list, commitment expiration, deposit | E_SIGN_ENVELOPE | `loan_amount`, `interest_rate`, `maturity_date`, `closing_conditions_list`, `commitment_expiration_date`, `commitment_fee_amount` | UW | Yes |
| `DECLINE_LTR` | Adverse Action / Decline Letter | HM, BB, WC + SBA pre-referral screen-outs only | ECOA Reg B–compliant business-credit adverse action: principal reasons (from fixed reason-code picklist) or right-to-request-reasons statement, ECOA anti-discrimination notice, FCRA credit-score disclosure block when a consumer report on a guarantor was used | GENERATED_PDF + EMAIL_TEMPLATE (PDF attached) | `borrower_legal_name`, `application_date`, `decision_date`, `decline_reasons_list`, `credit_bureau_block`, `lendrock_address` | UW (SYS-sent) | Yes |

`DECLINE_LTR` rules (build exactly): trigger on stage → `DECLINED`; UW must select 1–4 `decline_reason_codes` from the pathway's decline-code list (`DECL_*` — Modules 02 §6.2, 03 §9, 04 §9), each mapped to Reg B-safe notice language in the shared `aan_reason_map` (Module 10 §10.5.2); SYS renders and emails within 24h — hard compliance deadline 30 days from completed application, tracked with an escalating task to PRIN at day 20. For applicants with gross revenue > $1M we still send the same written notice (safest single path; no dual logic). **SBA exception:** when partner lenders decline a referred SBA deal, the lenders are the creditors and own their own Reg B notices — SYS sends `SBA_WINDDOWN_LTR` (facts-only, no credit characterization) instead of `DECLINE_LTR`, per the SBA module §5.11. `DECLINE_LTR` fires on SBA deals only when Lendrock itself screens the applicant out before any referral.

### C. Legal instruments (closing docs)

| Code | Template name | Deal types | Purpose | Format | Key merge fields | Owner | AR |
|---|---|---|---|---|---|---|---|
| `NOTE_HM` | Promissory Note — HM | HM | Secured real-estate note; interest-only default, default interest, late fee, extension option reference | E_SIGN_ENVELOPE (wet-ink fallback flag per state) | `loan_amount`, `interest_rate`, `default_interest_rate`, `late_fee_pct`, `grace_period_days`, `maturity_date`, `monthly_payment_amount`, `prepayment_penalty_terms`, `governing_law_state` | PROC | Yes |
| `NOTE_BB` | Promissory Note — BB | BB | Term business note, secured or unsecured variant via conditional block | E_SIGN_ENVELOPE | same + `collateral_description`, `amortization_type` | PROC | Yes |
| `NOTE_WC_REV` | Revolving Promissory Note — WC | WC | Revolving note paired with `LOC_AGMT`; advances/repayments ledger reference | E_SIGN_ENVELOPE | `loc_credit_limit`, `interest_rate`, `draw_period_months`, `maturity_date` | PROC | Yes |
| `MTG_DOT` | Mortgage / Deed of Trust / Security Deed | HM | Recorded security instrument; **state-variant required** (see 8.5); includes business-purpose recital and assignment-of-rents clause | E_SIGN_ENVELOPE + wet-ink/notarized print path (`GENERATED_PDF`) — recorded docs always print path | `property_address`, `legal_description`, `apn`, `property_county`, `property_state`, `loan_amount`, `maturity_date`, `trustee_name` (DOT states), `lien_position` | PROC | Yes |
| `ALR` | Assignment of Leases and Rents | HM | Collateral assignment for tenanted/rental-exit properties | GENERATED_PDF (notarized, recorded) | `property_address`, `legal_description`, `borrower_legal_name` | PROC | Yes |
| `GTY_PERSONAL` | Personal Guaranty | HM, BB, WC | Unconditional continuing guaranty by each ≥20% owner (default policy) | E_SIGN_ENVELOPE | `guarantors` (each: `guarantor_full_name`, `guarantor_address`), `loan_amount`, `governing_law_state` | PROC | Yes |
| `GTY_COMPLETION` | Completion Guaranty | HM (ground-up only) | Guaranty of lien-free construction completion | E_SIGN_ENVELOPE | `guarantor_full_name`, `rehab_budget`, `completion_deadline_date` | PROC | Yes |
| `SEC_AGMT` | Security Agreement | BB, WC | Article 9 grant of security interest in business assets | E_SIGN_ENVELOPE | `ucc_collateral_description`, `borrower_legal_name`, `borrower_state_of_formation` | PROC | Yes |
| `UCC1_FIN` | UCC-1 Financing Statement | BB, WC, HM (fixture filings) | Perfection filing; generated from `SEC_AGMT` data, filed via SYS integration (recommend: CSC/Wolters Kluwer API) | GENERATED_PDF + API filing | `borrower_legal_name`, `borrower_state_of_formation`, `ucc_collateral_description`, `secured_party_block` | PROC (SYS files) | Yes |
| `LOC_AGMT` | Line of Credit Agreement | WC | Master revolving credit agreement: borrowing base, advances mechanics, covenants, reporting requirements | E_SIGN_ENVELOPE | `loc_credit_limit`, `advance_rate_pct`, `draw_fee_pct`, `reporting_covenants_list`, `maturity_date` | PROC | Yes |
| `ENT_RESOLUTION` | Borrowing Resolution / Member Consent | HM, BB, WC, SBA (COND) | Entity authorization of the loan and designated signer; SYS-generated per Documents module requirement (dated within 30 days of closing) | E_SIGN_ENVELOPE | `borrower_legal_name`, `borrower_entity_type`, `signer_name`, `signer_title`, `loan_amount` | PROC | Yes |
| `ACH_AUTH` | ACH Debit Authorization | HM, BB, WC | Auto-debit authorization for payments; NACHA-compliant | E_SIGN_ENVELOPE | `bank_account_last4`, `monthly_payment_amount`, `first_payment_date` | PROC | No |
| `INS_REQS` | Insurance Requirements Letter | HM | Hazard/builder's-risk/flood requirements + mortgagee clause for borrower's agent | GENERATED_PDF + EMAIL_TEMPLATE | `property_address`, `loan_amount`, `mortgagee_clause_block` | PROC | No |
| `CLOSING_INSTR` | Closing Instructions Letter | HM | Instructions to title/escrow: funding conditions, doc recording order, disbursement | GENERATED_PDF | `title_company_name`, `escrow_officer_name`, `wire_instructions_block`, `funding_conditions_list` | PROC | Yes |

### D. Servicing and post-close

| Code | Template name | Deal types | Purpose | Format | Key merge fields | Owner | AR |
|---|---|---|---|---|---|---|---|
| `DRAW_REQ` | Draw Request Form | HM (rehab/construction), WC (advances) | Borrower-submitted draw against holdback or LOC; line-item budget grid for HM | WEB_FORM (borrower portal) | `draw_request_number`, `draw_amount_requested`, `budget_line_items`, `percent_complete_claimed` | PROC | No |
| `INSP_RPT` | Inspection Report Form | HM | Inspector's progress report keyed to budget line items; photo upload; recommends approved draw amount | WEB_FORM (inspector link) | `inspection_date`, `inspector_name`, `percent_complete`, `draw_amount_recommended` | PROC | No |
| `EXT_AGMT` | Extension Agreement | HM, BB | Maturity extension amendment: fee, new maturity, rate step-up, reaffirmation of guaranty | E_SIGN_ENVELOPE | `extension_fee_amount`, `extension_new_maturity_date`, `extension_interest_rate`, `original_maturity_date` | PROC | Yes |
| `PAYOFF_DEMAND` | Payoff Demand Letter | HM, BB, WC | Per-diem payoff statement good through date; wire instructions; release terms | GENERATED_PDF (SYS-computed from servicing ledger) | `payoff_amount`, `payoff_good_through_date`, `per_diem_interest`, `wire_instructions_block`, `release_fee_amount` | PROC (SYS renders) | Yes |
| `BORROWING_BASE_CERT` | Borrowing Base Certificate | WC | Monthly borrower attestation of AR/inventory feeding the LOC availability calc; late cert freezes draws (Documents module rail) | WEB_FORM + E_SIGN_ENVELOPE attestation | `ar_balance`, `inventory_value`, `advance_rate_pct`, `loc_credit_limit` | PROC (SYS chases) | Yes |
| `WC_RENEWAL_AMEND` | WC Renewal Amendment | WC | Annual-renewal amendment to `LOC_AGMT` — not a new closing (Module 04 §6.2): new maturity, renewal fee, updated limit/covenants | E_SIGN_ENVELOPE | `loc_credit_limit`, `maturity_date`, `renewal_fee_pct` | PROC | Yes |
| `WC_CATCHUP_PLAN` | WC Payment Catch-Up Plan | WC | ≤ 3-month delinquency catch-up plan agreement, PROC authority (Module 04 §7.2) | E_SIGN_ENVELOPE | `amount_past_due`, `catchup_installment_amount`, `catchup_end_date` | PROC | Yes |
| `LATE_NOTICE` | Late Notice | HM, BB, WC | Formal day-10 late notice (Module 10 §10.4.5): amount past due, late fee assessed, cure instructions | GENERATED_PDF + EMAIL_TEMPLATE (also mailed via Lob) | `amount_past_due`, `late_fee_amount`, `due_date`, `cure_instructions_block` | PROC (SYS renders) | Yes |
| `DEFAULT_WARNING_LTR` | Default Warning Letter | HM, BB, WC | Day-30 SERIOUS notice (Module 10 §10.4.5): consequences of continued non-payment, workout invitation | GENERATED_PDF | `amount_past_due`, `days_past_due`, `default_interest_rate`, `workout_contact_block` | LO | Yes |
| `DEMAND_LTR` | Default / Demand Letter | HM, BB, WC | Day-60 formal default declaration and demand, issued via counsel (Module 10 §10.4.5): acceleration, default rate activation | GENERATED_PDF | `total_amount_demanded`, `default_interest_rate`, `demand_deadline_date`, `governing_law_state` | UW | Yes |
| `FORBEARANCE_AGMT` | Forbearance Agreement | HM, BB, WC | Workout instrument following PRIN `DEFAULT_DECISION` (Module 10 §10.4.5): forbearance period, modified payment terms, reinstatement conditions, reaffirmation of guaranty | E_SIGN_ENVELOPE | `forbearance_end_date`, `modified_payment_terms_block`, `reinstatement_amount`, `governing_law_state` | UW | Yes |
| `LIEN_RELEASE` | Lien Release Instrument Packet | HM, BB (secured) | Release instruments at payoff (Module 10 §10.4.9): mortgage satisfaction / deed of reconveyance (per `state_instrument_map`) / UCC-3 termination, selected by `release_type`; **state-variant required** (see 8.5) | GENERATED_PDF (notarized/recorded print path; UCC-3 e-filed) | `property_address`, `legal_description`, `recording_reference_block`, `borrower_legal_name` | PROC | Yes |

### E. Capital markets / investor

| Code | Template name | Deal types | Purpose | Format | Key merge fields | Owner | AR |
|---|---|---|---|---|---|---|---|
| `INV_TEASER` | Investor Deal Teaser / Offering Summary | HM, BB | 1–2 page anonymized deal summary: collateral, metrics, yield, term; posted to investor portal + emailed to matched investors | GENERATED_PDF + EMAIL_TEMPLATE | `deal_summary_block`, `loan_amount`, `investor_yield_rate`, `ltv_pct`, `term_months`, `lien_position`, `property_type` | CM | No |
| `INV_COMMIT` | Investor Commitment Letter | HM, BB | Investor's commitment to fund participation amount by deadline | E_SIGN_ENVELOPE | `investor_entity_name`, `participation_amount`, `participation_pct`, `investor_yield_rate`, `funding_deadline_date` | CM | Yes |
| `SUB_DOCS` | Subscription / Participation Package | HM, BB | Participation certificate + participation agreement execution package; accreditation representation; W-9 collection | E_SIGN_ENVELOPE | `investor_entity_name`, `participation_amount`, `participation_pct`, `servicing_spread_pct`, `distribution_day_of_month` | CM | Yes |
| `ASSIGN_PART` | Assignment / Participation Agreement | HM, BB | Governs pari-passu participation or whole-loan assignment; Lendrock retains servicing. Executed **once as a master agreement at investor onboarding** (Investor module MASTER_AGREEMENT step); per-deal economics attach via the `SUB_DOCS` participation certificate | E_SIGN_ENVELOPE | `participation_pct`, `servicing_spread_pct`, `loan_amount`, `investor_entity_name`, `remittance_terms_block` | CM | Yes |
| `INV_STATEMENT` | Investor Monthly Statement | HM, BB | Per-investor monthly statement (Module 07 §4.3): opening/closing balances, per-deal accrual and payment lines, principal events, blended yield | GENERATED_PDF | `statement_period`, `investor_entity_name`, `distribution_lines_block`, `blended_yield_pct` | CM (SYS renders) | No |

### F. Partner and broker

| Code | Template name | Deal types | Purpose | Format | Key merge fields | Owner | AR |
|---|---|---|---|---|---|---|---|
| `BROKER_FEE_AGMT` | Broker Fee Agreement | HM, BB, WC | One-time or master agreement: fee schedule (default 1.0% of funded amount, paid at closing from proceeds), non-circumvention, no-consumer-loans rep. **Not used on SBA deals**: a referring broker compensated in connection with an SBA application is an Agent — any compensation is disclosed on `SBA_FORM_159`, added to the disclosed compensation, and paid from Lendrock's earned fee, never from loan proceeds (Module 05 §5.10; Module 11 §A5 fee-splitting danger zone) | E_SIGN_ENVELOPE | `broker_name`, `broker_company`, `broker_fee_pct`, `broker_fee_amount` | LO | Yes |
| `SBA_REFERRAL_AGMT` | SBA Partner Referral Agreement | SBA | Master agreement with partner bank/SBA lender: referral/packaging fee, SBA Form 159 compliance obligation, data handling | E_SIGN_ENVELOPE | `partner_bank_name`, `referral_fee_pct`, `packaging_fee_amount` | CM | Yes |
| `SBA_PACKAGING_AGMT` | SBA Packaging Engagement Agreement | SBA | Borrower-facing engagement: scope of packaging services, `packaging_fee_amount` + schedule (default 50% at signing / 50% at submission-ready), no-guarantee-of-credit disclaimer; gates the `ENGAGED` stage (SBA module 5.5) | E_SIGN_ENVELOPE | `borrower_legal_name`, `packaging_fee_amount`, `packaging_fee_schedule`, `sba_program_type` | LO | Yes |
| `SBA_FORM_159` | SBA Form 159 — Fee Disclosure | SBA | Official SBA agent-compensation disclosure; AcroForm overlay of the current SBA-issued PDF; generated + signed at `ENGAGED`, auto re-issued (prior record `SUPERSEDED`) whenever fee amounts change | E_SIGN_ENVELOPE (AcroForm overlay) | `borrower_legal_name`, `packaging_fee_amount`, `referral_fee_pct`, `partner_bank_name`, `lendrock_address` | SYS (LO verifies) | Yes |
| `SBA_WINDDOWN_LTR` | SBA Wind-Down Letter | SBA | Facts-only close-out when all targeted lenders decline: "the lenders we submitted to did not extend an offer," alternative pathways, no credit characterization — NOT an adverse-action notice (declining lenders own Reg B; sends only after every declining submission has `decline_letter_file_id` + `lender_aan_confirmed_at` per Module 05 §5.11); pairs with auto-created BB/WC cross-sell lead | GENERATED_PDF + EMAIL_TEMPLATE | `borrower_legal_name`, `partner_bank_name`, `sba_program_type`, `decision_date` | SYS (CM reviews before send) | Yes |
| `SBA_COVER_MEMO` | SBA Package Cover Memo | SBA | Standardized deal memo transmitted with the packaged file to partner lender: eligibility summary, financial snapshot, requested structure | GENERATED_PDF | `borrower_legal_name`, `sba_program_type`, `requested_loan_amount`, `use_of_proceeds`, `dscr_calculated`, `eligibility_summary_block` | LO | No |

### G. Email/SMS templates and sequences

One-off templates:

| Code | Name | Trigger | Format | Owner |
|---|---|---|---|---|
| `EM_WELCOME_BORROWER` | Borrower welcome + portal invite | Deal created (any source) | EMAIL + SMS | SYS |
| `EM_WELCOME_INVESTOR` | Investor welcome + portal invite | Investor record activated | EMAIL | SYS |
| `EM_WELCOME_BROKER` | Broker welcome + submission instructions | `BROKER_FEE_AGMT` completed | EMAIL | SYS |

Sequences (each row is a `comm_sequence` with `sequence_code`, `trigger_event`, `exit_event`; steps stored in `comm_sequence_steps` with `offset_hours`, `channel`):

| Sequence code | Trigger | Steps (default cadence) | Exit condition |
|---|---|---|---|
| `SEQ_LEAD_RESPONSE` | Stage = `NEW_LEAD` (web CTA source) | Cadence owned by Module 01 §5.2/§7.1 (speed-to-lead auto-response + nurture/auto-DEAD clocks); this registry stores the message bodies only | Stage ≥ `CONTACTED` |
| `SEQ_APP_ABANDONED` | `APP_UNIVERSAL` started, incomplete 24h | 24h email resume link; 72h SMS; 7d email final | Application submitted or `DEAD` |
| `SEQ_DOC_CHASE` | Checklist item(s) `OUTSTANDING` after 48h in `APPLICATION` | Cadence owned by Module 06 §3.4 (day 1/3/5/7 digested email + SMS, day-7 `DOC_CHASE` escalation to LO); this registry stores the message bodies only | Checklist complete |
| `SEQ_TS_UNSIGNED` | Term sheet envelope `SENT`, unsigned | 24h email; 72h email + SMS; 120h task to LO to call | Envelope `COMPLETED`, `VOIDED`, or expired |
| `SEQ_UW_STATUS` | Stage = `UNDERWRITING` | Every 5 business days: templated status email with live checklist status | Stage exits `UNDERWRITING` |
| `SEQ_APPROVAL_CONGRATS` | Stage = `APPROVED` | 0h email with `COMMIT_LTR` envelope + conditions list; 48h reminder if unsigned | Commitment signed |
| `SEQ_CLOSING_COUNTDOWN` | `closing_date` set in `DOCS_CLOSING` | T-5d email (what to bring/wire fraud warning); T-1d SMS reminder; T+0 confirmation | Stage = `FUNDED` |
| `SEQ_FUNDED_ONBOARD` | Stage = `FUNDED` | 0h email: payment instructions, `ACH_AUTH` status, portal servicing tab, draw-request how-to (HM) | Always completes (3 steps) |
| `SEQ_PAYMENT_REMINDER` | Servicing: payment due | T-5d email; T+0 SMS; late: T+1 email, T+5 email + SMS + task to PROC, T+10 default-notice task to PRIN | Payment received |
| `SEQ_DRAW_STATUS` | `DRAW_REQ` submitted | 0h received confirmation; on inspection scheduled; on approval + wire sent | Draw funded or rejected |
| `SEQ_MATURITY_NOTICE` | 90 days before `maturity_date` | T-90 email (payoff vs extension options); T-60 email; T-30 email + SMS + task to LO (extension outreach); T-15 email + SMS escalation (matches Module 02 §5.4 ticklers) | Loan `PAID_OFF` or `EXT_AGMT` executed |
| `SEQ_PAYOFF_CONFIRM` | `PAYOFF_DEMAND` generated | 0h email with PDF; on wire receipt: paid-in-full + lien-release timeline email | Release recorded |
| `SEQ_DECLINE_DELIVERY` | Stage = `DECLINED` | 0h email with `DECLINE_LTR` PDF (no SMS ever for adverse action) | Always completes (1 step) |
| `SEQ_DEAD_NURTURE` | Stage = `DEAD` with dead-reason `core_code` in (`DEAD_TIMING`, `DEAD_TERMS_REJECTED`, `DEAD_LOST_COMPETITOR`) — shared DeadReason taxonomy, Module 09 §9.2.2 | 30d, 90d, 180d re-engagement emails | Reply or new deal created |
| `SEQ_INV_OFFERING` | `INV_TEASER` published to matched investors | 0h email; 72h reminder to non-viewers; 120h task to CM to call top matches | Deal fully committed |
| `SEQ_INV_COMMIT_CHASE` | `INV_COMMIT` envelope `SENT` | 24h email; 72h task to CM | Envelope `COMPLETED` |
| `SEQ_SBA_STATUS` | SBA package transmitted to partner | Every 7d borrower status email until partner decision logged | Partner decision recorded |

Dedupe rule (SYS): max 1 SMS and 2 emails per borrower per 24h across all sequences; excess messages queue. `SEQ_DECLINE_DELIVERY` and `SEQ_PAYMENT_REMINDER` bypass the cap.

---

## 8.3 Merge-variable dictionary (single source of truth)

Rules: every variable below is a row in `merge_fields`; templates may only reference registered variables (save-time validation); resolution is read-only from the deal record — a render never writes deal data. Group shorthands used in the Consumers column: **ALL_LEGAL** = `NOTE_*`, `MTG_DOT`, `ALR`, `GTY_*`, `SEC_AGMT`, `LOC_AGMT`, `EXT_AGMT`, `ASSIGN_PART`; **ALL_TS** = `TS_HM`, `TS_BB`, `TS_WC`, `SBA_PROPOSAL`; **ALL_COMMS** = all `EM_*`/`SEQ_*` templates.

| Field name | Type | Source path | Consumers |
|---|---|---|---|
| `borrower_legal_name` | STRING | `deal.borrower.legal_name` | ALL_LEGAL, ALL_TS, `APP_UNIVERSAL`, `COMMIT_LTR`, `SBA_COVER_MEMO`, `UCC1_FIN`, `PAYOFF_DEMAND` |
| `borrower_entity_type` | STRING | `deal.borrower.entity_type` | ALL_LEGAL, `APP_UNIVERSAL` |
| `borrower_ein` | STRING (PII) | `deal.borrower.ein` | `APP_UNIVERSAL`, `SUB_DOCS`, `SBA_COVER_MEMO` |
| `borrower_state_of_formation` | STRING | `deal.borrower.state_of_formation` | `SEC_AGMT`, `UCC1_FIN`, ALL_LEGAL |
| `borrower_address` | STRING | `deal.borrower.mailing_address` | ALL_LEGAL, `DECLINE_LTR` |
| `borrower_email` / `borrower_phone` | STRING (PII) | `deal.primary_contact.email/.phone` | ALL_COMMS, e-sign routing |
| `signer_name` / `signer_title` | STRING | `deal.borrower.authorized_signer.*` | ALL_LEGAL, `COMMIT_LTR`, ALL_TS |
| `guarantors` | LIST | `deal.guarantors[]` (each: `guarantor_full_name`, `guarantor_address`, `guarantor_email`) | `GTY_PERSONAL`, `GTY_COMPLETION`, `TS_BB`, `COMMIT_LTR` |
| `deal_id` | STRING | `deal.deal_id` | all (micro-footer) |
| `deal_type` | STRING | `deal.deal_type` | ALL_COMMS, `INV_TEASER` |
| `application_date` | DATE | `deal.application.completed_at` | `DECLINE_LTR`, `COMMIT_LTR` |
| `requested_loan_amount` | MONEY | `deal.application.requested_amount` | `APP_UNIVERSAL`, `SBA_PROPOSAL`, `SBA_COVER_MEMO` |
| `use_of_proceeds` | TEXT_BLOCK | `deal.application.use_of_proceeds` | `APP_UNIVERSAL`, `SBA_COVER_MEMO`, `INV_TEASER` |
| `loan_amount` | MONEY | `deal.loan_terms.loan_amount` | ALL_LEGAL, ALL_TS, `COMMIT_LTR`, `INV_TEASER`, `ASSIGN_PART`, `BROKER_FEE_AGMT` |
| `interest_rate` | PCT | `deal.loan_terms.interest_rate` | ALL_LEGAL, ALL_TS, `COMMIT_LTR` |
| `default_interest_rate` | PCT | `deal.loan_terms.default_rate` | `NOTE_*` |
| `origination_fee_pct` / `origination_fee_amount` | PCT / MONEY | `deal.loan_terms.orig_fee_*` | ALL_TS, `COMMIT_LTR`, settlement statement (Closing module) |
| `term_months` | INT | `deal.loan_terms.term_months` | ALL_TS, `COMMIT_LTR`, `INV_TEASER` |
| `maturity_date` | DATE | `deal.loan_terms.maturity_date` | `NOTE_*`, `MTG_DOT`, `LOC_AGMT`, `COMMIT_LTR`, `SEQ_MATURITY_NOTICE` |
| `first_payment_date` | DATE | `deal.loan_terms.first_payment_date` | `NOTE_*`, `ACH_AUTH`, `SEQ_FUNDED_ONBOARD` |
| `monthly_payment_amount` | MONEY | `deal.loan_terms.monthly_payment` | `NOTE_*`, `ACH_AUTH`, `SEQ_PAYMENT_REMINDER` |
| `amortization_type` | STRING | `deal.loan_terms.amortization_type` (default `INTEREST_ONLY`) | `NOTE_BB`, `COMMIT_LTR` |
| `prepayment_penalty_terms` | TEXT_BLOCK | `deal.loan_terms.prepay_terms` | `NOTE_*`, ALL_TS |
| `late_fee_pct` / `grace_period_days` | PCT / INT | `deal.loan_terms.late_fee_pct/.grace_days` (defaults 10% / 10; WC override 5% min $25 / 5 days — Module 04 §7.2) | `NOTE_*` |
| `funding_date` | DATE | `deal.funding.funded_at` | `ASSIGN_PART`, `SEQ_FUNDED_ONBOARD` |
| `ts_expiration_date` | DATE | computed: issue + 10d (canonical term-sheet window, reminders day 3/7) | ALL_TS |
| `commitment_expiration_date` / `commitment_fee_amount` | DATE / MONEY | `deal.commitment.*` | `COMMIT_LTR` |
| `closing_conditions_list` | LIST | `deal.commitment.conditions[]` | `COMMIT_LTR`, `CLOSING_INSTR` |
| `ltv_pct` / `ltc_pct` | PCT | `deal.underwriting.ltv/.ltc` | `TS_HM`, `COMMIT_LTR`, `INV_TEASER` |
| `arv` / `as_is_value` / `purchase_price` | MONEY | `deal.property.arv/.as_is_value/.purchase_price` | `TS_HM`, `SUP_HM`, `INV_TEASER` |
| `rehab_budget` / `holdback_amount` | MONEY | `deal.construction.budget_total/.holdback` | `TS_HM`, `GTY_COMPLETION`, `DRAW_REQ` |
| `budget_line_items` | LIST | `deal.construction.budget_lines[]` | `DRAW_REQ`, `INSP_RPT` |
| `property_address` / `property_county` / `property_state` / `property_type` | STRING | `deal.property.*` | `MTG_DOT`, `ALR`, `TS_HM`, `INS_REQS`, `INV_TEASER`, `INSP_RPT` |
| `apn` / `legal_description` | STRING / TEXT_BLOCK | `deal.property.apn/.legal_description` | `MTG_DOT`, `ALR` (BLOCK_RENDER if null) |
| `lien_position` | STRING | `deal.loan_terms.lien_position` | `MTG_DOT`, `INV_TEASER`, `TS_HM` |
| `trustee_name` | STRING | `state_instrument_map` join → config | `MTG_DOT` (DOT states only) |
| `governing_law_state` | STRING | `deal.loan_terms.governing_law_state` (default: property/borrower state) | ALL_LEGAL |
| `title_company_name` / `escrow_officer_name` | STRING | `deal.closing.title_*` | `CLOSING_INSTR` |
| `collateral_description` / `ucc_collateral_description` | TEXT_BLOCK | `deal.collateral.description/.ucc_description` | `SEC_AGMT`, `UCC1_FIN`, `NOTE_BB`, `TS_BB` |
| `loc_credit_limit` / `advance_rate_pct` / `draw_fee_pct` / `draw_period_months` | MONEY / PCT / PCT / INT | `deal.loc_terms.*` | `TS_WC`, `LOC_AGMT`, `NOTE_WC_REV` |
| `reporting_covenants_list` | LIST | `deal.loc_terms.covenants[]` | `LOC_AGMT` |
| `draw_request_number` / `draw_amount_requested` / `draw_amount_recommended` / `percent_complete` | INT / MONEY / MONEY / PCT | `deal.draws[n].*` | `DRAW_REQ`, `INSP_RPT`, `SEQ_DRAW_STATUS` |
| `inspection_date` / `inspector_name` | DATE / STRING | `deal.draws[n].inspection.*` | `INSP_RPT` |
| `extension_fee_amount` / `extension_new_maturity_date` / `extension_interest_rate` | MONEY / DATE / PCT | `deal.extension.*` | `EXT_AGMT` |
| `payoff_amount` / `payoff_good_through_date` / `per_diem_interest` / `release_fee_amount` | MONEY / DATE / MONEY / MONEY | SYS-computed from servicing ledger | `PAYOFF_DEMAND` |
| `wire_instructions_block` | TEXT_BLOCK | company config (never free-typed; wire-fraud control) | `PAYOFF_DEMAND`, `CLOSING_INSTR`, `SEQ_CLOSING_COUNTDOWN` |
| `investor_name` / `investor_entity_name` | STRING | `investor.legal_name/.entity_name` | `INV_COMMIT`, `SUB_DOCS`, `ASSIGN_PART`, `EM_WELCOME_INVESTOR` |
| `participation_pct` / `participation_amount` | PCT / MONEY | `deal.participations[n].*` | `INV_COMMIT`, `SUB_DOCS`, `ASSIGN_PART` |
| `investor_yield_rate` / `servicing_spread_pct` | PCT | `deal.participations[n].yield/.spread` | `INV_TEASER`, `SUB_DOCS`, `ASSIGN_PART` |
| `funding_deadline_date` / `distribution_day_of_month` | DATE / INT | `deal.participations[n].deadline` / config (default 10) | `INV_COMMIT`, `SUB_DOCS` |
| `broker_name` / `broker_company` / `broker_fee_pct` / `broker_fee_amount` | STRING/STRING/PCT/MONEY | `deal.broker.*` | `BROKER_FEE_AGMT`, settlement statement |
| `partner_bank_name` / `referral_fee_pct` / `packaging_fee_amount` / `sba_program_type` | STRING/PCT/MONEY/STRING | `deal.sba.*` | `SBA_PROPOSAL`, `SBA_REFERRAL_AGMT`, `SBA_COVER_MEMO` |
| `decline_reasons_list` | LIST | `deal.decision.decline_reason_codes[]` → display strings | `DECLINE_LTR` |
| `decision_date` | DATE | `deal.decision.decided_at` | `DECLINE_LTR`, `COMMIT_LTR` |
| `credit_bureau_block` | TEXT_BLOCK | conditional: guarantor consumer report used → bureau name/address/score disclosure | `DECLINE_LTR` |
| `checklist_items_list` | LIST | `deal.checklist.items[] where status=OUTSTANDING` | `CHK_*`, `SEQ_DOC_CHASE` |
| `annual_revenue` / `monthly_deposits_avg` | MONEY | `deal.financials.annual_revenue/.monthly_deposits_avg` | `SUP_BB`, `SUP_WC`, `SBA_COVER_MEMO` |
| `existing_debt_schedule` | LIST | `deal.financials.debt_schedule[]` | `SUP_BB`, `SBA_COVER_MEMO` |
| `ar_balance` / `inventory_value` | MONEY | `deal.wc_inputs.ar_balance/.inventory_value` | `SUP_WC`, `BORROWING_BASE_CERT` |
| `loc_requested_limit` | MONEY | `deal.application.loc_requested_limit` | `SUP_WC` |
| `exit_strategy` | STRING | `deal.property.exit_strategy` | `SUP_HM`, `INV_TEASER` |
| `completion_deadline_date` | DATE | `deal.construction.completion_deadline` | `GTY_COMPLETION` |
| `mortgagee_clause_block` | TEXT_BLOCK | company config | `INS_REQS` |
| `funding_conditions_list` | LIST | `deal.commitment.conditions[] where status=OPEN` | `CLOSING_INSTR` |
| `bank_account_last4` | STRING (PII) | `deal.payment_method.account_last4` | `ACH_AUTH` |
| `secured_party_block` | TEXT_BLOCK | company config | `UCC1_FIN` |
| `remittance_terms_block` | TEXT_BLOCK | pre-approved clause library (ADMIN) | `ASSIGN_PART` |
| `deal_summary_block` | TEXT_BLOCK | CM-authored at teaser creation (only free-text merge field; CM owns content) | `INV_TEASER` |
| `dscr_calculated` | PCT | `deal.underwriting.dscr` | `SBA_COVER_MEMO` |
| `eligibility_summary_block` | TEXT_BLOCK | SYS-composed from SBA prescreen results | `SBA_COVER_MEMO` |
| `employee_count` / `franchise_flag` | INT / BOOL | `deal.sba.employee_count/.franchise_flag` | `SUP_SBA` |
| `packaging_fee_schedule` | STRING | `deal.sba.fee_schedule` (default `FIFTY_FIFTY`) | `SBA_PACKAGING_AGMT` |
| `sms_consent` | BOOL | `deal.primary_contact.sms_consent` | `APP_UNIVERSAL`; gates every SMS send |
| `borrower_portal_url` / `esign_url` / `calendly_link` | STRING | SYS-generated per deal/envelope; LO config | ALL_COMMS |
| `lendrock_signer_name` / `lendrock_signer_title` / `lendrock_address` / `lendrock_phone` | STRING | company config (default signer: PRIN) | all documents |
| `today_date_long` | DATE | render time | all documents |

---

## 8.4 Template governance

**Permissions.** Editing/publishing templates requires the `ADMIN` portal permission, held by PRIN (and optionally one delegate). LO/PROC/UW/CM can *render* published templates and propose edits (creates a `DRAFT` version); they can never publish. Legal-instrument body text is never editable at render time — the only per-deal degrees of freedom are merge values and pre-approved optional clause blocks (`{{#if}}` conditionals defined in the template itself).

**Versioning.** New version on every edit; `version_number` monotonic per template; `changelog_note` required to leave `DRAFT`. Publishing a version auto-deprecates the previous one; in-flight envelopes on a deprecated version complete unaffected. Deals in `DOCS_CLOSING` are pinned to the version set current at commitment issuance unless PROC explicitly re-renders.

**Lifecycle flow:**

| Stage | Owner | Required actions | Automations (SYS) | Exit criteria | Target SLA |
|---|---|---|---|---|---|
| DRAFT | ADMIN | Edit body, register any new merge fields, write changelog_note | Save-time validation: all `{{tags}}` exist in `merge_fields`; preview render against sample deal | Submitted for review | — |
| INTERNAL_REVIEW | PRIN | Review diff vs prior version (side-by-side redline view) | Auto-diff render; notify PRIN | Approve → route by `attorney_review_required` flag | 3 business days |
| ATTORNEY_REVIEW | ADMIN (coordinates) | Send diff to outside counsel; log `attorney_approved_by/at`; attach counsel email to version record | Task with 10-day reminder; block publish until approval recorded | Counsel sign-off recorded | 10 business days |
| PUBLISHED | SYS | — | Set `active_version_id`; deprecate prior; notify all roles of change summary | Superseded or retired | — |
| DEPRECATED / ARCHIVED | SYS | — | Retained forever for render reproducibility; hidden from pickers | — | — |

**Attorney-review cadence.** (1) On-change: any edit to a template with `attorney_review_required = true` must pass ATTORNEY_REVIEW — no exceptions, including "typo fixes." (2) Annual: every January, SYS opens a review task set covering all AR templates plus the `state_instrument_map` and the `sba_eligible_citizenship_statuses` config (Module 05 §5.4 check 4 — keyed to the governing SBA notice number); counsel confirms statutory changes (foreclosure law, usury, licensing, SBA SOP/notice updates) per active state. (3) New-state: entering a state with no `PUBLISHED` `MTG_DOT` variant hard-blocks HM deals in that state at `TERM_SHEET` exit until counsel delivers the variant.

**State-specific variants.** Only security instruments and their riders are state-variant (`state_variant_enabled = true`): `MTG_DOT`, `ALR`, and any state-mandated rider blocks. Everything else is national with `governing_law_state` merged. `state_instrument_map` ships seeded for all 50 states + DC with `attorney_confirmed = false`; defaults: DEED_OF_TRUST for AK, AZ, CA, CO, DC, ID, MS, MO, MT, NE, NV, NC, OR, TN, TX, UT, VA, WA, WV, WY; SECURITY_DEED for GA; MORTGAGE for the remainder; counsel flips `attorney_confirmed` per state as Lendrock activates it. Version resolution at render: exact `state_code` match required for state-variant templates — no national fallback (fail with `BLOCKED_MISSING_FIELDS`-equivalent error `NO_STATE_VARIANT`).

**Usury/licensing guardrail (SYS).** A `state_rate_limits` config table (state_code, max_business_rate, license_required_flag) is checked at term-sheet render; exceeding a cap blocks the render and opens a PRIN task. Counsel maintains this table on the annual cadence.

---

## Interfaces with other modules

- **Deal Pipeline / Stage Engine:** stage transitions fire template renders and comm sequences (`TERM_SHEET` → `TS_*`; `APPROVED` → `COMMIT_LTR`; `DECLINED` → `DECLINE_LTR` + `SEQ_DECLINE_DELIVERY`; `DOCS_CLOSING` → closing doc set).
- **Deal Data Model:** `merge_fields.source_path` binds to the canonical deal schema; schema migrations must run a SYS check that no registered merge field is orphaned.
- **Documents & Checklists module:** completed renders and signed envelopes file into the deal document vault; `CHK_*` templates provision that module's checklist instances.
- **Communications module:** `SEQ_*` sequences execute there; this module owns the message bodies and merge bindings, `comm_log` records sends, and the 24h dedupe caps.
- **Borrower Portal:** hosts `APP_UNIVERSAL`, `SUP_*`, `CHK_*` upload lists, and `DRAW_REQ`; embedded Dropbox Sign signing ceremonies.
- **SBA Workflow module:** consumes `SBA_PACKAGING_AGMT` + `SBA_FORM_159` at the `ENGAGED` gate (Form 159 auto re-issued on fee change), `SBA_COVER_MEMO` per lender submission bundle, and `SBA_WINDDOWN_LTR` on all-lenders-declined.
- **Investor Portal / Capital Markets module:** consumes `INV_TEASER`, `INV_COMMIT`, `SUB_DOCS`, `ASSIGN_PART` and the participation merge fields.
- **Servicing module:** supplies computed payoff figures for `PAYOFF_DEMAND`, payment data for `SEQ_PAYMENT_REMINDER`/`SEQ_MATURITY_NOTICE`, and draw ledger for `DRAW_REQ`/`INSP_RPT`.
- **Compliance module:** consumes `DECLINE_LTR` render receipts for the 30-day adverse-action clock and stores decline reason codes; owns TCPA `sms_consent` evidence.
- **User/Roles module:** `ADMIN` permission gate for editing; role-based render permissions; PRIN as default countersigner.
# Module 09 — System Integration & Architecture

This section defines the canonical data model, the event bus that glues every module together, the permission matrix for all nine roles, the third-party integration surface, and the cross-cutting services (notifications, audit, environments, public API). Every other module (pipeline, docs, capital, servicing, SBA, borrower/investor portals) reads and writes the entities and events defined here; nothing in the portal moves state except through these entities, and nothing automates except by consuming the events in §9.3. Design stance: one Postgres database, one append-only event log, one owner per record, data entered once and referenced forever.

---

## 9.1 Platform conventions (binding on all modules)

- **Stack:** Next.js (App Router) + Prisma + Postgres (Neon, prod branch with PITR), matching the existing repo. Three route groups, one deploy: `/(ops)`, `/(borrower)`, `/(investor)` (+ `/(broker)` behind a flag). Background jobs and event consumers run on Inngest (serverless-friendly, retries built in). File storage: AWS S3 (versioned, SSE-KMS). Deployed on Vercel.
- **Tenancy:** single-tenant (Lendrock only). No `tenant_id` column; do not build multi-tenancy speculatively.
- **IDs:** ULIDs with typed prefixes: `con_` Contact, `co_` Company, `ld_` Lead, `dl_` Deal, `col_` Collateral, `dr_` DocumentRequest, `doc_` Document, `tsk_` Task, `sev_` StageEvent, `apv_` Approval, `inv_` Investor, `par_` Participation, `txn_` Transaction, `drw_` DrawRequest, `tpl_` Template, `msg_` MessageLog, `pl_` PartnerLender, `brk_` Broker, `lic_` LicenseRecord, `aud_` AuditLog, `evt_` DomainEvent, `usr_` User, `ntf_` Notification.
- **Money:** integer cents in `*_cents` columns. Rates/percentages in basis points in `*_bps` columns (12.5% = 1250). Never floats.
- **Time:** all timestamps `timestamptz` UTC, suffixed `_at`. Dates (maturity, due dates) as `date`, suffixed `_date`.
- **Statuses:** SCREAMING_SNAKE enums, defined once in this section; other modules must not invent parallel status fields.
- **Deletes:** no hard deletes on business entities. `archived_at` soft-delete, ADMIN only. AuditLog and DomainEvent are INSERT-only at the DB-grant level.
- **Stage ownership split:** the canonical pipeline `NEW_LEAD → CONTACTED → QUALIFIED` lives on **Lead**; `APPLICATION → … → PAID_OFF` lives on **Deal**. Conversion at QUALIFIED creates the Deal (see §9.2.7). The unified pipeline board is a UNION view over both.

---

## 9.2 Canonical data model

### 9.2.1 Party entities

**User** (internal staff) — `user_id`, `email`, `full_name`, `role` (LO | PROC | UW | CM | PRIN | ADMIN), `phone`, `calendar_connected` (bool), `is_active`, `created_at`. Auth: email + mandatory TOTP for internal roles. External roles (BORROWER, INVESTOR, BROKER) authenticate against **PortalAccount** — `portal_account_id`, `role`, `contact_id` (FK), `email`, `mfa_enabled`, `last_login_at`, `status` (INVITED | ACTIVE | SUSPENDED); magic-link login with SMS OTP step-up for money actions.

**Contact** (a human; borrower principal, guarantor, investor person, broker person, attorney, title officer) — `contact_id`, `first_name`, `last_name`, `email` (unique, normalized lowercase), `phone_mobile` (E.164), `phone_office`, `mailing_address` (jsonb: line1/line2/city/state/zip), `ssn_last4`, `ssn_token` (vault reference, never plaintext), `dob_date`, `citizenship_status` (US_CITIZEN | US_NATIONAL | PERMANENT_RESIDENT | FOREIGN_NATIONAL — factual status; SBA eligibility mapping lives in the `sba_eligible_citizenship_statuses` config, Module 05 §5.4), `estimated_fico`, `sms_consent_at`, `sms_opt_out_at`, `email_unsubscribed_at`, `source` (WEBSITE | BROKER | REFERRAL | EVENT | MANUAL), `owner_user_id` (LO), `created_at`.

**Company** (borrower entity, guarantor entity, vendor) — `company_id`, `legal_name`, `dba_name`, `entity_type` (LLC | CORP | LP | SOLE_PROP | TRUST — SOLE_PROP is valid for vendor records only; borrower and guarantor companies must be LLC | CORP | LP, since natural-person borrowers are barred portal-wide per Module 11 §A1 rule 3), `ein_token` (vault ref), `ein_last4`, `state_of_formation`, `formation_date`, `naics_code`, `annual_revenue_cents`, `business_address` (jsonb), `website`, `kyb_status` (UNVERIFIED | PENDING | VERIFIED | FAILED), `kyb_report_id` (Middesk), `created_at`.

**ContactCompanyRole** (join) — `contact_id`, `company_id`, `role` (OWNER | OFFICER | GUARANTOR_SIGNER | AUTHORIZED_SIGNER | ACCOUNTANT), `ownership_pct_bps`. One contact can sit on many companies; ownership percentages drive who must personally guarantee (default rule: every OWNER ≥ 20% guarantees).

**Broker** — `broker_id`, `company_id` (FK, the brokerage), `primary_contact_id` (FK), `status` (PROSPECT | AGREEMENT_SENT | ACTIVE | SUSPENDED), `agreement_document_id`, `w9_document_id`, `default_commission_bps`, `payment_method` (ACH | CHECK), `ach_details_token`, `deals_referred_count` (derived), `created_at`.

**Investor** — `investor_id`, `display_name`, `investor_type` (Module 07 §1.1: INDIVIDUAL | ENTITY — IRA/SD_401K are `entity_type` values, not investor types), `primary_contact_id` (FK), `company_id` (FK, nullable), `accreditation_status` (Module 07 §1.3: NOT_STARTED | PENDING_REVIEW | VERIFIED | EXPIRED | REJECTED), `accreditation_verified_at`, `accreditation_expiry_date`, `w9_or_w8_document_id`, `ach_distribution_token` (vault ref), `wire_instructions_document_id`, `target_allocation_cents`, `preferred_deal_types` (array of HM|BB|WC), `min_yield_bps`, `status` (Module 07 §1.7: PROSPECT | ONBOARDING | ACTIVE | INACTIVE, with `compliance_hold` as the orthogonal flag), `owner_user_id` (CM), `created_at`.

**PartnerLender** (SBA/bank partners) — `partner_lender_id`, `name`, `lender_type` (BANK | SBLC | CREDIT_UNION | CDC — Module 05 §5.7; program appetite lives in `programs`), `primary_contact_id` (FK), `programs` (jsonb: min/max amount, excluded industries, min FICO, min DSCR), `referral_fee_bps_default`, `referral_agreement_document_id`, `avg_days_to_close`, `pull_through_rate_bps` (derived), `status` (ACTIVE | PAUSED), `submission_method` (EMAIL | PORTAL | API), `created_at`.

### 9.2.2 Pipeline entities

**Lead** — `lead_id`, `stage` (NEW_LEAD | CONTACTED | QUALIFIED | CONVERTED | DEAD, plus intake-hold statuses SPAM_QUARANTINE | EMAIL_REVIEW — Module 01 §1), `dead_reason` (a **DeadReason** code — shared taxonomy below; Module 01 §7.2 lists the lead-stage codes: UNRESPONSIVE | APP_ABANDONED | WENT_COMPETITOR | RATE_TOO_HIGH | FEES_TOO_HIGH | LEVERAGE_TOO_LOW | TIMING_NOT_READY | PROJECT_CANCELLED | INELIGIBLE_DQ | BROKER_PULLED | DUPLICATE | SPAM_JUNK | OTHER), `contact_id` (FK, required — created/deduped at intake, never inline text), `company_id` (FK, nullable at intake), `broker_id` (FK, nullable), `deal_type` (HM | BB | WC | SBA | UNKNOWN), `requested_amount_cents`, `use_of_funds` (text), `property_address` (jsonb, HM only), `funding_timeline` (ASAP_2W | W2_4 | M1_3 | EXPLORING — Module 01 §1 canonical; the scoring model (01 §4.3) and deal-type disambiguation (01 §4.2) key on these exact buckets), `source`, `utm` (jsonb: source/medium/campaign/term/content + landing_page_url + gclid), `owner_user_id` (LO), `first_contact_sla_due_at`, `qualified_at`, `converted_deal_id` (FK, set once), `created_at`.

**DeadReason (shared terminal-reason taxonomy)** — `dead_reasons(code PK, core_code, pathway_scope, label, active)`. `core_code` is the single canonical cross-pathway enum: `DEAD_UNRESPONSIVE | DEAD_WITHDREW | DEAD_APP_ABANDONED | DEAD_TERMS_REJECTED | DEAD_LOST_COMPETITOR | DEAD_TIMING | DEAD_PROJECT_CANCELLED | DEAD_DEAL_TYPE_MISMATCH | DEAD_OUT_OF_MARKET | DEAD_BROKER_PULLED | DEAD_DUPLICATE | DEAD_INELIGIBLE | DEAD_SPAM_JUNK | DEAD_OTHER`. Pathway modules may define extension codes (rows scoped by `pathway_scope`), but every extension code maps to exactly one `core_code`: Module 01's lead codes map 1:1 (`UNRESPONSIVE` → `DEAD_UNRESPONSIVE`, `TIMING_NOT_READY` → `DEAD_TIMING`, `WENT_COMPETITOR` → `DEAD_LOST_COMPETITOR`, `RATE_TOO_HIGH`/`FEES_TOO_HIGH`/`LEVERAGE_TOO_LOW` → `DEAD_TERMS_REJECTED`, `INELIGIBLE_DQ` → `DEAD_INELIGIBLE`, …); Module 02's `DEAD_LOST_RATE`/`DEAD_LOST_LEVERAGE`/`DEAD_LOST_SPEED` → `DEAD_LOST_COMPETITOR` and `DEAD_DEPOSIT_UNPAID`/`DEAD_DOCS_STALLED` → `DEAD_APP_ABANDONED`; Module 03's `DEAD_RATE_SHOPPER` and Module 04's `DEAD_TERMS_REJECTED` → `DEAD_TERMS_REJECTED`. The pathway-mismatch concept is **one code everywhere**: `DEAD_DEAL_TYPE_MISMATCH` (Modules 02/03/04). `Lead.dead_reason` and `Deal.dead_reason` store the specific code; cross-pathway analytics (Module 10 §10.1.2 Pareto), re-engagement automation (Module 01 §7.3), the shared terminal-stage service (Module 03 §9), and `SEQ_DEAD_NURTURE` (Module 08 §8.2G) all key off `core_code` only.

**Deal** — `deal_id`, `deal_number` (human key: `LRC-2026-0042`), `lead_id` (FK, provenance), `deal_type` (HM | BB | WC | SBA), `product_subtype` (HM: HM_FF | HM_BTP | HM_GUC; BB: BB_CRE | BB_BIZ; WC: REVOLVING_LOC; SBA: SBA_7A | SBA_504 | SBA_EXPRESS | BANK_CONVENTIONAL), `stage` (APPLICATION | TERM_SHEET | UNDERWRITING | APPROVED | DOCS_CLOSING | FUNDED | SERVICING | PAID_OFF | DEAD | DECLINED; SBA pathway adds ENGAGED | LENDER_MATCHING | SUBMITTED and ends at FUNDED — Module 05 §5.1), `dead_reason` (a DeadReason code — shared taxonomy above), `declined_reason_codes` (array; feeds adverse-action letter), `adverse_action_sent_at`, `compliance_hold` (bool), `borrower_company_id` (FK), `primary_contact_id` (FK), `broker_id` (FK nullable), `broker_commission_bps`, `owner_user_id` (stage owner, exactly one, reassigned by SYS on stage change), `lo_user_id`, `uw_user_id`, `requested_amount_cents`, `approved_amount_cents`, `funded_amount_cents`, `rate_bps`, `origination_fee_bps`, `term_months`, `amortization` (INTEREST_ONLY | AMORTIZING | REVOLVER), `ltv_bps`, `ltc_bps`, `arv_ltv_bps`, `dscr_bps`, `maturity_date`, `funding_source` (BALANCE_SHEET | PARTICIPATED | PARTNER_FUNDED), `partner_lender_id` (FK, SBA only), `referral_fee_bps` (SBA only), `referral_fee_status` (NA | EXPECTED | INVOICED | RECEIVED), `stage_entered_at`, `stage_sla_due_at`, `next_payment_due_date`, `payoff_amount_cents`, `created_at`. Terms at issuance are snapshotted into the TermSheet document render — the Deal row always holds *current* terms.

**Collateral** — `collateral_id`, `deal_id` (FK), `collateral_type` (REAL_ESTATE | EQUIPMENT | AR | INVENTORY | BLANKET_UCC | PERSONAL_GUARANTY_ONLY), `address` (jsonb), `county`, `apn`, `property_type` (SFR | MULTI_2_4 | MULTI_5PLUS | MIXED_USE | COMMERCIAL | LAND), `occupancy` (VACANT | TENANT | OWNER_BUSINESS), `purchase_price_cents`, `as_is_value_cents`, `arv_cents`, `rehab_budget_cents`, `avm_value_cents`, `avm_report_id`, `appraisal_value_cents`, `appraisal_document_id`, `appraisal_status` (NOT_ORDERED | ORDERED | SCHEDULED | RECEIVED | REVIEWED), `lien_position` (FIRST | SECOND), `senior_debt_cents`, `title_status` (NOT_ORDERED | ORDERED | COMMITMENT_RECEIVED | CLEARED), `insurance_status` (NOT_REQUESTED | REQUESTED | BINDER_RECEIVED | VERIFIED), `insurance_expiry_date`, `created_at`. One Deal has 0..n Collateral rows (cross-collateralized HM deals are common).

**StageEvent** (immutable stage history for Lead and Deal) — `stage_event_id`, `subject_type` (LEAD | DEAL), `subject_id`, `from_stage`, `to_stage`, `actor_user_id` (null when SYS), `reason` (text, required for DEAD/DECLINED and any backward move), `gate_snapshot` (jsonb: which exit criteria were satisfied and by what evidence), `occurred_at`. Every stage KPI (velocity, conversion, SLA compliance) is computed from this table only.

**Task** — `task_id`, `deal_id` (FK nullable — tasks also attach to Lead, Investor, Broker via `subject_type`/`subject_id`), `title`, `description`, `owner_role` (LO | PROC | UW | CM | PRIN | SYS), `owner_user_id` (resolved from role at spawn; exactly one), `status` (OPEN | IN_PROGRESS | WAITING_EXTERNAL | BLOCKED | DONE | SKIPPED | CANCELLED — single canonical enum; SKIPPED replaces the former WAIVED, gated by `skip_requires_role` + `skip_reason_code`), `blocked_reason`, `due_at`, `sla_minutes`, `playbook_code` (which template spawned it, e.g. `HM_UNDERWRITING_V3.task_07`), `is_gate` (bool — gate tasks block stage exit), `completed_by_user_id`, `completed_at`, `created_at`. The task engine (Module 10 §10.6) extends this same table with execution columns (`sla_state`, `waiting_on`, `task_key`, …) — it is one entity, not two.

**Approval** — `approval_id`, `deal_id` (FK), `approval_type` (CREDIT_DECISION | TERM_SHEET_ISSUE | EXCEPTION | RATE_DISCOUNT | DRAW_RELEASE | PAYOFF_QUOTE | PARTICIPATION_ALLOCATION | ADVERSE_ACTION), `requested_by_user_id`, `approver_role` (default PRIN; PAYOFF_QUOTE defaults UW; DRAW_RELEASE defaults per Module 02 §5.3 routing — PROC when ≤ $25k and the inspection supports 100% of the request, else UW), `approver_user_id`, `status` (PENDING | APPROVED | APPROVED_WITH_CONDITIONS | DECLINED | RETURNED | EXPIRED — RETURNED sends the request back to UW with a note), `conditions` (jsonb array; each condition auto-creates a gate Task), `basis_snapshot` (jsonb: the numbers the approver saw — amount, LTV, FICO, DSCR — frozen at request time), `decided_at`, `expires_at` (default 30 days), `created_at`. Per-approver decisions live in the child table `approval_signoffs` (Module 10 §10.2.2), which extends this entity — no parallel approvals table exists. Approvals are decisioned in-app only (no email-reply approvals); the row is the evidence.

### 9.2.3 Documents & communication

**DocumentRequest** (a checklist item asking a party for a document) — `document_request_id`, `deal_id` (FK), `requested_from` (BORROWER | GUARANTOR | BROKER | INTERNAL | THIRD_PARTY), `requested_from_contact_id`, `doc_code` (stable catalog key from the Module 06 §1 master matrix — the single registry, e.g. `BANK_STMT_BIZ`, `PURCHASE_CONTRACT`, `ENT_ARTICLES`, `PFS`, `TAX_RETURN_BIZ`, `REHAB_BUDGET`, `INS_PROPERTY`), `title`, `instructions`, `status` (REQUESTED | UPLOADED | IN_REVIEW | ACCEPTED | REJECTED | WAIVED | EXPIRED — the lifecycle is owned by Module 06 §2.1 and this enum mirrors it exactly; mapping from earlier drafts: OPEN → REQUESTED, SUBMITTED → UPLOADED), `rejection_reason`, `is_gate` (bool), `stage_required_by` (which Deal stage this gates), `due_at`, `waived_by_user_id`, `template_code` (checklist template that spawned it), `created_at`. Checklists are spawned per `deal_type` × stage from Template rows — PROC never hand-builds a checklist.

**Document** (an actual file) — `document_id`, `document_request_id` (FK nullable — internal docs have none), `deal_id` (FK nullable), `subject_type`/`subject_id` (polymorphic: also attaches to Investor, Broker, Company), `doc_code`, `file_name`, `s3_key`, `mime_type`, `size_bytes`, `sha256`, `version` (int, auto-increment per request), `uploaded_by` (portal_account_id or user_id), `virus_scan_status` (PENDING | CLEAN | INFECTED), `review_status` (UNREVIEWED | ACCEPTED | REJECTED), `reviewed_by_user_id`, `esign_envelope_id` (Dropbox Sign signature_request_id, nullable), `esign_status` (NA | SENT | VIEWED | PARTIALLY_SIGNED | COMPLETED | DECLINED | VOIDED), `expires_at` (e.g. credit reports 120 days, insurance binders at policy expiry), `pii_class` (PUBLIC | INTERNAL | SENSITIVE | REGULATED), `created_at`. New uploads to the same request create a new version; nothing is overwritten.

**Template** — `template_id`, `template_code` (unique, e.g. `EMAIL_STAGE_UNDERWRITING_HM_V2`), `template_type` (EMAIL | SMS | DOC_CHECKLIST | TASK_PLAYBOOK | MERGE_DOC | TERM_SHEET | ADVERSE_ACTION | INVESTOR_UPDATE), `deal_type_scope` (array or ALL), `stage_scope`, `subject` (email only), `body` (Handlebars; variables resolve from the Deal/Contact/Company graph — an unresolvable variable is a render error and the send is blocked), `attachments_doc_codes`, `version` (int; sends record the exact version used), `is_active`, `updated_by_user_id`, `updated_at`.

**MessageLog** — `message_log_id`, `channel` (EMAIL | SMS | PORTAL_MESSAGE | LETTER | CALL_LOG — single canonical enum; Module 10 §10.3 `messages` is this entity), `direction` (OUTBOUND | INBOUND), `subject_type`/`subject_id` (DEAL | LEAD | INVESTOR | BROKER), `contact_id`, `user_id` (sender/logger; null when SYS), `template_code` + `template_version` (null for freeform), `subject`, `body_preview` (first 500 chars; full body in S3 at `body_s3_key`), `provider` (POSTMARK | TWILIO | NYLAS), `provider_message_id`, `delivery_status` (QUEUED | SENT | DELIVERED | OPENED | BOUNCED | FAILED | UNDELIVERED), `occurred_at`. Nylas sync writes inbound/outbound Gmail/Outlook messages here matched by contact email — the deal timeline shows *every* touch, regardless of where it was typed.

### 9.2.4 Capital & money movement

**Participation** — `participation_id`, `deal_id` (FK), `investor_id` (FK), `amount_cents`, `pct_bps` (of funded amount), `investor_rate_bps` (yield to investor; spread vs `Deal.rate_bps` is Lendrock's servicing strip), `status` (SOFT_COMMIT | DOCS_OUT | SIGNED | WIRED | ACTIVE | REPAID | WITHDRAWN | CANCELLED — Module 07 §3.1), `participation_agreement_document_id`, `wire_expected_by_date`, `wired_txn_id` (FK Transaction), `funded_at`, `redeemed_at`, `created_at`. Model is per-deal pari-passu participation (not fund units) — see open questions.

**Transaction** (single ledger for all money movement) — `transaction_id`, `deal_id` (FK nullable — investor-level distributions still reference deal), `txn_type` (LOAN_FUNDING_OUT | PARTICIPATION_IN | RETURN_OF_FUNDS_OUT (cancelled participation refund — Module 07 §3.2) | DRAW_OUT | PAYMENT_IN | PAYOFF_IN | DISTRIBUTION_OUT | BROKER_COMMISSION_OUT | REFERRAL_FEE_IN | FEE_IN | ESCROW_HOLD | ADJUSTMENT), `direction` (IN | OUT), `method` (WIRE | ACH | CHECK | INTERNAL), `amount_cents`, `counterparty_type` (BORROWER | INVESTOR | BROKER | PARTNER_LENDER | TITLE_COMPANY | VENDOR), `counterparty_id`, `status` (PENDING | INITIATED | SETTLED | RETURNED | FAILED | CANCELLED), `initiated_by_user_id`, `second_approver_user_id` (required for all OUT ≥ $10,000 — dual control, approver ≠ initiator, enforced in code), `bank_reference`, `plaid_transaction_id` (set by auto-match), `effective_date`, `allocation` (jsonb: principal_cents / interest_cents / late_fee_cents / escrow_cents split for PAYMENT_IN), `qb_synced_at`, `qb_journal_id`, `memo`, `created_at`.

**DrawRequest** (HM construction/rehab draws against holdback) — `draw_request_id`, `deal_id` (FK), `draw_number` (int), `requested_amount_cents`, `approved_amount_cents`, `budget_lines` (jsonb: line_item, budgeted_cents, spent_to_date_cents, this_draw_cents, pct_complete_bps), `status` (SUBMITTED | INSPECTION_ORDERED | INSPECTION_RECEIVED | UW_REVIEW | APPROVED | PARTIALLY_APPROVED | REJECTED | DISBURSED), `inspection_vendor`, `inspection_report_document_id`, `inspection_ordered_at`, `photos_document_ids`, `rejection_reason`, `disbursement_txn_id` (FK), `submitted_via` (BORROWER_PORTAL | INTERNAL), `created_at`. Remaining holdback = deal-level derived view, never a stored duplicate.

### 9.2.5 Compliance & system

**LicenseRecord** — `license_record_id`, `holder_type` (COMPANY | USER), `holder_id`, `license_type` (LENDER_LICENSE | BROKER_LICENSE | NMLS_REGISTRATION | SOS_REGISTRATION | DBA_FILING), `jurisdiction` (state code or FED), `license_number`, `issued_date`, `expiry_date`, `renewal_task_lead_days` (default 60), `status` (ACTIVE | RENEWAL_PENDING | EXPIRED | NOT_REQUIRED), `document_id` (certificate PDF), `notes`. SYS validation: a Deal cannot pass TERM_SHEET if `collateral.address.state` (HM) or `company.business_address.state` (BB/WC) has no ACTIVE LicenseRecord and the state is flagged `license_required = true` in the jurisdiction config table. SBA deals skip this check (partner is the lender; broker-side licensing still validated where applicable).

**AuditLog** — `audit_log_id`, `seq` (bigserial), `actor_type` (USER | PORTAL_ACCOUNT | SYS | INTEGRATION), `actor_id`, `action` (CREATE | UPDATE | DELETE_SOFT | LOGIN | LOGIN_FAILED | PERMISSION_DENIED | EXPORT | DOWNLOAD | IMPERSONATE | CONFIG_CHANGE), `object_type`, `object_id`, `diff` (jsonb: {field: [before, after]} — `ssn_token`/`ein_token`/ACH tokens logged as `[REDACTED_CHANGED]`), `ip_address`, `user_agent`, `request_id`, `prev_hash`, `row_hash` (SHA-256 of prev_hash + canonical row JSON — tamper-evident chain), `occurred_at`. See §9.6.2.

**DomainEvent** (transactional outbox) — `domain_event_id`, `event_type` (see §9.3), `aggregate_type`, `aggregate_id`, `payload` (jsonb), `emitted_by` (request_id), `occurred_at`, `dispatched_at`, `attempt_count`. Written in the same DB transaction as the state change; Inngest consumers receive and fan out. At-least-once delivery; every consumer is idempotent keyed on `domain_event_id`.

**Notification** — `notification_id`, `recipient_type` (USER | PORTAL_ACCOUNT), `recipient_id`, `channel` (EMAIL | SMS | IN_APP), `template_code`, `payload` (jsonb), `dedupe_key`, `status` (QUEUED | SENT | SUPPRESSED | FAILED), `suppressed_reason` (UNSUBSCRIBED | QUIET_HOURS | DEDUPED | PREF_OFF), `message_log_id` (FK once sent), `created_at`.

### 9.2.6 ERD (indented text; `1—n` unless noted)

```
Contact
├── ContactCompanyRole ──> Company            (n—n with role + ownership_pct_bps)
├── Lead.contact_id                            (contact is source of truth; lead never stores name/email)
├── Deal.primary_contact_id
├── PortalAccount.contact_id                   (1—1 per role)
├── Investor.primary_contact_id
├── Broker.primary_contact_id
├── PartnerLender.primary_contact_id
└── MessageLog.contact_id

Company
├── Lead.company_id
├── Deal.borrower_company_id
├── Broker.company_id
└── LicenseRecord.holder_id                    (when holder_type = COMPANY)

Lead
├── converted_deal_id ──> Deal                 (0—1, set once, immutable after set)
├── StageEvent (subject_type = LEAD)
├── Task (subject_type = LEAD)
└── MessageLog (subject_type = LEAD)

Deal
├── Collateral                                 (0—n)
│   └── Document (appraisal, title, insurance via doc_code)
├── DocumentRequest
│   └── Document                               (versions 1..n per request)
├── Task
├── StageEvent (subject_type = DEAL)
├── Approval
├── Participation ──> Investor                 (n—n via Participation)
│   └── Transaction (wired_txn_id)
├── Transaction                                (fundings, payments, draws, distributions, fees)
├── DrawRequest
│   └── Transaction (disbursement_txn_id)
├── Broker (broker_id)                         (n—1)
├── PartnerLender (partner_lender_id)          (n—1, SBA only)
└── MessageLog (subject_type = DEAL)

Template ──< spawns >── DocumentRequest, Task, Notification, MessageLog (by template_code)
User ──< owns >── Lead, Deal, Task, Approval decisions
DomainEvent ──< fan-out >── Notification, Task (playbooks), integration calls
AuditLog ──< records >── every write to every table above
```

### 9.2.7 Lead → Deal conversion: the enter-once rule

1. **At intake** (website POST or manual entry) the system immediately creates or dedupes `Contact` (match on normalized email, else E.164 phone) and, when an entity name is given, `Company` (match on EIN, else fuzzy legal_name + state). The Lead row holds only FKs plus deal-shaped intake fields. There is no free-text "name" field anywhere on Lead.
2. **Dedupe UX:** on match, the form shows "Existing contact: Jane Rivera (2 prior deals)" and links; LO confirms rather than retypes. Merge tool (ADMIN) repoints FKs and logs to AuditLog.
3. **Conversion** (single trigger, owned by Module 01 §6: SYS auto-converts the moment a `QUALIFIED` lead's borrower **starts** the application — `app_started_at` set — so the Deal exists and PROC's APPLICATION-stage chase engine (daily nudges, checklist, `SEQ_APP_ABANDONED`) owns the borrower from the first keystroke; LO may also click Convert earlier to create the Deal manually — never later): a single transaction (a) creates Deal with `lead_id` and applies the promotion field map — `requested_amount_cents`, `deal_type`, `use_of_funds`, `broker_id`, `owner_user_id` → `lo_user_id`; (b) creates Collateral from `lead.property_address` when deal_type = HM; (c) sets `lead.stage = CONVERTED` and `lead.converted_deal_id`; (d) freezes the Lead read-only; (e) emits `lead.converted`. The promotion map is code, not manual — **no field captured on Lead or on the public form is ever retyped into the Deal.**
4. Application forms shown to the borrower **pre-fill** every known value from the Contact/Company/Lead graph; borrower edits write back to the canonical entity (with AuditLog diff), not to a parallel application record.

---

## 9.3 Event & trigger catalog

### 9.3.1 Backbone

Transactional outbox (`DomainEvent`) → Inngest functions. Rules: consumers are idempotent (`domain_event_id` dedupe); consumer failure retries 5× exponential then lands in a dead-letter view on the ADMIN dashboard with an alert to ADMIN; no module calls another module's code directly — cross-module effects happen **only** by consuming these events. Event payloads carry `aggregate_id` plus a minimal snapshot (stage, deal_type, owner) so consumers rarely need a read-back.

### 9.3.2 Catalog

| Event | Emitted when | Automated consequences (SYS) | Human notification |
|---|---|---|---|
| `lead.created` | Website POST or manual entry commits | Dedupe/link Contact+Company; route: assign `owner_user_id` per Module 01 §5.1 routing rules (FIXED single LO today; ROUND_ROBIN ships dormant; broker-sourced leads to that broker's house LO); set `first_contact_sla_due_at` (+5 business minutes — Module 01 §5.2); send borrower acknowledgment email (`EMAIL_LEAD_ACK`) | LO: SMS + in-app "New lead" |
| `lead.stage_changed` | Any Lead stage move | Write StageEvent; spawn stage playbook Tasks from `TASK_PLAYBOOK` template; recompute SLA timer | Owner in-app |
| `lead.sla_breached` | `first_touch_due_at` passes with no human outbound | CALL task + SMS to the designated first-touch backup (PROC — Module 01 §5.1); backup outbound satisfies `first_touch_at`; ownership stays with the LO (no reassignment until a second LO exists) | Backup (PROC), then PRIN escalation |
| `lead.converted` | Conversion transaction commits | Create Deal + Collateral (§9.2.7); spawn APPLICATION checklist (DocumentRequests from `DOC_CHECKLIST` template for deal_type); provision borrower PortalAccount + invite email; start APPLICATION stage SLA | LO in-app; borrower invite email |
| `lead.dead` | LO marks DEAD with reason | Cancel open Tasks; suppress sequences; enroll in 90-day nurture list unless FRAUD_SUSPECTED | — |
| `deal.stage_changed` | Any Deal stage move (only via the gate-checked transition service) | Write StageEvent with `gate_snapshot`; cancel prior stage's non-gate open Tasks; spawn new stage playbook Tasks; reassign `owner_user_id` per stage-owner map; send borrower status email (per-stage template, per deal_type); update borrower portal progress bar; restart stage SLA timer | New owner in-app; borrower email |
| `deal.gate_blocked` | User attempts stage exit with unmet gates | Render blocking list (gate tasks + gate doc requests + required approvals) | Attempting user, inline |
| `deal.sla_breached` | `stage_sla_due_at` passes | Escalation task to PRIN; flag deal red on board | Owner + PRIN |
| `application.completed` | Borrower submits full application in portal | Trigger soft credit pull (business + personal), KYB (Middesk), KYC/OFAC (Persona) in **parallel**; spawn UW pre-screen task | LO + PROC in-app |
| `credit.pull_completed` | Bureau webhook/response stored | Write scores to Contact/Company; auto-fail rule: FICO < deal_type floor → spawn PRIN exception Approval instead of silent decline; re-evaluate current stage gate | UW in-app |
| `screening.completed` | Persona/Middesk verdict stored | OFAC/watchlist hit → `compliance_hold = true`, block all stage moves | PRIN + ADMIN immediately (SMS) |
| `screening.hit_cleared` | PRIN clears a screening hit in-app | Unfreeze; log Approval (type EXCEPTION) | Owner |
| `term_sheet.issued` | LO issues term sheet (within pre-screen guardrails; pricing/structure exceptions require a PRIN TERM_SHEET_ISSUE Approval first — pathway modules) | Render term sheet PDF from `TERM_SHEET` template; send via Dropbox Sign; start 10-day expiry timer (canonical TS window) | Borrower email+SMS; LO in-app |
| `term_sheet.signed` | Dropbox Sign completion webhook | Store signed PDF as Document; advance gate; spawn UNDERWRITING checklist (deal_type-specific); deposit-collection Task (PROC) | LO + PROC |
| `term_sheet.expired` | 10 days, unsigned | Task LO "revive or kill"; auto-DEAD at day 14 with reason `DEAD_TERM_SHEET_EXPIRED` unless LO overrides | LO |
| `document_request.created` | Checklist spawn or manual add | Borrower portal checklist updates; included in batched borrower digest (not one email per item) | — (digest) |
| `document.uploaded` | Any portal/internal upload | S3 AV scan; sha256; auto-classify by doc_code; set request UPLOADED (→ IN_REVIEW on clean scan, Module 06 §2.1); spawn review Task (PROC) | PROC in-app |
| `document.accepted` | PROC/UW accepts | Set request ACCEPTED; **re-evaluate current stage gate; auto-advance stage if all gates now pass and stage is flagged auto-advance** (APPLICATION and DOCS_CLOSING are; UNDERWRITING never is) | — |
| `document.rejected` | Reviewer rejects with reason | Reopen request with reason; borrower notified with specific fix instructions | Borrower email; LO cc |
| `document.expiring` | 30/7/0 days before `expires_at` | Reopen DocumentRequest for refresh (insurance; credit reports > 120 days pre-close) | PROC; borrower if borrower-supplied |
| `esign.envelope_completed` | Dropbox Sign webhook (any envelope) | File signed doc; flip esign_status; gate re-eval | Envelope requester |
| `valuation.avm_received` | HouseCanary response | Write `avm_value_cents`; variance vs borrower-stated value > 15% → flag Task for UW | UW if flagged |
| `valuation.appraisal_received` | Appraisal PDF uploaded/webhook | Set appraisal fields; recompute LTV/LTC/ARV-LTV on Deal; variance vs AVM > 10% → UW review Task | UW |
| `approval.requested` | Any Approval created | In-app + SMS to approver with `basis_snapshot` summary; 24 h reminder; 72 h escalation | Approver |
| `approval.decided` | Approver acts | APPROVED_WITH_CONDITIONS → auto-create gate Task per condition; CREDIT_DECISION APPROVED → advance to APPROVED + spawn DOCS_CLOSING playbook; DECLINED → move deal to DECLINED | Requester; borrower on credit decision (templated) |
| `deal.declined` | Stage set to DECLINED | Generate adverse-action letter from `ADVERSE_ACTION` template using `declined_reason_codes` (Reg B business-credit notice within 30 days); Task PROC "send AA letter" with 25-day hard SLA; set `adverse_action_sent_at` on completion; retain file per policy | PROC; PRIN cc |
| `deal.dead` | Stage set to DEAD | Cancel tasks/requests; void open envelopes; auto-cancel COMMITTED participations and notify those investors; nurture enroll | Owner; CM if participations existed |
| `closing.scheduled` | PROC sets closing_date | Calendar events (Nylas) for LO/PROC + borrower invite; wire-prep Task chain (funding memo, dual-control setup); title/insurance final-check Tasks | All deal staff |
| `deal.funded` | Funding Transaction SETTLED | Stage → FUNDED, then auto → SERVICING at T+1; generate servicing schedule (payment due dates → future `payment.due_upcoming` timers); broker commission Transaction (PENDING) if broker deal; welcome-to-servicing borrower email; QuickBooks journal (loan asset + fee income); investor funding confirmations | Borrower; broker; deal investors; CM |
| `participation.offered` | CM allocates investor to deal | Investor portal shows offering + sanitized deal summary; offer window closes at the allocation `commitment_deadline` (72h after teaser; each commit holds 48h pending docs — Module 07 §3.1/§3.2 authoritative) | Investor email |
| `participation.committed` | Investor accepts in portal | Generate participation agreement (MERGE_DOC) → Dropbox Sign; wire instructions issued from vault (never edited in email); `wire_expected_by_date` = signing + 2 business days (Module 07 §3.2 authoritative) | CM; investor |
| `participation.wired` | Plaid feed auto-match or CM manual match of incoming wire | Status → WIRED; link `wired_txn_id`; **update capital dashboard (deal coverage % and unallocated exposure)**; all participations WIRED → funding-ready flag on deal | CM |
| `participation.shortfall` | `wire_expected_by_date` passed, not WIRED | Task CM "chase or replace"; deal flagged funding-at-risk | CM + PRIN |
| `draw_request.submitted` | Borrower submits in portal | Validate against remaining budget lines (over-budget line → auto-reject with message); order inspection (PROC Task with vendor template email); status → INSPECTION_ORDERED | PROC |
| `draw_request.inspection_received` | Report uploaded | Compare pct_complete vs requested; auto-recommend `approved_amount_cents`; review Task + Approval (DRAW_RELEASE) routed per Module 02 §5.3: PROC when ≤ $25k and inspection supports 100% of the request, else UW | PROC or UW per §5.3 routing |
| `draw_request.approved` | DRAW_RELEASE Approval decided (PROC or UW per §5.3 routing) | Disbursement Transaction (PENDING, dual control); borrower notified with amount + ETA | Borrower; PROC |
| `draw.disbursed` | Transaction SETTLED | Draw DISBURSED; remaining holdback recomputed; QB journal | Borrower |
| `payment.due_upcoming` | T−5 days before due date (SYS timer) | Borrower reminder email; T−1 SMS | Borrower |
| `payment.received` | ACH settle or Plaid wire match | Allocate per `allocation` waterfall (default: late fees → interest → principal); **compute investor splits pro-rata by pct_bps net of servicing strip; create DISTRIBUTION_OUT Transactions (PENDING), batched monthly**; QB journal; borrower receipt | CM digest |
| `payment.late` | Due date + grace (HM/BB 10 days, WC 5) with no SETTLED payment | Late-fee Transaction per note terms; dunning sequence day 1/5/10 (email, email+SMS, LO call Task); deal flagged DELINQUENT (flag, not stage) | LO + PRIN |
| `payment.nsf` | ACH return code received | Reverse allocation; NSF fee; one re-presentment max per auth; escalate Task LO | LO; borrower |
| `payoff.quote_requested` | Borrower portal request or LO | Compute payoff (principal + accrued + fees, per-diem, 10-day good-through); Approval (PAYOFF_QUOTE, UW); render letter | Borrower on approval |
| `payoff.received` | Payoff funds SETTLED | Stage → PAID_OFF; release/reconveyance Task chain (PROC, 30-day SLA); final investor distributions + principal return; QB close-out journals | Borrower; investors; PROC |
| `distribution.sent` | DISTRIBUTION_OUT SETTLED | Investor statement line; portal balance update | Investor (monthly statement, not per-txn) |
| `partner.package_sent` | SBA package submitted to PartnerLender | 7-day follow-up Task (LO); log expected `referral_fee_bps` | LO |
| `partner.status_update` | Partner reply logged (email-in or manual) | Update SBA sub-status; translated borrower status email | LO; borrower |
| `partner.funded` | Partner confirms close | Deal → FUNDED (`funding_source = PARTNER_FUNDED`); referral-fee invoice (REFERRAL_FEE_IN Transaction PENDING + QB invoice); fee aging watch at 30/45 days | LO; PRIN |
| `task.overdue` | `due_at` passed, not DONE | Reminder; +24 h escalate to PRIN if `is_gate` | Owner |
| `license.expiring` | T−60/T−30/T−7 before expiry | Renewal Task (PROC); at expiry with no renewal: block new TERM_SHEETs in that jurisdiction | PROC; PRIN at T−7 |
| `message.inbound` | Twilio/Postmark/Nylas inbound matched to contact | Attach to timeline; unmatched → triage-queue Task (PROC); STOP keyword → set `sms_opt_out_at`, suppress | Deal owner |
| `webhook.provider_failed` | Any integration webhook signature/processing failure | Dead-letter row; retry | ADMIN |
| `user.login_failed_5x` | 5 failures / 15 min | Lock 15 min; AuditLog | ADMIN |
| `export.performed` | Any bulk export | AuditLog with row count + filter | ADMIN weekly digest |

---

## 9.4 Permission matrix

Notation: letters = allowed verbs (C create, R read, U update, D soft-delete). Scope suffix: **:A** all rows, **:O** own/assigned rows only, **:P** party-scoped (only rows linked to that external account's contact/investor/broker), **:S** sanitized field subset (defined below). `—` = no access. ADMIN = PRIN-designated superuser + break-glass; every ADMIN write is audit-flagged.

| Object | LO | PROC | UW | CM | PRIN | ADMIN | BORROWER | INVESTOR | BROKER |
|---|---|---|---|---|---|---|---|---|---|
| Contact | CRU:A | CRU:A | R:A | CRU:A | CRU:A | CRUD:A | RU:P (self) | RU:P (self) | CR:P (own referrals) |
| Company | CRU:A | CRU:A | R:A | R:A | CRU:A | CRUD:A | RU:P | R:P | R:P |
| Lead | CRU:O, R:A | CRU:A | R:A | — | CRU:A | CRUD:A | — | — | CR:P (submit + status:S) |
| Deal | CRU:O, R:A | RU:A | RU:O, R:A | R:A, U (capital fields only) | CRU:A | CRUD:A | R:P:S | R:P:S (participated deals) | R:P:S (milestones only) |
| Collateral | CRU:O | CRU:A | RU:A | R:A | CRU:A | CRUD:A | R:P:S | R:P:S | — |
| DocumentRequest | CR:O, R:A | CRU:A | CR:A | — | CRU:A | CRUD:A | R:P + submit | — | R:P (checklist status) |
| Document | CR:O, R:A | CRU:A (accept/reject) | CRU:A (accept/reject) | R:A | CRU:A | CRUD:A | CR:P (upload + own uploads + shared-to-borrower) | R:P (participation docs + statements) | CR:P (upload on referred deals; no UW docs) |
| Task | CRU:O, R:A | CRU:A | CRU:O, R:A | CRU:O | CRU:A | CRUD:A | R:P (borrower-facing only) | — | — |
| StageEvent | R:A | R:A | R:A | R:A | R:A | R:A | — | — | — |
| Approval | CR (request) | CR (request); U:O (decide DRAW_RELEASE ≤ $25k with inspection supporting 100% — Module 02 §5.3) | CRU:O (decide DRAW_RELEASE, PAYOFF_QUOTE) | CR (request) | CRU:A (decide all) | R:A | — | — | — |
| Investor | — | — | — | CRU:A | R:A | CRUD:A | — | RU:P (self) | — |
| Participation | — | R:A | — | CRU:A | CRU:A (decide allocation) | CRUD:A | — | R:P + accept/decline | — |
| Transaction | R:O | CRU:A (initiate) | R:A | CRU:A (initiate) | CRU:A (2nd-approve) | CRUD:A | R:P:S (own payment history) | R:P:S (own distributions) | R:P:S (own commissions) |
| DrawRequest | R:A | CRU:A | RU:A (decide) | R:A | CRU:A | CRUD:A | CR:P + R:P | — | — |
| Template | R:A | RU:A | R:A | RU:A (investor templates) | CRU:A | CRUD:A | — | — | — |
| MessageLog | CR:A | CR:A | CR:A | CR:A | R:A | R:A | R:P (own thread) | R:P | R:P |
| PartnerLender | R:A | R:A | R:A | R:A | CRU:A | CRUD:A | — | — | — |
| Broker | CR:A | RU:A | — | — | CRU:A | CRUD:A | — | — | RU:P (self) |
| LicenseRecord | R:A | CRU:A | R:A | — | CRU:A | CRUD:A | — | — | — |
| AuditLog | — | — | — | — | R:A | R:A | — | — | — |
| Users / PortalAccounts | — | CR (invite borrower) | — | CR (invite investor) | CRU:A | CRUD:A | — | — | — |

**Sanitized field sets (:S):**
- **BORROWER** sees on own Deal: stage (mapped to friendly labels), requested/approved amounts, rate, term, maturity, next payment, payoff quote, checklist, draw status. Never: internal notes, UW analysis, investor data, margins, credit scores of co-guarantors.
- **INVESTOR** sees on participated Deal: deal_number, deal_type, city/state (no street address pre-funding), collateral type, LTV/ARV-LTV, `investor_rate_bps` only (deal note rate and Lendrock spread hidden), funded amount, own participation rows, payment status (CURRENT | LATE_30 | DEFAULT), maturity. Never: borrower PII pre-funding (post-funding: entity name only), other investors' participations.
- **BROKER** sees on referred Deal: milestone stages (Received → Terms Issued → In Underwriting → Approved → Funded/Dead), checklist open-count, commission amount + status. Never: counter-term amounts, internal notes, borrower docs beyond ones the broker uploaded.
- Enforcement: Postgres RLS policies per role **plus** a field-level serializer in the API (a single `serializeDeal(role)` function per entity; the UI never receives fields it can't show).

---

## 9.5 Integration points

Costs assume ~40 new deals/mo, ~120 active serviced loans, 5 staff. All webhook receivers verify provider signatures and dedupe on provider event id.

| # | Integration | Vendor (decision) | Purpose | Triggering event | Data in → out | Est. $/mo |
|---|---|---|---|---|---|---|
| 1 | E-signature | **Dropbox Sign API** (Essentials API plan). Chosen over DocuSign: ~60% cheaper at this volume, cleaner API, embedded signing in borrower/investor portals without premium SKUs. Sign templates: term sheet, participation agreement, broker agreement, loan doc packages | Legally binding signatures + audit certificate | `term_sheet.issued`, `participation.committed`, docs-out in DOCS_CLOSING, broker onboarding | Out: merged PDF + signer emails/roles. In: status webhooks, signed PDF + audit trail → Document | $100 |
| 2 | Bank data | **Plaid** (Auth + Balance + Transactions + Assets) | Borrower bank verification & cash-flow underwriting (Assets report replaces chasing 3 mo statements for WC/BB); transaction feed on Lendrock operating account for auto-matching incoming wires/payments | Borrower connects during application; nightly operating-account feed pull | Out: link tokens. In: balances, transactions, Assets report PDF+JSON → Document + Transaction matching | $150–300 (pay-as-you-go) |
| 3 | Business credit | **Experian Intelliscore Plus + Business Public Records** via reseller | Business credit score, tradelines, liens/judgments/UCCs | `application.completed` (SYS auto-pull, all deal types) | Out: legal_name, EIN, address. In: score, tradelines, derogs → jsonb on Company + PDF Document | ~$15/pull ≈ $600 |
| 4 | Personal credit (soft) | **Soft-pull tri-bureau via CRS** (reseller; avoids direct bureau credentialing at this size). Soft pull only; no hard pull ever (business-purpose lending; FICO is a guarantor screen) | Guarantor FICO + derogs without a bureau inquiry footprint | `application.completed`, per guarantor (≥ 20% owners) | Out: name, address, SSN (vault-fetched), DOB, consent timestamp. In: FICO, summary attributes → Contact + PDF Document (120-day expiry) | ~$12/pull ≈ $700 |
| 5 | KYB + business OFAC | **Middesk** | Entity verification (SOS standing, TIN match, watchlists, industry) | `application.completed`; re-run on entity field changes post-verification | Out: legal_name, EIN, address. In: verdict, SOS records, watchlist hits → `Company.kyb_status` + report Document | ~$10/report ≈ $250 |
| 6 | KYC + personal OFAC/PEP | **Persona** (Gov ID + selfie + watchlist/PEP at onboarding/application — point-in-time only; recurring re-screens are the sanctions.io batches per Module 10 §10.5.3: quarterly on all parties on ACTIVE loans, monthly on investors) | Identity + sanctions screening for guarantors and investors (investor onboarding reuses the same flow) | `application.completed` (guarantors); investor onboarding start | Out: hosted-flow inquiry link. In: verdict + extracted ID data + watchlist results → Contact | ~$250 (min commit) |
| 7 | Valuation — AVM | **HouseCanary API** | Instant value + comps at pre-screen; sanity check vs appraisal | HM Lead reaches QUALIFIED; again at `application.completed` | Out: address, APN. In: value, range, confidence, comps → `Collateral.avm_*` + report Document | ~$20/report ≈ $250 |
| 8 | Valuation — appraisal | **Phase 1: AMC ordering via templated email + webhook-in status stub** (no Reggora/Mercury until volume > 60/mo). Order email generated from Template; AMC updates parsed/logged; PDF uploaded by PROC or AMC link | Full appraisal for the HM UNDERWRITING gate | UW task "order appraisal" auto-created on UNDERWRITING entry | Out: property, contact, product (as-is/ARV), rush flag. In: ETA, scheduled date, PDF → `Collateral.appraisal_*` | pass-through to borrower; $0 platform |
| 9 | SMS | **Twilio** (1 local number, A2P 10DLC registered campaign) | Lead-speed alerts to LOs, borrower reminders, dunning, OTP step-up | Notification engine routes any SMS-channel Notification | Out: E.164 + body. In: delivery receipts, inbound replies, STOP → MessageLog + `message.inbound` | ~$75 |
| 10 | Transactional email | **Postmark** (transactional stream + separate broadcast stream for nurture; DKIM/DMARC on portal.lendrockcapital.com) | All system email | Notification engine | Out: template render. In: delivery/open/bounce webhooks → `MessageLog.delivery_status` | ~$60 |
| 11 | Email + calendar sync | **Nylas v3** (5 mailboxes, Google Workspace) | Two-way sync: staff Gmail threads with any known contact auto-log to deal timeline; closings/appraisals/calls created in-portal appear on staff calendars | Continuous sync; `closing.scheduled`; "schedule call" tasks | Out: event objects, thread queries. In: messages matched by contact email → MessageLog; free/busy | ~$75 |
| 12 | Accounting | **QuickBooks Online Plus** (API) | GL: funding journals, fee income, interest income, servicing strip, broker commissions, investor payables, SBA referral-fee invoices | `deal.funded`, `payment.received`, `distribution.sent`, `partner.funded`, month-end accrual job | Out: journal entries, invoices, vendor bills (idempotent by `transaction_id`). In: payment status on referral invoices | $99 (QBO sub; API free) |
| 13 | ACH rails | **Phase 1 (launch): manual ACH/wires via bank treasury portal**, tracked as Transactions with in-app dual control and Plaid auto-match for settlement confirmation. **Phase-1 bridge playbook (owned, not ad-hoc):** SYS renders a NACHA-format file (keyed-entry checklist fallback where the bank portal cannot import) as a PROC playbook task on the **1st** (servicing autopay debit batch — Module 10 §10.4.2 due-date debits execute from this batch until Phase 2) and the **8th** (investor distribution batch for the 10th — Module 07 §6.2); PROC uploads/keys each batch under dual control (initiator ≠ approver, per-batch confirmation task); SYS reconciles every batch line against the Plaid operating-account feed with a **2-business-day reconciliation SLA** and opens a PROC variance task on any mismatch. **Phase 2 (WC pathway go-live or ≥ ~150 transfers/mo, whichever comes first — Module 04's draw/autopay engine requires API ACH): Dwolla** for borrower payment debits, draw disbursements, investor distributions | Move money without retyping into the bank portal | Transaction status INITIATED (Phase 2: API call; Phase 1: checklist task) | Out (P2): tokenized accounts, amounts. In: settlement + return codes → `Transaction.status`, `payment.nsf` | $0 now; ~$250 at Phase 2 |
| 14 | Wire confirmation | **Process, not vendor**: outbound wires require (a) payee instructions from the vaulted record created at onboarding — never from email; (b) verbal callback to a phone number on file for new/changed instructions, logged as CALL_LOG MessageLog; (c) dual control in-app (initiator ≠ approver, both TOTP step-up); (d) settlement confirmed by Plaid feed match or Fed reference entry | Prevent wire fraud on fundings & payoff disbursements | Any Transaction, method WIRE, direction OUT | In: Plaid feed match sets SETTLED + `bank_reference` | $0 |

**Estimated integration run-rate: ~$2,600–2,900/mo** at stated volume; credit/screening lines scale linearly with application count and are per-deal costs (recover via application/processing fee).

---

## 9.6 Cross-cutting services

### 9.6.1 Notification engine

- Single service; the **only** code path allowed to send email/SMS. Modules emit domain events; a routing table (`notification_rules`: `event_type` × `recipient_role` × `channel` × `template_code` × `urgency`) maps events to Notifications. Rules are data, editable by ADMIN in-app — adding a notification never requires a deploy.
- **Channels & defaults:** URGENT (approval requests, OFAC hit, wire steps, new lead to LO) → SMS + in-app. NORMAL → email + in-app. FYI → in-app only, rolled into a daily 8:00 AM digest email per user.
- **Suppression stack**, evaluated in order: role preference off → `dedupe_key` seen in last 24 h → quiet hours (borrower/investor SMS held 21:00–08:00 recipient timezone — portal-wide send window 08:00–21:00; staff URGENT exempt) → `sms_opt_out_at` / `email_unsubscribed_at` (legally required sends like adverse action are exempt from marketing unsubscribe, never from SMS STOP). Suppressions are recorded with reason — "why didn't X get notified" is answerable from the Notification table.
- **Batching:** borrower checklist changes batch into one email per 4-hour window; investor distribution notices batch into monthly statements. Everything else sends immediately.
- All sends land in MessageLog with `template_code` + version; 2 consecutive hard bounces auto-open a PROC task to fix the contact record.

### 9.6.2 Immutable audit log

- INSERT-only enforced at the DB layer: the app role has INSERT/SELECT only on `audit_log`; no UPDATE/DELETE grant exists for any role including migrations (schema changes to this table require a dedicated migration role and PRIN sign-off).
- Hash chain: `row_hash = sha256(prev_hash || canonical_json(row))`. A nightly job verifies the chain and writes the head hash to an S3 bucket with **Object Lock (compliance mode, 7-year retention)** — tampering with history breaks the chain against an anchor even Lendrock's own DB admin cannot alter.
- What is logged: every C/U/D on business entities (field diffs, PII-redacted per §9.2.5), every login/failure, every permission denial, every export/download of a REGULATED-class document, every impersonation session (ADMIN "view as borrower" is impersonation and banner-flagged), every Template edit, every config change. Target: any regulator/investor question of the form "who changed X and when" is answerable in one query.
- Retention: indefinite in Postgres; yearly partitions; partitions older than 3 years exportable to S3 Parquet and detachable, never deleted before 7 years.

### 9.6.3 Environments, backups, data export

- **Environments:** `dev` (Neon branch per developer, seeded with faker data — production PII never leaves prod), `staging` (Vercel preview + dedicated Neon branch; all integrations in sandbox/test mode via per-env keys; Postmark/Twilio restricted to a staff allowlist; a `SYSTEM_MODE` banner renders on every non-prod page), `prod`. Promotion: PR → staging auto-deploy → manual promote. Prisma migrations run in CI with a `migrate diff` drift check.
- **Backups:** Neon PITR 30 days on prod + nightly `pg_dump` to S3 (SSE-KMS, cross-region replication, 13-month retention). Documents bucket: versioning + same replication. **Quarterly restore drill** (restore latest dump to a scratch branch; run row-count + hash-chain verification) is a recurring PROC task — a backup that has never been restored is a hope, not a backup.
- **Data export:** ADMIN self-serve full export per entity (CSV + JSONL) and per-deal "loan file" export (zip: all Documents + data-sheet PDF + timeline) for loan sales, exams, and participation due diligence. Monthly automated full export to S3 `exports/` as an ejection-seat guarantee — the portal never becomes a data hostage. Every export emits `export.performed`.
- **Secrets/PII:** Vercel env per environment; SSN/EIN/bank tokens live in a separate `vault` schema encrypted with a distinct KMS key, readable only by the credit-pull and payments code paths; ordinary app queries return `*_last4` only.

### 9.6.4 Public API & webhook surface

**Inbound — website lead form (lendrockcapital.com):**
- `POST /api/v1/public/leads` — body: `{deal_type?, requested_amount, use_of_funds, timeline, first_name, last_name, email, phone, company_name?, property_address?, utm{}, landing_page_url, sms_consent (bool), idempotency_key}`. Unknown fields land in `raw_payload` jsonb rather than erroring — the marketing site can evolve without portal deploys.
- Security: HMAC-SHA256 signature header (shared secret with the marketing site), Cloudflare Turnstile token verified server-side, hidden honeypot field (silent 200 on fill), rate limit 10/min/IP. Response `202 {lead_id}` — never reveal whether an email already exists. Duplicate `idempotency_key` (or same email + amount within 24 h) returns the original `lead_id` without creating a second Lead.
- `GET /api/v1/public/leads/:lead_id/status` — polled by the thank-you page ("an advisor will call within 15 minutes"); returns stage label only.

**Inbound — provider webhooks:** `/api/webhooks/{dropbox-sign|plaid|twilio|postmark|persona|middesk|nylas|dwolla}` — verify signature → persist raw payload to `webhook_inbox (provider, provider_event_id UNIQUE, payload, status)` → ACK 200 → translate to DomainEvent async via Inngest. Handlers never touch business tables directly; dead-letter with ADMIN alert after 5 retries.

**Outbound webhooks:** ADMIN-configurable endpoints subscribing to any DomainEvent type (payload = event + HMAC signature, 5 retries) — how a future data warehouse, Slack `#deal-flow` mirror, or partner system attaches without new code.

**Machine auth:** scoped API keys (`intake:write`, `export:read`), hashed at rest, per-key rate limits, annual rotation with an auto-created rotation task.

**Internal API:** all portal surfaces (internal, borrower, investor, broker) consume the same role-serialized REST API (`/api/v1/...`, session auth) — there is no privileged backdoor path that skips the §9.4 matrix.

---

## Interfaces with other modules

- **Pipeline/stage-flow modules (HM, BB, WC, SBA):** consume `Deal.stage` transitions via the gate-checked transition service; define their playbooks and checklists as `Template` rows (`TASK_PLAYBOOK`, `DOC_CHECKLIST`) keyed by deal_type × stage; all automations attach to §9.3 events.
- **Lead intake & marketing module:** owns `POST /api/v1/public/leads` payload mapping, the `Lead.utm` schema, routing rules consumed by `lead.created`, and nurture enrollment on `lead.dead`.
- **Underwriting module:** reads credit/KYB/KYC/valuation results written by integrations #2–#8; writes `Approval` (CREDIT_DECISION) whose outcome drives `deal.stage_changed` and the adverse-action flow.
- **Docs & closing module:** owns Dropbox Sign template mapping, MERGE_DOC generation, and the DOCS_CLOSING gate list; consumes `esign.envelope_completed`.
- **Capital markets/investor module:** owns Investor and Participation lifecycles and the capital dashboard fed by `participation.wired`; distribution math runs on `payment.received`.
- **Servicing module:** owns payment timers, the allocation waterfall config, delinquency flags, and the DrawRequest workflow; all money movement flows through the single `Transaction` ledger and QuickBooks sync (#12).
- **SBA/partner module:** owns PartnerLender matching logic and package assembly; referral-fee economics post through `partner.funded` → `REFERRAL_FEE_IN` Transaction.
- **Borrower/investor/broker portal modules:** render exclusively through the role-serialized API and §9.4 sanitized field sets; portal accounts are provisioned by `lead.converted` (borrower) and CM invite (investor).
- **Reporting module:** reads `StageEvent` (velocity/conversion), `Transaction` (yield, exposure), `AuditLog` (compliance), and the monthly S3 exports; no report writes state.
# Module 10 — Beyond the Core Six: Ops, Reporting, Approvals, Comms, Servicing, Compliance Ops

This module is the operating system that runs underneath the four deal pathways: the task engine that executes every stage playbook, the approval and credit-box machinery that gates UNDERWRITING → APPROVED, the communication hub that makes every touch auditable, the servicing engine that takes over at FUNDED, the compliance layer that keeps a 5-person shop out of regulatory trouble, and the reporting stack that tells the Principal where the pipeline leaks. Everything below is event-driven off the two canonical Module 09 logs: **StageEvent** (§9.2.2 — every stage change on every lead and deal; surfaced to reporting as the `stage_transitions` view) and **DomainEvent** (§9.3.1 — every task, message, payment, and document event; surfaced as the `activity_events` view). **Module 09 is authoritative for every entity and status enum this module touches (Task, Approval, Template, MessageLog, DocumentRequest, StageEvent/DomainEvent)** — this module adds engine behavior, reporting views, and child tables only, and defines no parallel schemas. All analytics, SLAs, digests, and automations derive from those two logs — no dashboard queries operational tables directly, and every workflow in this module ships as playbooks + rules on the task engine (§10.6), not code branches. The acceptance test: adding a fifth deal pathway later means writing playbooks and credit-box rules, zero engine changes.

---

## 10.1 Reporting & Analytics

### 10.1.1 Data foundation

- Source-of-truth stage log: the canonical **StageEvent** table (Module 09 §9.2.2 — the only source for stage KPIs), surfaced to reporting as the read view `stage_transitions(id, deal_id, from_stage, to_stage, transitioned_at, actor_id, actor_role, transition_reason)` where `deal_id = subject_id` (`subject_type = DEAL`; leads via `subject_type = LEAD`) and `transition_reason = StageEvent.reason` (required for DEAD/DECLINED entry — enforced). No second stage table exists.
- `activity_events(id, deal_id, loan_id, event_type, payload_jsonb, occurred_at, actor_id)` — read-optimized view over the canonical **DomainEvent** outbox (Module 09 §9.3.1); `event_type` values are the §9.3.2 catalog keys (`task.completed`, `message.sent`, `payment.received`, `document.uploaded`, `draw.funded`, `call.logged`).
- All dashboards read Postgres **materialized views**, refreshed nightly at 02:00 America/New_York and on-demand via a "Refresh" button (rate-limited to 1/5min). Views: `mv_funnel`, `mv_cycle_times`, `mv_lo_scorecard`, `mv_portfolio`, `mv_investor_capital`, `mv_revenue`. Nightly job also writes immutable `daily_portfolio_snapshot` rows (per loan: `outstanding_principal`, `note_rate`, `dpd_bucket`, `maturity_date`, `state`) so trends never depend on reconstructing history.
- Every dashboard has global filters: `date_range`, `deal_type` (HM/BB/WC/SBA), `lead_source`, `assigned_lo`. Every widget exports CSV. Target p95 dashboard load < 1s.

### 10.1.2 Pipeline Funnel & Conversion dashboard (`/reports/funnel`)

| # | Widget | Definition / query |
|---|--------|--------------------|
| 1 | Funnel bar chart | Count + Σ`requested_amount` of deals that **ever reached** each stage in period (dedup by deal from `stage_transitions`), canonical stage order, with stage-to-stage conversion %. |
| 2 | Conversion by source | Table: rows = `lead_source` (Module 01 enum: WEB_FORM, MATCH_ENGINE, BROKER_SUBMIT, BROKER_EMAIL, PHONE_IN, REFERRAL, EVENT, CSV_IMPORT, RECYCLED_BORROWER, REACTIVATED); columns = leads, contacted %, qualified %, app %, term sheet %, funded %, funded $, cost-per-funded (when `source_cost` entered). Sorted by funded $. |
| 3 | Conversion by deal type | Same columns, rows = HM/BB/WC/SBA. SBA "funded" = partner-bank funding event (referral fee earned). |
| 4 | Cohort pull-through | Heatmap: lead-creation month (rows) × % reaching FUNDED within 30/60/90/120 days (columns). Answers "is conversion improving?" |
| 5 | Dead/Declined pareto | Bar charts of `transition_reason` counts for DEAD and DECLINED separately; top reason gets a red callout when >35% share. |
| 6 | Stuck deals list | Active deals where `now() - current_stage_entered_at > stage_sla × 1.5`, sorted by staleness: deal, stage, owner, days in stage, last activity. Click-through to deal. |
| 7 | Repeat share | `repeat_borrower_funded_pct` = funded volume with `lead_source = RECYCLED_BORROWER` ÷ total funded volume, trailing 12m (target ≥ 30%, feeds §10.7.1). |

### 10.1.3 Cycle Time dashboard (`/reports/cycle-time`)

| # | Widget | Definition |
|---|--------|------------|
| 1 | Stage duration table | Per stage × deal type: `median_days`, `p90_days`, `n`, from consecutive `stage_transitions` pairs; period = deals that exited the stage in range. p90 cell turns red when > 2× target SLA. |
| 2 | Bottleneck ranking | Stages ranked by `median_days / target_sla_days` descending — the single "fix this first" list. |
| 3 | Lead → Funded trend | Line chart of median NEW_LEAD→FUNDED calendar days by funding month, one line per deal type. Targets: HM 14d, BB 10d, WC 7d, SBA 45d (to partner-bank funding). |
| 4 | First-touch speed | Median minutes NEW_LEAD → first outbound touch (`activity_events` where `event_type IN ('MESSAGE_SENT','CALL_LOGGED')`, direction OUT). Target ≤ 5 business minutes (Module 01 §5.2). |
| 5 | Wait vs work split | Per stage: % of elapsed time with an OPEN blocking internal task vs waiting on borrower (`waiting_on = BORROWER`). Distinguishes internal bottleneck from borrower drag. |

### 10.1.4 LO Scorecard (`/reports/lo-scorecard`)

One row per LO, period selector (default trailing 90 days). Exact columns: `leads_assigned`, `contact_rate_pct` (reached CONTACTED), `median_first_touch_mins`, `qualified_rate_pct`, `apps_taken`, `term_sheets_issued`, `term_sheet_acceptance_pct`, `funded_count`, `funded_volume`, `pull_through_pct` (QUALIFIED→FUNDED), `avg_cycle_days`, `revenue_attributed` (Σ `revenue_items` on their deals), `open_sla_breaches`, `nps_avg` (§10.7.3). Rank badge on `funded_volume`. Visible to all internal users — small team, transparency by default.

### 10.1.5 Portfolio dashboard (`/reports/portfolio`) — servicing book only (SBA excluded; Lendrock is not the lender)

| # | Widget | Definition |
|---|--------|------------|
| 1 | Headline tiles | `total_outstanding_principal`, `active_loan_count`, `weighted_avg_note_rate` (weighted by outstanding principal), gross and net of investor pass-through; `weighted_avg_ltv` (HM, current); `avg_remaining_term_days`. |
| 2 | Maturity calendar | Loans maturing in 0–30/31–60/61–90/91–180/180+ day buckets (count + $) plus 18-month "maturity wall" bar chart. Loans <45 days out with no `payoff_quote` and no `extension_request` flagged AT_RISK. |
| 3 | Delinquency aging | Buckets CURRENT / 1–9 / 10–29 / 30–59 / 60–89 / 90+ DPD: loan count, principal $, % of book; headline `pct_upb_30_plus`, tile red above 3%. |
| 4 | Concentration — geography | Choropleth + table by `property_state` (HM) / `business_state` (BB/WC): principal $ and % of book. Alert row when any state > `concentration_limit_pct` (default 40%). |
| 5 | Concentration — type & borrower | Donut by deal type and HM sub-type (HM_FF, HM_BTP, HM_GUC; alert HM_GUC > 20%); top-10 borrowers by aggregate exposure, single borrower >10% flagged. |
| 6 | WC utilization | Revolvers: `total_commitments`, `total_drawn`, utilization %, lines >90% utilized list. |
| 7 | Yield distribution | Histogram of note rates; overlay `weighted_avg_investor_pass_through_rate` line to visualize spread. |
| 8 | Extension rate | % of loans extended ≥ once, trailing 12 months. |

### 10.1.6 Investor Capital report (`/reports/investors`) — feeds the investor-facing surface

The capital model is owned by Module 07 §5.1–§5.2 — this report renders the same fields with no parallel math. Per investor row: `capital_available` (self-reported; staleness badge > 60 days), `committed_not_wired` (Σ committed in SOFT_COMMIT/DOCS_OUT/SIGNED), `deployed` (Σ funded in ACTIVE), `headroom` (= `capital_available` − `committed_not_wired`), `weighted_avg_yield_to_investor`, `distributions_paid_itd`, `distributions_paid_ytd`, `upcoming_return_of_capital` (allocations on loans maturing ≤60d), `active_participations` (drill-down: loan, `participation_pct`, `participation_principal`, `pass_through_rate`, next payment date), `accreditation_status` + `accreditation_expires_on` (§10.5.6). Aggregate tiles: total deployed, total committed-not-wired, dry powder = Σ headroom over ACTIVE non-held investors (Module 07 §5.2), and the CM headline — "fundable pipeline vs dry powder" gap = Σ`requested_amount` in APPROVED/DOCS_CLOSING − dry powder. SYS generates a monthly PDF statement per investor on the 5th, CM one-click bulk-approves, published to the investor portal.

### 10.1.7 Revenue dashboard (`/reports/revenue`)

Revenue recorded in `revenue_items(id, deal_id, loan_id, revenue_type, amount, recognized_on, expected)` with `revenue_type` ∈ `ORIGINATION_FEE`, `INTEREST_SPREAD`, `EXTENSION_FEE`, `LATE_FEE`, `NSF_FEE`, `DRAW_FEE`, `SBA_REFERRAL_FEE`, `OTHER_FEE`; `expected = true` rows are forecast, flipped on cash receipt. SYS writes rows automatically: origination fee at FUNDED, interest spread monthly (interest collected − investor pass-through accrued), extension/late/draw fees when assessed and when collected, SBA referral fee when partner-bank commission is logged.

| # | Widget | Definition |
|---|--------|------------|
| 1 | Revenue MTD/QTD/YTD tiles | Σ `revenue_items` (`expected = false`) by period vs `revenue_targets(period, target_amount)` set by PRIN. |
| 2 | Revenue mix stacked bars | Monthly stacked bar by `revenue_type`, trailing 12 months. |
| 3 | Revenue per funded deal | Total revenue ÷ funded count, by deal type — unit economics. |
| 4 | Pipeline revenue forecast | Σ over active deals of `expected_total_fees × stage_probability`; defaults: NEW_LEAD 0.02, CONTACTED 0.05, QUALIFIED 0.15, APPLICATION 0.30, TERM_SHEET 0.50, UNDERWRITING 0.65, APPROVED 0.85, DOCS_CLOSING 0.95. |
| 5 | SBA referral receivables | SBA packages at partner banks: `expected_referral_fee`, `partner_bank`, `expected_close_date`; received vs expected aging. |
| 6 | Fee leakage | Fees assessed but uncollected >30 days (late, extension, draw), with owner task link. |

### 10.1.8 Monday-morning ops digest (SYS)

Send every Monday 07:00 America/New_York, Postmark template `ops_digest_weekly`, to all internal users; reply-to = shared inbox. Fixed sections in order, each a saved query deep-linking to the pre-filtered dashboard; empty sections render "all clear" (zero is signal):

1. **Pipeline snapshot** — count + $ per stage with week-over-week delta arrows.
2. **New leads last 7 days** — by source × deal type vs prior week.
3. **Funded last week** — borrower, type, amount, LO.
4. **Closings this week** — DOCS_CLOSING deals with `target_close_date` in next 7 days + open PRIOR_TO_FUNDING condition counts.
5. **SLA breaches open** — top 10 by age, with owner.
6. **Maturities next 30 days** — loan, principal, date, extension/payoff status, AT_RISK flags.
7. **Delinquency** — count, principal, and the 3 worst loans by DPD with next workflow action + date.
8. **Payments due this week** — count + $ of scheduled ACH debits; accounts with prior R01 flagged.
9. **Conditions overdue** — count + top 5.
10. **Compliance alerts** — licenses <60d to renewal, adverse-action notices due <7d, OFAC reviews open, accreditations expiring <30d, retention purge queue pending, complaints past 10 business days.
11. **Revenue MTD vs target** — with % of month elapsed.
12. **PRIN approval queue** — every pending PRIN approval with age; auto-included whenever PRIN out-of-office mode is active or the oldest pending item exceeds 2 business days (Module 00 role coverage map).

---

## 10.2 Approval Workflows

### 10.2.1 Credit-box auto-check engine (SYS)

- Rules are data, not code: `credit_box_rules(id, deal_type, rule_code, field_path, operator, threshold_value, severity, message_template, active, effective_from)` with `operator` ∈ `LT, LTE, GT, GTE, EQ, IN, NOT_IN` and `severity` ∈ `HARD` (blocks APPROVED absent PRIN exception), `SOFT` (flag requiring UW acknowledgment). PRIN edits thresholds in-app; every change versioned; each run stores the ruleset version used.
- Runs automatically at four checkpoints: entry to QUALIFIED (cheap kill early), entry to UNDERWRITING, on any edit to a rule-referenced field, and immediately before an approval request is created. Result stored in `credit_box_runs(id, deal_id, ruleset_version, overall_result, flags_jsonb, ran_at)`; `overall_result` ∈ `PASS`, `FLAGGED`, `HARD_FAIL`; each flag = `{rule_code, field_path, actual_value, threshold_value, severity}`.
- Default shipped ruleset (PRIN ratifies numbers; structure fixed):
  - **HM** (numbers per Module 02 §3.1): `ltv_after_repair <= 0.70` HARD (`<= 0.65` HM_GUC); `ltc <= 0.85` HARD (`<= 0.80` HM_BTP); `ltv_as_is <= 0.80` HARD; `loan_amount BETWEEN 100000 AND 5000000` HARD (per-product bounds tighter); `guarantor_fico_mid >= 620` HARD (never-exceptionable floor) with product floors 660/680 SOFT; `borrower_completed_projects >= 1` SOFT, ground-up `>= 3` HARD; `property_state IN licensed_or_exempt_states` HARD (live join to license tracker §10.5.1 — an expired license removes the state same-day, no manual sync); `term_months <= 24` SOFT.
  - **BB** (numbers per Module 03 §5): `loan_amount <= 2500000` HARD (BB_BIZ > $750k = PRIN exception); `global_dscr >= 1.15` (BB_BIZ) / `>= 1.10` (BB_CRE) HARD; `time_in_business_months >= 24` SOFT (HARD < 12); `avg_monthly_revenue >= 30000` (BB_BIZ) / `>= 15000` (BB_CRE) HARD; `mca_funder_count <= 1` HARD (stacking → consolidation-only path, Module 03 §7); unsecured allowed only ≤ $150k at tiers T1–T2 HARD.
  - **WC** (numbers per Module 04 §2.3/§2.4/§8): `committed_limit <= 250000` HARD ($500k with PRIN exception); `committed_limit <=` formula limit (0.75 × `avg_monthly_true_revenue_3m` × tier multiplier) HARD; `avg_monthly_true_revenue_3m >= 35000` HARD; `nsf_count_90d <= 3` SOFT; `guarantor_fico_mid >= 620` HARD (tier-C floor).
  - **SBA**: `sba_eligible_industry = true` HARD (excluded-industry list); `use_of_proceeds_eligible = true` HARD; `no_federal_debt_delinquency = true` HARD; `required_docs_complete = true` HARD before partner submission; credit-quality rules SOFT only — the partner bank is the credit authority and Lendrock never hard-declines an SBA package on credit.
  - **All types**: `ofac_status = CLEAR` for every party HARD (§10.5.3); `aggregate_borrower_exposure + loan_amount <= 3000000` SOFT.
- UI: "Credit Box" panel on the deal shows PASS in green or the flag list (rule, actual vs threshold, severity). HARD flags render "Request PRIN exception" → `credit_box_exceptions(deal_id, rule_code, granted_by, reason, granted_at)`; exceptions attach permanently to the credit memo and bump the approval tier (§10.2.2).

### 10.2.2 Tiered approval matrix

One approval record per request — the canonical **Approval** entity (Module 09 §9.2.2; no separate `approvals` table), extended here with `tier` and the child table `approval_signoffs(approval_id, approver_role, approver_id, decision, note, decided_at)` with `decision` ∈ `APPROVED`, `APPROVED_WITH_CONDITIONS`, `DECLINED`, `RETURNED`. All required signoffs collected **in parallel** (automation-first, no serial chains) except PRIN, who is pinged only after the others land. Any DECLINED signoff moves the deal to DECLINED and fires adverse action (§10.5.2) unless the decliner selects RETURNED (Approval.status → `RETURNED`, back to UW with note).

| Deal type | Tier 1 (UW solo) | Tier 2 (UW + PRIN) | Tier 3 (UW + PRIN + CM) |
|-----------|------------------|--------------------|--------------------------|
| HM | ≤ $500,000, zero exceptions, tier T1/T2 (Module 02 §4.2) | $500,001 – $2,000,000, or exactly 1 approved exception, or tier T3 | > $2,000,000, or ≥ 2 exceptions, or HM_GUC > $1,000,000 — deal committee (CM confirms capital allocation, not credit) |
| BB | ≤ $250,000, in-box, no stacking flag (Module 03 DP-3) | $250,001 – $750,000, or any guardrail exception | > $750,000 (BB_BIZ above product cap = PRIN exception; CM confirms capital) |
| WC | ≤ $150,000, standard structure (new line, renewal, or increase — Module 04) | > $150,000, any guardrail exception, or borrowing-base structure | — (WC capped at $250k standard / $500k PRIN exception) |
| SBA | UW signs **package quality only**; CM signs partner-bank routing | Partner routing for packages > $2,000,000 adds PRIN | — |

Automatic tier escalators (SYS): ≥3 open SOFT flags, any granted HARD exception, repeat borrower with a prior 30+ DPD episode, or aggregate borrower exposure > $1.5M ⇒ tier +1. Approval SLAs: T1 1 business day, T2 2, T3 3; timers and escalation per §10.6.

### 10.2.3 Auto-generated credit memo

SYS assembles `credit_memos(id, deal_id, version, generated_at, locked, pdf_doc_id, data_snapshot_jsonb)` the moment approval is requested — zero manual document assembly. The memo regenerates on any underlying data change until the first signoff lands, then locks; later changes force a new version and re-signature. UW edits exactly two free-text sections; everything else is data-bound read-only. Section order (fixed):

1. **Header** — `deal_id`, deal type + sub-type, borrower entity, guarantors, LO, request date, memo version.
2. **Request summary** — `loan_amount`, `note_rate`, `term_months`, `origination_fee_pct`, structure (I/O, revolver, amortizing), `use_of_proceeds`, target close date.
3. **Credit-box result** — full latest `credit_box_runs` render incl. every flag and every exception with reason (non-suppressible).
4. **Borrower & sponsorship** — entity structure, beneficial owners ≥25%, `time_in_business_months`, `guarantor_fico_mid` values, `borrower_completed_projects` (HM), OFAC status per party, prior Lendrock history (loans, payoffs, worst DPD).
5. **Collateral / repayment analysis** — HM: address, as-is value, ARV, valuation source + date, rehab budget summary, LTV/LTC/ARV table, title status. BB/WC: 12-month bank-statement revenue series, DSCR table, collateral schedule, existing positions/liens. SBA: eligibility summary + target partner bank fit.
6. **Sources & uses** — auto-built from deal budget records.
7. **Exposure & concentration** — aggregate borrower exposure after this loan; state/type concentration impact vs limits.
8. **Capital plan** (Tier 3) — funding source, investor allocation, pass-through rate, spread (CM data).
9. **Risks & mitigants** — UW free text, required, min 3 bullets; memo cannot route while empty.
10. **Recommendation & proposed conditions** — UW free text + draft condition list seeded from the per-deal-type template (§10.2.4).
11. **Signature block** — signoff grid auto-filled as decisions land; final PDF archived to the document module.

### 10.2.4 Conditions-to-close tracking

- `conditions(id, deal_id, approval_id, title, description, category, owner_role, waiting_on, status, due_at, source, satisfied_by_doc_id, cleared_by, cleared_at)`; `category` ∈ `PRIOR_TO_DOCS`, `PRIOR_TO_FUNDING`, `POST_CLOSING`; `status` ∈ `OPEN`, `SUBMITTED`, `CLEARED`, `WAIVED`, `EXPIRED`; `waiting_on` ∈ `BORROWER`, `INTERNAL`, `THIRD_PARTY`; `source` ∈ `TEMPLATE`, `UW_ADDED`, `SIGNER_ADDED`.
- Exactly one `owner_role` chases each condition: PROC for document conditions, LO for borrower-action conditions, UW for third-party report conditions. Clearing authority is role-locked: UW_ADDED/SIGNER_ADDED credit conditions clear only by UW; TEMPLATE doc conditions clear by PROC. WAIVED always requires PRIN with reason.
- Standard templates auto-attach at APPROVED per deal type (HM: updated title commitment, hazard insurance with lender-as-mortgagee, entity good standing, budget sign-off, ACH authorization; BB: UCC-1 filed, landlord waiver, ACH authorization; WC: ACH authorization + deposit-account visibility). UW adds memo-recommended conditions one-click.
- Borrower-facing conditions auto-create document requests in the borrower portal; upload flips status to SUBMITTED and tasks the clearing role. Progress bar (`cleared / total`) renders internally (all) and to the borrower (their items only).
- Hard gates enforced via the stage-gate API (§10.6): no DOCS_CLOSING entry with open PRIOR_TO_DOCS; the funding wire task cannot complete with any PRIOR_TO_FUNDING not CLEARED/WAIVED; POST_CLOSING conditions become PROC tasks (10-business-day default `due_at`) and stay in the Monday digest until cleared.

---

## 10.3 Communication Hub

### 10.3.1 Unified message log

- `messages` is the canonical **MessageLog** entity (Module 09 §9.2.3 — no separate table); this module adds only `sequence_step_id` and the extended send-metadata columns (`from_addr`, `to_addrs`, `body_html`/`body_text`). Canonical enums (Module 09): `channel` ∈ `EMAIL`, `SMS`, `PORTAL_MESSAGE`, `LETTER`, `CALL_LOG`; `direction` ∈ `OUTBOUND`, `INBOUND`; `delivery_status` ∈ `QUEUED`, `SENT`, `DELIVERED`, `OPENED`, `BOUNCED`, `FAILED`, `UNDELIVERED`. The deal timeline renders MessageLog + `calls` (§10.3.6 — each logged call also writes a MessageLog row with `channel = CALL_LOG`) + `comments` + `stage_transitions` + `tasks` interleaved chronologically — one screen tells the whole deal story.
- Providers: **Postmark** for email (separate transactional and broadcast streams), **Twilio** for SMS and voice — one number for pipeline/ops, a second dedicated number for servicing/payment messages. **Lob** for mailed letters (late notices, adverse action). Webhooks update `status`; bounces auto-create a PROC task `FIX_CONTACT_INFO`.
- Deal-threading: every outbound email sets `Reply-To: deal+{deal_id}@in.lendrockcapital.com`; Postmark inbound parses the plus-address and attaches to the deal; the same address doubles as a BCC dropbox when staff must send from Outlook/Gmail (platform-first is policy; the dropbox is the escape hatch). Fallback matching: sender email → `contacts`, then `Message-ID` thread references. Unmatched inbound lands in Triage. Inbound attachments auto-file to the document module (unclassified folder, PROC review task).
- SMS consent: `sms_consent_at` captured at application; STOP handled by Twilio Advanced Opt-Out, sets `sms_opt_out = true`; quiet hours 08:00–21:00 contact-local for all SYS-initiated SMS.

### 10.3.2 Shared team inbox (`/inbox`)

Views: **Triage** (unassigned inbound; PROC owns, SLA: assign within 2 business hours, empty by 10:00 daily), **Mine**, **Waiting** (outbound awaiting reply >48h auto-surfaces), **All**. Conversation = thread grouped by `deal_id + contact_id + channel` with exactly one `owner_id`; assignment notifies the owner. Snooze/close/reopen; closing with an unanswered inbound question warns.

### 10.3.3 Templates & per-stage sequences

- Templates are the canonical **Template** entity (Module 09 §9.2.3); bodies, versioning, merge-field dictionary, and governance (including PRIN/attorney approval of compliance-adjacent templates) are owned by Module 08 §8.1/§8.3/§8.4 — this module defines no separate templates table and only consumes `template_code` + `template_version`.
- `sequences(id, name, deal_type, trigger_stage, active)` + `sequence_steps(sequence_id, step_no, delay_business_hours, channel, template_code, skip_if_replied)` + `sequence_enrollments(deal_id, sequence_id, status, current_step)` — the single sequence engine; the sequence *inventory* (codes, step bodies, cadences) is owned by Module 08 §8.2G, and steps reference canonical Template rows by `template_code`. Enrollment is automatic on stage entry (SYS). Uniform stop conditions: inbound reply from the contact (pauses + tasks the deal owner), stage change, manual stop, opt-out.
- Shipped sequences (codes registered in the Module 08 template library, which owns bodies and versioning): `SEQ_LEAD_RESPONSE` (NEW_LEAD: cadence owned by Module 01 §5.2/§7.1; auto-DEAD `UNRESPONSIVE` at day 10); `SEQ_DOC_CHASE` (APPLICATION with incomplete checklist: cadence owned by Module 06 §3.4; each send is an email listing exactly the missing items rendered from the doc checklist); `SEQ_TS_UNSIGNED` (+1d email, +3d email + SMS, +5d LO call task — term sheets expire day 10); `SEQ_CLOSING_COUNTDOWN` (DOCS_CLOSING entry: wire-fraud warning, logistics, insurance requirements); `SEQ_PAYMENT_REMINDER` (§10.4.5); `SEQ_MATURITY_NOTICE` (T-90/T-60/T-30/T-15 ticklers per Module 02 §5.4, extension terms + payoff quote link at T-30); `SEQ_PAYOFF_RECYCLE` (§10.7.1).

### 10.3.4 Borrower portal messaging

Portal thread = `channel = PORTAL_MESSAGE`, mirrored into `messages` and the shared inbox; new portal message notifies the current stage owner, reply SLA 4 business hours (feeds LO scorecard). Borrower notification email says only "You have a new message" — sensitive content stays in-portal. Staff can flag any outbound portal message "also send as email": one write, one log row per channel. Attachments both ways auto-file to the document module.

### 10.3.5 Internal comments & mentions

`comments(id, deal_id, author_id, body_markdown, mentions_user_ids[], entity_type, entity_id, created_at)` — never rendered on any external surface, visually distinct (yellow) in the timeline. `@mention` fires in-app + email notification and lands in the mentioned user's My Day "Mentions" strip, with one-click "make this a task". Comments can anchor to a specific object (condition, task, payment, draw) via `entity_type/entity_id` and render inline there too. Inline refs `#task:{id}`, `#cond:{id}` hyperlink.

### 10.3.6 Call logging

Two-click quick-log on every deal: `calls(id, deal_id, contact_id, direction, outcome, duration_secs, note, recording_url, next_action_task, logged_by, occurred_at)`; `outcome` ∈ `CONNECTED`, `LEFT_VM`, `NO_ANSWER`, `BAD_NUMBER`. `next_action_task = true` spawns a follow-up task pre-assigned to the caller. Twilio click-to-call auto-creates the record with duration + recording (recording defaults on; two-party-consent states detected from the contact's state trigger the announcement). Missed inbound calls auto-create a callback task for the deal's stage owner, due 4 business hours. Calls count as touches for first-touch metrics and sequence pausing.

---

## 10.4 Servicing Module (post-FUNDED)

On FUNDED, SYS creates `loans(id, deal_id, loan_type, note_rate, default_rate, accrual_method, origination_date, maturity_date, original_principal, outstanding_principal, interest_reserve_balance, payment_due_day, grace_days, late_fee_pct, suspense_balance, status)`. Defaults: `accrual_method = ACTUAL/360`; `payment_due_day = 1`; `grace_days = 10`; `late_fee_pct = 0.10` of the overdue payment (WC lines override: `grace_days = 5`, late fee 5% min $25 — Module 04 §7.2; state caps checked first via `late_fee_caps(state, max_pct, min_grace_days)` — lower of contract vs cap applies); `default_rate = note_rate + 5.00pp`, charged only after formal default declaration. `status` ∈ `PERFORMING`, `LATE`, `DEFAULT`, `WORKOUT`, `PAID_OFF`, `CHARGED_OFF`. SBA deals never create a `loans` row — the partner bank services; Lendrock tracks only the referral-fee receivable.

**Year-1 phasing (binding; reconciles this section with Module 11 §B3, which buys Bryt as the year-1 servicing ledger).** This section is the target in-house design, shipped in two phases:

- **Phase 1 (year 1):** HM/BB payment *math* — schedule generation (§10.4.1), payment application (§10.4.3), per-diem accrual, late fees (§10.4.4), payoff quotes (§10.4.8), and 1098/1099-INT — runs in **Bryt**. The portal stays the workflow surface: the delinquency ladder (§10.4.5), draw management (§10.4.6), extensions (§10.4.7), and lien release (§10.4.9) run here on Bryt-reported balances. **Bryt sync contract (SYS):** FUNDED deals push to Bryt on `deal.stage_changed`; a webhook/nightly-poll sync pulls payments, accruals, and payoff figures and emits canonical `payment.received` / `loan.paid_off` DomainEvents (Module 09 §9.3) plus `payment_applications` rows — so Module 07 investor distributions and every dashboard work identically whichever system computes the math.
- **WC exception:** the WC revolver engine (Module 04 — auto-draws, autopay, covenant sweeps, monthly billing on average daily drawn balance) is inherently in-house and is **built at WC go-live regardless**; Bryt never touches WC lines.
- **Phase 2 (12 mo+, per Module 11 §B3: fundings > 50/mo and a dedicated dev):** build §10.4.1–§10.4.4 and §10.4.8 in-house and retire Bryt; the event contract is unchanged, so nothing downstream migrates.

### 10.4.1 Payment schedule generation (SYS)

`scheduled_payments(id, loan_id, due_date, payment_no, interest_due, principal_due, fees_due, total_due, status)` generated for the full term at FUNDED; `status` ∈ `SCHEDULED`, `BILLED`, `PAID`, `PARTIAL`, `MISSED`. Regenerated atomically on extension/modification with superseded rows kept (`superseded_by`).

| Type | Default structure |
|------|-------------------|
| HM | Interest-only monthly, balloon at maturity; first payment due the 1st of the second month post-funding with per-diem stub interest added to payment 1. If `interest_reserve_balance > 0`, SYS pays monthly from reserve until exhausted and alerts LO + borrower two payments before exhaustion. Ground-up/rehab holdback: interest accrues on **drawn balance only** (as-disbursed); month's `interest_due` recomputed after every draw funding. |
| BB | Interest-only for terms ≤ 12 months (default), level amortization otherwise. |
| WC | Revolver: interest billed monthly on average daily drawn balance; principal due at line maturity; draws/paydowns via portal request → PROC approval → same-day ACH. |

### 10.4.2 ACH auto-debit

- Processor: **Dwolla** (ACH-only, API-first, cheap). `ach_mandates(id, loan_id, funding_source_token, mandate_signed_at, status)` — authorization is a required PRIOR_TO_FUNDING condition; auto-debit is **mandatory** for HM/BB/WC, waivable by PRIN only.
- **Phase 1 (pre-Dwolla):** the due-date debit executes from the SYS-generated NACHA batch / keyed-entry PROC playbook with dual control and Plaid reconciliation per Module 09 §9.5 #13; everything below describes the Phase-2 API rail.
- SYS initiates the debit on `due_date` 06:00 ET for `total_due`. On `R01` (NSF): one automatic retry at +3 business days and a $100 `nsf_fee` posts. Any other return code or second failure → payment `FAILED`, delinquency clock runs from the original `due_date`, `ach_broken = true`, PROC task to obtain a replacement payment method. Two R01s in 6 months adds a day −5 pre-debit balance-reminder step to `payment_reminder`.
- `payments(id, loan_id, amount, method, received_at, status, provider_ref)`; `method` ∈ `ACH_AUTO`, `ACH_MANUAL`, `WIRE`, `CHECK`.

### 10.4.3 Payment application waterfall (SYS, code-enforced)

Applied on cleared funds in this exact order: **(1)** outstanding fees (late/NSF/draw), **(2)** accrued default interest, **(3)** accrued note interest (oldest first), **(4)** reserve replenishment if contractually required, **(5)** scheduled principal, **(6)** unscheduled principal (curtailment — PROC confirmation required on HM/BB since payoff may be intended), **(7)** suspense. Partial payments sit in `suspense_balance` until they cover the oldest full delinquent amount, except interest applies immediately when suspense ≥ interest due (keeps interest income recognized). Every application writes `payment_applications(payment_id, target_type, target_id, amount)`; investor pass-through calculations read exclusively from this table.

### 10.4.4 Late fees (SYS)

At `due_date + grace_days` (day 10) 23:59 ET, unpaid scheduled payment ⇒ assess `late_fee = late_fee_pct × overdue_payment_amount` to `fees(id, loan_id, fee_type, amount, assessed_on, status)` and `revenue_items` on collection. One late fee per scheduled payment, no compounding.

### 10.4.5 Delinquency workflow (day counts = calendar days past `due_date`)

| Stage | Owner | Required actions | Automations (SYS) | Exit criteria | Target SLA |
|-------|-------|------------------|-------------------|---------------|------------|
| UPCOMING (day −3) | SYS | none | Email reminder with amount + ACH debit date | Payment date reached | n/a |
| MISSED (day 1–4) | SYS | none | Day 1 email + SMS "payment did not process; retry scheduled"; ACH retry day 3 (§10.4.2) | Cured, or day 5 | n/a |
| SOFT_TOUCH (day 5) | PROC | Call borrower, log outcome, capture promise-to-pay date | Call task auto-created; promise-to-pay date sets a re-check task | Cured, or day 10 | Call within 1 business day |
| LATE (day 10) | PROC | 1-click approve auto-drafted late notice | Late fee assessed; formal **Late Notice** (template `LATE_NOTICE`, Module 08 registry) emailed + mailed via Lob + posted to portal; `status = LATE` | Cured, or day 30 | Notice out same day |
| SERIOUS (day 30) | LO | Workout call; document exit plan; PRIN auto-briefed via comment | **Default Warning** letter (template `DEFAULT_WARNING_LTR`) generated for LO send; investor participants on the loan auto-notified with standard delinquency notice (CM template) | Cured, workout agreed, or day 45 | Contact within 2 business days |
| DEFAULT_DECISION (day 45) | PRIN | Decide: WORKOUT / forbearance / ENFORCE (1-click, note required) | Decision task with auto-compiled file summary: payment history, collateral value, guarantor assets, full comms log export | Decision recorded | 3 business days |
| DEFAULT (day 60) | UW | Issue default/demand letter (template `DEMAND_LTR`) via counsel; activate default rate | Default interest switch flips on ENFORCE; counsel referral packet auto-assembled (note, mortgage/UCC, ledger, comms export); `status = DEFAULT` | Cured, forbearance signed, or referral sent | 5 business days |
| LEGAL (day 90+) | PRIN | HM: foreclosure counsel; BB/WC: collections/judgment path; track in `legal_matters` | Weekly status task recurs; portfolio dashboard flags loan | Resolution (cure, DIL, sale, judgment, charge-off) | Weekly cadence |

Cure at any point reverts `status = PERFORMING`, cancels open DQ tasks, and logs `delinquency_episodes(loan_id, started_on, cured_on, max_days_late)` — feeds tier escalators (§10.2.2) and repeat-borrower gating (§10.7.1).

### 10.4.6 Draw management (HM rehab/construction — one centralized system, no per-deal spreadsheets)

The end-to-end draw workflow — request → inspection → reconcile/approve → wire + title down-date, the `DrawRequest` status machine, approval routing (PROC ≤ $25k with inspection supporting 100% of the request, else UW), and the ≤ 5 bd request-to-wire SLA — is owned by **Module 02 §5.2–§5.3**; the canonical `DrawRequest` entity lives in Module 09 §9.2.4. Servicing responsibilities here: render the remaining-holdback and budget-vs-drawn views to the borrower and on the loan page; block over-budget line submissions at source; queue the $250 `draw_inspection_fee` + inspection cost against each draw; keep wires locked to the account verified at closing (mid-loan instruction changes require a verbal-callback verification task); recompute `outstanding_principal` + accrual on every disbursement.

### 10.4.7 Extension processing

Triggers: `maturity_runway` sequence (§10.3.3), borrower portal request (maturity −60 to −15d), or LO manual. `extensions(id, loan_id, extension_no, months, fee_pct, new_maturity_date, new_rate, status, approved_by)`. Defaults (BB): 3-month increments, `fee_pct = 0.01` of outstanding principal, rate unchanged on extension 1; extension 3+ steps rate +1.00pp. HM loans follow Module 02 §5.4 (max 2 extensions, fees 1.0%/1.5%, SYS-checked auto-conditions). Approval: ext 1 = UW (loan must be PERFORMING); ext 2 = UW + PRIN; ext 3+ = PRIN; extension while LATE requires cure or PRIN exception. On approval SYS atomically: assesses fee (`EXTENSION_FEE` revenue), generates the amendment for e-sign (document module), regenerates the schedule, updates the maturity calendar, queues the investor notice to CM.

### 10.4.8 Payoff quote generation (SYS)

Request sources: borrower portal button, title/escrow email into the shared inbox, or PROC. `payoff_quotes(id, loan_id, good_through_date, outstanding_principal, accrued_interest, per_diem, unpaid_fees, lien_release_fee, suspense_credit, total_payoff, generated_at, status)`; `status` ∈ `ISSUED`, `EXPIRED`, `PAID`. Computation: principal + accrued interest through `good_through_date` (+ stated per-diem for late arrival) + unpaid fees + `lien_release_fee` ($125, HM only) − suspense. Good-through default +10 calendar days, auto-expires. PDF on letterhead generated within 1 business hour; wire instructions are a locked PDF page, never in email body; any inbound "updated instructions" request spawns a mandatory PROC verbal-callback task. Wire receipt auto-matches to the quote (tolerance ± 2 × per_diem, else PROC reconciliation task) → `status = PAID_OFF`, fires lien release, investor return-of-capital entries for CM, and the recycle sequence (§10.7.1).

### 10.4.9 Lien release tracking (HM + secured BB)

`lien_releases(id, loan_id, collateral_id, release_type, county_or_sos, sent_at, recorded_at, confirmation_doc_id, status)`; `release_type` ∈ `DEED_RECONVEYANCE`, `MORTGAGE_SATISFACTION`, `UCC3_TERMINATION`; `status` ∈ `PENDING`, `SENT_TO_RECORD`, `RECORDED`, `CONFIRMED`. Instruments render from template `LIEN_RELEASE` (Module 08 registry, state-variant). PROC tasks at payoff: prepare + send within 5 business days; CONFIRMED within 30 calendar days (statutory in many states — hard SLA, escalates to PRIN at day 21). UCC3s e-filed same week via SOS. Portfolio widget: open releases past 21 days. Recorded release archives to the document vault against the loan.

---

## 10.5 Compliance Ops

### 10.5.1 State license tracker

`licenses(id, state, license_type, license_no, holder_entity, issued_on, expires_on, status, responsible_role, portal_url, credentials_ref, exemption_basis)`; `license_type` ∈ `LENDER`, `BROKER`, `SERVICER`, `CFL`, `MORTGAGE`, `OTHER`; `status` ∈ `ACTIVE`, `RENEWAL_IN_PROGRESS`, `EXPIRED`, `NOT_REQUIRED_EXEMPT`. Store explicit `NOT_REQUIRED_EXEMPT` rows with `exemption_basis` text per state (business-purpose exemptions vary), so the credit-box rule `property_state IN licensed_or_exempt_states` has a complete map — **a state with no row cannot pass the credit box**, forcing the licensing question before money moves, and an EXPIRED license removes the state from the allowed set the same day (blocks new TERM_SHEET issuance there automatically). Renewal ladder (SYS → PROC task): 120/90/60/30 days pre-expiry; unresolved at 30 days escalates to PRIN + Monday digest. Annual-report/NMLS deadlines live in `compliance_deadlines(kind, due_on, recurrence)` with the same ladder.

### 10.5.2 Adverse-action automation (business credit, ECOA/Reg B)

- Business-purpose credit is still Reg B territory. Opinionated single path that removes all timing judgment: **send a written adverse-action notice with specific principal reasons within 30 days of decision, for every DECLINED deal and every application withdrawn-incomplete after 30 days of inactivity, regardless of applicant revenue size.** This over-complies for >$1M-revenue businesses — cheaper than operating two regimes.
- **Existing-account adverse actions (WC):** adverse action also includes unfavorable changes to and terminations of an existing account (12 CFR 1002.2(c)(1)(ii); Module 11 §A3 — "WC line reductions/freezes count"). The same service therefore fires on any `wc_limit_changes` decrease, `wc_freezes` event, or Lendrock-initiated non-renewal/term-out (Module 04 §6.2/§6.3/§7.1) whose trigger reason code is not borrower delinquency/default under the LOC agreement: counsel maps every freeze and limit-change reason code in `aan_reason_map` to `AAN_REQUIRED` vs `EXEMPT_DEFAULT_DELINQUENCY`, and SYS generates the business-credit notice (action taken + principal reasons/right-to-request + ECOA notice) alongside the operational notice, same `adverse_action_notices` record and tracking ladder.
- Mechanics: DECLINED entry requires 1–4 `decline_reason_codes` from a fixed list, each mapped to Reg B-safe language in `aan_reason_map` (never free text). SYS creates `adverse_action_notices(id, deal_id, due_by, principal_reasons[], sent_at, method, status)` with `due_by = application_completed_at + 25 days` (5-day internal buffer inside the 30-day Reg B clock, which runs from completed application — Module 11 §A3), drafts the letter (action taken, principal reasons, ECOA anti-discrimination notice, Lendrock name/address, federal agency contact) → UW 1-click review (SLA 3 business days) → email + mailed PDF via Lob. Unsent at `due_by − 7` hits the Monday digest; `due_by − 3` escalates to PRIN.
- SBA: the partner bank owns its own AAN on its credit decision; Lendrock sends a packaging-decision notice only when Lendrock itself declines to package.
- CFPB §1071 small-business data collection: schema stubs ship (`applicant_demographics_1071` collected via a firewalled applicant-facing form, invisible to UW), collection toggle **OFF** by default pending founder/counsel decision.
- Retention: application + notice + reasons kept 5 years per the shared schedule (§10.5.4) — exceeds the 12-month Reg B business-credit floor, 12 CFR 1002.12(b)(5) (60 days, extendable on request, for applicants > $1M gross revenue).

### 10.5.3 OFAC screening

- Vendor default: **sanctions.io** API (SDN + consolidated lists), fuzzy threshold 85, for recurring/batch re-screens; onboarding-time screens ride Persona (persons) and Middesk (entities) per Module 09 §9.5. `ofac_screenings(id, party_id, party_type, checkpoint, score, result, screened_at, reviewed_by, disposition, evidence_ref)`; `result` ∈ `CLEAR`, `POTENTIAL_MATCH`, `CONFIRMED_MATCH`; `party_type` ∈ `BORROWER_ENTITY`, `BENEFICIAL_OWNER` (≥25%), `GUARANTOR`, `INVESTOR`, `BROKER`, `SELLER_ESCROW` (HM wire counterparties).
- Checkpoints (SYS, blocking): **(1)** APPLICATION submitted — all borrower-side parties; **(2)** DOCS_CLOSING — re-screen all parties + wire counterparties ≤ 24 h before wire release (shared pre-wire re-scan, Module 02 §3.6) or when any party is added; **(3)** quarterly batch re-screen of all parties on ACTIVE loans; **(4)** investor and broker onboarding; investors monthly (Module 07 §1.5), brokers annual batch (Jan 15).
- `POTENTIAL_MATCH` freezes the deal (`compliance_hold = true`, stage-gate blocks, automated comms suppressed) and creates a UW review task, SLA 1 business day; disposition `FALSE_POSITIVE` requires a note and unfreezes. `CONFIRMED_MATCH`: hard block, do-not-fund, PRIN + counsel notified, OFAC hotline reporting task generated with contact details. Evidence retained 5 years past relationship end.

### 10.5.4 Document retention schedule

`retention_policies(record_class, retention_period, trigger_event)` owned here, enforced by the document module. Defaults: `LOAN_FILE` — 7 years after payoff/charge-off; `APPLICATION_DECLINED` + AAN — 5 years from decision (single rule, exceeds the 12-month Reg B business-credit floor, 12 CFR 1002.12(b)(5)); `SERVICING_RECORDS` — 7 years post-payoff (ledger rows never purge; only documents); `OFAC_SCREENING` — 5 years after relationship end; `ACH_AUTHORIZATIONS` — 2 years after revocation; `INVESTOR_RECORDS` — 7 years after final distribution; `COMPLAINTS` — 5 years after closure; `TAX_RECORDS` — 7 years. SYS monthly purge-eligibility job produces a manifest; **nothing deletes without PRIN 1-click approval**; `legal_hold` on any deal/loan exempts everything attached.

### 10.5.5 Complaint log

`complaints(id, source, channel, deal_id, category, severity, summary, owner_id, opened_at, resolution_due_at, root_cause_code, resolution_summary, status)`; `source` ∈ `BORROWER`, `INVESTOR`, `BROKER`, `REGULATOR`, `OTHER`; `severity` ∈ `LOW`, `HIGH`. Any staff member can log one in ≤60 seconds from any deal screen; inbound messages flagged "complaint" in the shared inbox auto-create the record.

| Stage | Owner | Required actions | Automations (SYS) | Exit criteria | Target SLA |
|-------|-------|------------------|-------------------|---------------|------------|
| RECEIVED | PROC | Categorize, set severity | Ack email queued; `resolution_due_at = opened_at + 15 business days`; HIGH or REGULATOR source pages PRIN immediately (regulator ack SLA: 24h, PRIN owns) | Acknowledged | 2 business days |
| INVESTIGATING | PROC | Gather records, draft response | Related deal timeline auto-attached | Root cause + response drafted | 10 business days |
| RESOLVED | PRIN | Approve response (all complaints); send | Resolution letter logged to `messages` | Response delivered | 15 business days total |
| CLOSED | PROC | Record `root_cause_code` + corrective action | Quarterly trend report to PRIN (count by category, repeat causes) — the audit artifact | — | — |

Open complaints past 10 business days appear in the Monday digest and on PRIN's My Day until closed.

### 10.5.6 Annual investor accreditation refresh

Accreditation records are owned by Module 07 §1.3 (`investor_accreditations` — append-only; latest non-expired row governs); this section owns the ops cadence. Default posture: offerings under **506(b)** — annual self-certification questionnaire; SYS emails the investor a portal link 45 days before `expires_on` (reminders at 21 and 7; `expires_on = verified_on + 12 months`); status flips DUE at anniversary, LAPSED at +30 days. If PRIN switches an offering to 506(c), third-party verification (CPA/attorney letter or VerifyInvestor report) dated within 90 days before each new investment is enforced as a CM blocking task at allocation. **LAPSED blocks new capital allocations** (CM allocation screen filters them out); existing holdings unaffected. Evidence retained per §10.5.4.

---

## 10.6 Task Engine (the execution substrate — build this first)

- **Playbooks**: `playbooks(id, deal_type, stage_or_event_key, version, status)` — `deal_type` ∈ HM/BB/WC/SBA/ALL; `stage_or_event_key` = canonical stage or servicing/compliance event key (`SVC_DELINQUENCY_D30`, `CMP_LICENSE_RENEWAL`, `SVC_DRAW_REQUESTED`, …); `status` ∈ `DRAFT`, `ACTIVE`, `RETIRED`. Versions are immutable once published; in-flight deals keep the version they started on.
- **Task templates**: `playbook_tasks(id, playbook_id, task_key, title, owner_role, due_offset_bh, blocking, depends_on_task_keys[], waiting_on_default, auto_complete_event, surface, skip_requires_role, sort_order)`. `due_offset_bh` = business hours after trigger. `depends_on_task_keys` empty = parallel by default — declare only physically real dependencies (automation-first). `auto_complete_event` lets SYS close tasks on matching `activity_events` (e.g., "Send term sheet" completes on `DOC_SENT:TERM_SHEET`) — every task that *can* auto-complete *must* declare an event. `surface` ∈ `INTERNAL`, `BORROWER`, `INVESTOR` controls where it renders. `skip_requires_role` defaults: UW for credit tasks, PRIN for everything else blocking.
- **Instances**: task instances are the canonical **Task** entity (Module 09 §9.2.2 — no parallel table); this engine adds the execution columns `loan_id, task_key, sla_state, waiting_on, blocking, skip_reason_code`. `status` uses the single canonical enum `OPEN`, `IN_PROGRESS`, `WAITING_EXTERNAL`, `BLOCKED`, `DONE`, `SKIPPED`, `CANCELLED` (Module 09 §9.2.2); `sla_state` ∈ `ON_TRACK`, `AT_RISK` (≥80% elapsed), `BREACHED`. Exactly one `owner_id`, resolved from `owner_role` via the deal's role map (`lo_user_id, proc_user_id, uw_user_id, cm_user_id, prin_user_id` on every deal); reassignment is per-task and logged. SYS instantiates all playbook tasks in one transaction on trigger; unmet dependencies start BLOCKED. Ad-hoc tasks share the schema.
- **Stage-gate API**: the pipeline module calls `GET /deals/{id}/stage-gate?to_stage=X`; this engine answers by checking open blocking tasks, condition gates (§10.2.4), credit-box HARD fails (§10.2.1), and `compliance_hold` (§10.5.3). One gate, one answer, every advance.
- **My Day** (`/my-day`, default landing page for every user) — fixed groups, no configurable layouts in v1: **1)** Breached & at-risk (BREACHED first, then `due_at ASC`); **2)** Approvals waiting on me; **3)** Mentions; **4)** Replies owed (inbound on my deals with no outbound reply >4 business hours); **5)** Waiting on others (my tasks with `waiting_on != INTERNAL`, by wait age); **6)** Due today/tomorrow grouped by deal; **7)** My Triage items. Header KPIs: `open_task_count`, `breached_count`, `active_deals_owned`, plus a per-queue depth widget (open items per hard-SLA queue, SLA class colored; PRIN dashboard shows the same per role) that feeds the Module 00 aggregate capacity guardrail — when a role's open hard-SLA depth exceeds `wip_threshold`, SYS relaxes that role's non-gate SLAs one tier and pages PRIN. Keyboard-first (j/k/x/e), 1-click complete/snooze.
- **SLA timers**: business calendar Mon–Fri 08:00–20:00 America/New_York (shared portal-wide calendar, Module 01 §5.2), `holidays` table. Both task SLAs and stage SLAs (defined in the pipeline module's stage tables) run here.
- **Escalations** (SYS, uniform ladder, no per-task config in v1): AT_RISK → nudge owner (in-app + email); BREACHED → notify owner + deal's PROC (ops owns unblocking) and log `escalations(task_id, level, created_at, acknowledged_by)`; BREACHED +24 business hours → PRIN, task pinned atop PRIN's My Day; 200% → Monday digest + PRIN daily breach summary. Stage-SLA breach flags the deal `stalled = true` (funnel + digest). Breaches write `sla_breaches(task_id, breached_at, resolved_at)` feeding the LO scorecard and cycle-time dashboards.

---

## 10.7 Growth Extras (build in v1.x, scoped small deliberately)

### 10.7.1 Repeat-borrower recycling (SYS)

Triggers: loan `PAID_OFF` with `max_days_late < 30` across all episodes, plus −60 days pre-maturity on performing HM loans (catch the next flip before payoff). Borrower flagged `repeat_eligible = true`, `borrower_tier = RETURNING` (VIP after 3 clean payoffs). Sequence `payoff_recycle`: day 0 congrats + testimonial ask (§10.7.3); day 14 LO call task "next project?"; day 30 "pre-qualified for your next deal" email with **express re-application link**; then quarterly nurture until re-engaged or opted out. Express lane: one-click new deal clones entity, guarantors, and banking; docs dated <12 months (entity docs, ID) auto-attach as satisfied; credit box runs immediately on submit; deal enters at QUALIFIED with `lead_source = RECYCLED_BORROWER` (skips NEW_LEAD/CONTACTED). VIP deals carry an automatic 0.25pp rate-concession flag to UW (concession is UW's call; the flag is automatic). Funnel dashboard tracks `repeat_borrower_funded_pct` (target ≥30%).

### 10.7.2 Lightweight broker submission portal

- `referral_partners(id, name, company, email, phone, partner_type, w9_doc_id, agreement_doc_id, agreement_signed_at, default_referral_fee_pct, status)`; `partner_type` ∈ `BROKER`, `REFERRER`, `CPA_ATTORNEY`, `BANKER`; `status` ∈ `INVITED`, `ACTIVE`, `SUSPENDED`. OFAC-screened at onboarding (§10.5.3). Gate: agreement e-signed + W-9 on file before first **payout**, not before first submission — no friction pre-deal.
- Portal (magic-link auth, no passwords): submission form per deal type (mirrors internal intake minimum fields), drag-drop doc upload, and a status board at **coarse** stage groups only — `RECEIVED`, `IN_REVIEW`, `TERMS_OUT`, `IN_CLOSING`, `FUNDED`, `NOT_MOVING_FORWARD` — never internal stage detail, pricing internals, or decline reasons beyond a category. SYS emails the broker on every group change — **these milestone push emails ship at launch**, triggered off stage-group changes and independent of the board UI (deferred to v1.x per Module 12 A6): with `broker_direct_contact_ok` defaulting false, the broker is the sole relationship channel, and silence converts into recurring status calls into the LO and shared inbox. No broker-facing two-way messaging in v1; brokers email the shared inbox. Submissions create NEW_LEAD with `lead_source = BROKER_SUBMIT`, `referral_partner_id` set; LO first-touch per Module 01 §5.2 speed-to-lead (≤ 5 business min).
- Commissions: `referral_payouts(id, deal_id, referral_partner_id, basis_amount, fee_pct, amount, status, paid_at)` auto-computed at FUNDED from `default_referral_fee_pct` (LO per-deal override allowed pre-term-sheet only); PROC payout task within 5 business days of funding; 1099 totals roll up per partner per year; fee statements downloadable in the portal. Internal broker scorecard: submissions, pull-through %, docs-complete-at-submission %, funded volume, fees paid — CM reviews quarterly to cull low-quality senders.

### 10.7.3 Post-close review/testimonial engine (SYS)

Day 3 after FUNDED: one-question NPS email (0–10, single click). 9–10 → instant redirect to the Google review link (`google_review_url` config) + optional testimonial permission form (`testimonials(deal_id, quote, permission_scope, approved_by_borrower_at)`; `permission_scope` ∈ `WEBSITE`, `SOCIAL`, `FULL`). 7–8 → thank-you, no ask. 0–6 → auto-logged as a LOW-severity complaint (§10.5.5) routed to PRIN — detractors become process fixes, not public reviews — and future asks suppressed on the deal. One re-ask maximum, at payoff, for non-responders; suppressed for any deal with an open complaint. NPS feeds the LO scorecard; a CM case-study task auto-creates on any VIP testimonial with `FULL` scope.

---

## Interfaces with other modules

- **Pipeline/Deal Core (per-deal-type modules)**: writes `stage_transitions` + `activity_events`; calls the stage-gate API before every advance (blocking tasks, conditions, credit-box HARD fails, `compliance_hold`); must require decline reason codes at DECLINED entry; its stage SLA tables drive the `stalled` flag and cycle-time targets.
- **Lead Intake & Sources module**: `lead_source` taxonomy + `source_cost` feed funnel/CPA widgets; broker portal and recycling inject leads with reserved codes `BROKER_SUBMIT` and `RECYCLED_BORROWER`.
- **Underwriting module**: supplies every `credit_box_rules.field_path` input (LTV/LTC, DSCR, FICO, bank-data aggregates, positions); consumes credit-memo generation and draw-review recommendations.
- **Documents/E-sign module**: stores generated PDFs (credit memos, notices, payoff quotes, amendments, lien releases, license evidence); doc-received events auto-complete tasks and flip condition statuses; enforces `retention_policies` owned here.
- **Borrower portal**: renders BORROWER-surface tasks, condition upload requests, portal messaging, draw requests, extension requests, payoff button, express re-application.
- **Investor portal & Capital module (CM)**: receives monthly capital statements, delinquency notices, accreditation refresh flow; LAPSED accreditation blocks allocation; provides `participation_pct`/pass-through rates consumed by payment application, spread revenue, and investor reporting; receives return-of-capital events at payoff; CM capital confirmation is the Tier-3 approval input.
- **Funding/Closing module**: PRIOR_TO_FUNDING condition gate blocks its wire-release task; ACH mandate is one of its required closing documents; its FUNDED event instantiates the `loans` record and servicing playbooks.
- **Auth/Users module**: per-deal role map (LO/PROC/UW/CM/PRIN user ids) resolves task ownership, approval signers, and the escalation ladder; PRIN-only actions (waivers, exceptions, purge approval) enforced by role checks; magic-link identities for brokers and investors.
# Module 11 — Compliance Considerations and Build-vs-Buy / Tech Stack

Lendrock originates business-purpose credit across four pathways (HM, BB, WC, SBA) with a five-person team, which means compliance must be enforced by the portal, not by memory: this section specifies (A) the binding legal constraints — state lender licensing, usury, ECOA/Reg B adverse action, FCRA guarantor pulls, OFAC screening, state commercial-financing disclosure laws, Reg D syndication rules, and SBA agent-fee rules — each translated into concrete `compliance_checks` gates wired to the canonical pipeline, and (B) an honest assessment of the existing repo plus a build-vs-buy decision: build the origination portal custom on the existing Next.js/Prisma skeleton, buy servicing (Bryt) and every commodity (e-sign, Plaid, ACH, OFAC API), and defer vertical LOS/investor platforms until volume triggers defined below. Nothing here is legal advice; attorney checkpoints are marked ⚖️ and are mandatory gates, not suggestions.

---

## PART A — COMPLIANCE MEMO

### A1. State licensing for business-purpose lending

Federal baseline: the SAFE Act and NMLS loan-originator licensing key off loans "primarily for personal, family, or household use." Business-purpose loans are outside that definition federally — but states are free to be stricter, and the important ones are ([AAPL](https://aaplonline.com/articles/compliance/mortgage-lender-licensingwhat-you-need-to-know/), [Private Lender Link](https://privatelenderlink.com/2024/12/states-that-require-a-license-for-private-lending/)):

**Tier 1 — license required for business-purpose lending regardless of collateral type:**

| State | License | Key friction |
|---|---|---|
| California | California Financing Law (CFL) lender/broker license, via NMLS, DFPI-regulated | ~$25K min net worth; cheap and slow (~2–4 months); also *exempts you from CA's constitutional usury cap* — get it early |
| Arizona | Commercial mortgage banker/broker | ~$100K net worth; **in-state brick-and-mortar office + resident qualifying individual** |
| Nevada | Lender license | In-state office + qualified employee requirement |
| North Dakota | Money broker license | Straightforward NMLS filing |
| South Dakota | Money lender license | Straightforward NMLS filing |
| Vermont | Lender license (loans < $1M) | Applies below $1M principal |

**Tier 2 — the 1-4 unit residential trap.** Several states require a mortgage license when the collateral is 1–4 unit residential property **even if the loan is business-purpose**: Oregon, Utah, Minnesota, Idaho, and Georgia (when the borrower is a natural person) ([AAPL](https://aaplonline.com/articles/featured/business-purpose-loans-should-not-be-subject-to-mortgage-lender-licensing/)). Florida's OFR has issued clarifying guidance on when business-purpose loans on residential collateral trigger its mortgage-lender licensing ([Weiner Brodsky Kider](https://www.thewbkfirm.com/industry/florida-clarifies-licensing-requirements-relating-to-business-purpose-loans)) — treat Florida as "check with counsel before first HM deal there." This trap is squarely aimed at Lendrock's HM fix-and-flip book, which is mostly 1–4 unit non-owner-occupied collateral.

**Operational rules (build these, don't memo them):**
1. Maintain a `licensing_matrix` table: `state`, `pathway` (HM/BB/WC), `collateral_class` (RES_1_4 / COMMERCIAL / UNSECURED), `borrower_entity_type` (ENTITY/NATURAL_PERSON), `license_required` (bool), `license_status` (NONE / IN_PROGRESS / ACTIVE / EXEMPT), `license_number`, `renewal_date`, `counsel_note`. PRIN owns the matrix; annual review with licensing counsel (Geraci LLP or equivalent — this is their core practice).
2. SYS gate `LICENSE_CHECK` fires at QUALIFIED: resolves `property_state` (HM) or `borrower_state` (BB/WC) against the matrix. Result `BLOCKED` prevents TERM_SHEET stage entry; only PRIN can override, and the override is logged with reason.
3. Default posture: **lend only to entity borrowers (LLC/corp), never natural persons; never owner-occupied collateral; require a signed `business_purpose_certification` and documented use of proceeds on every deal.** This keeps most edge cases out of the licensing and TILA analyses simultaneously.
4. Renewal automation: SYS task to PROC 90 days before each `renewal_date`.
5. SBA pathway is brokering, not lending — see A5 for the separate loan-broker license analysis.

### A2. Usury (business loans)

Business-purpose does **not** mean usury-exempt; it's state-by-state and it binds the rate engine:

- **California:** constitutional cap of 10% for non-exempt lenders — but licensed CFL lenders are exempt. This is the second reason the CFL license is mandatory before any CA lending.
- **New York:** civil usury 16% (corporate borrowers cannot raise it), **criminal usury 25% applies even to corporate borrowers on loans under $2.5M** (Class E felony); loans over $2.5M are fully exempt ([Wladis Law Firm](https://wladislawfirm.com/blog/new-york-state-maximum-interest-rate-laws/), [LegalClarity](https://legalclarity.org/new-york-usury-law-interest-rate-limits-and-penalties/)). At hard-money pricing (12% + 3 pts on a 12-month note ≈ 15%+ effective), NY deals under $2.5M need careful all-in-rate math — default fees like extension and exit fees count in some analyses.
- Most states materially loosen or waive usury for entity borrowers and/or larger loans (e.g., Florida 25%/45% tiers; Texas complex but generally 18–28% ceilings via rate authorizations), but "entity borrower" is not a universal pass.

**Build spec:** SYS gate `USURY_CHECK` at TERM_SHEET computes `all_in_rate_estimate` = note rate + amortized origination/extension/exit fees over expected term, compares against `usury_cap_table` (`state`, `borrower_entity_type`, `loan_amount_band`, `cap_pct`, `method_note`). Result stored on the deal as `usury_check_status` (PASS / WARN / BLOCKED). Every note template carries a usury savings clause (drafted by counsel, not by us). WARN requires UW acknowledgment; BLOCKED requires repricing or PRIN + counsel.

### A3. Federal consumer-law overlay on business credit

**TILA / RESPA — generally inapplicable, with sharp edges.** Reg Z and RESPA do not apply to business-purpose credit. Edge cases that reclassify a loan as consumer: (a) purpose is judged on substance (Reg Z commentary factors: borrower's occupation, proceeds use, size, degree of borrower management), not on a checkbox; (b) an individual borrowing against their own primary residence "for business" is the classic misclassification; (c) construction-to-perm on a home the borrower will occupy. Controls: entity-borrower-only default, `business_purpose_certification` (signed at APPLICATION, stored as document type `BPC`), `occupancy_certification` for all 1–4 unit collateral, and a hard portal rule: `occupancy_type = OWNER_OCCUPIED` → deal auto-flagged `COMPLIANCE_HOLD`, cannot pass UNDERWRITING without PRIN + outside counsel sign-off (recommended default: decline them).

**ECOA / Reg B — DOES apply to business credit, including declines.** Requirements ([12 CFR 1002.9](https://www.consumerfinance.gov/rules-policy/regulations/1002/9/), [America's Credit Unions](https://www.americascreditunions.org/blogs/compliance/adverse-action-notice-requirements-business-credit-applicants)):
- Businesses with **gross revenue ≤ $1M** (nearly all Lendrock borrowers): notify of action taken **within 30 days of a completed application**; statement of reasons may be oral or written, but the applicant must be told in writing (at application or in the notice) of the right to reasons; record retention 12 months.
- Businesses with gross revenue > $1M: notify within a reasonable time; written reasons only on written request made within 60 days.
- "Adverse action" includes counteroffers not accepted and account terminations — WC line reductions/freezes count.

**Build spec:** entering DECLINED starts SYS timer `ADVERSE_ACTION_TIMER` anchored to `application_completed_at`. PROC owns task "Send adverse action notice" with SLA = 25 days (5-day buffer). Portal generates the AAN from a template with structured `decline_reason_codes` (from the shared DEAD/DECLINED reason-code enum — coordinate with Pipeline module so decline reasons are specific and principal-based: "insufficient collateral value," "cash flow coverage below 1.20x," never "credit policy"). Fields: `adverse_action_notice_sent_at`, `adverse_action_method` (EMAIL/MAIL), `gross_revenue_band` (LTE_1M / GT_1M), `decline_reason_codes[]`. This applies on HM/BB/WC, and on SBA only when Lendrock itself screens the applicant out before any referral (`DECLINE_LTR`, Module 08). When partner lenders decline a referred SBA deal, each declining lender is the creditor and owns its own 1002.9 notice (12 CFR 1002.9(g) — application submitted through a third party to multiple creditors); the portal requires confirmation that each lender's notice reached the applicant (`lender_aan_confirmed_at`, Module 05 §5.11) and Lendrock sends only the facts-only `SBA_WINDDOWN_LTR`.

**Section 1071 (small-business lending data collection):** CFPB's May 2026 revised final rule sets compliance at Jan 1, 2028 and covers only lenders originating **≥1,000 covered small-business transactions per year** in 2026 and 2027 ([CFPB](https://www.consumerfinance.gov/1071-rule/), [Mayer Brown](https://www.mayerbrown.com/en/insights/publications/2026/05/cfpb-issues-final-section-1071-rule-on-small-business-lending-data-collection)). Lendrock is far below threshold. Action: annual SYS report of covered origination count; revisit if > 500/yr.

**FCRA — pulling personal credit on guarantors.** A guarantor's personal liability supplies a permissible purpose, but best practice (and the portal rule) is explicit written authorization from every natural person whose report is pulled; reports on non-liable principals require written consent, full stop ([Compliance Alliance](https://compliancealliance.com/news-events/newsletter/november-2022-newsletters/the-fcra-and-commercial-loans/), [CrossCheck Compliance](https://crosscheckcompliance.com/resources/articles/fcra-fundamentals-permissible-purpose-and-use-of-consumer-reports/)). Build: `credit_pull_consents` table (`person_id`, `deal_id`, `consented_at`, `consent_doc_id`, `pull_type` = HARD/SOFT); the credit-vendor API call is blocked unless a consent row exists. If a decline is based even in part on the consumer report, the AAN must also carry FCRA content: CRA name/address/phone, "CRA didn't make the decision" statement, 60-day free-report right, dispute rights, and credit-score disclosure if a score was used. One combined ECOA+FCRA notice template, versioned in the docs module.

**OFAC / BSA.** Non-bank business lenders are largely outside mandatory BSA program requirements today (FinCEN's expansions target residential-real-estate *transfers* — reporting falls on settlement agents — and investment advisers), but **OFAC sanctions apply to all U.S. persons with no exemption**. Build: SYS `OFAC_SCREEN` against the SDN/consolidated lists for every borrower entity, beneficial owner (≥25% + control person), guarantor, and investor — at APPLICATION, again ≤ 24h before the funding wire (shared pre-wire re-scan, Module 02 §3.6), and before every investor distribution. Store `ofac_screens` (`subject_type`, `subject_id`, `screened_at`, `list_version`, `result` = CLEAR/POTENTIAL_MATCH/CONFIRMED_MATCH, `reviewed_by`). POTENTIAL_MATCH creates a PROC review task and blocks funding; CONFIRMED_MATCH freezes the deal and notifies PRIN (legal obligation to block/reject may attach — counsel immediately). Also collect beneficial-ownership info at APPLICATION (`beneficial_owners` table) — bank partners, title, and SBA lenders will demand it anyway. Wire-fraud control: verbal callback verification of all payoff/disbursement instructions, logged as `wire_verification` task owned by PROC.

**State commercial financing disclosure laws (CFDLs) — the sleeper for BB/WC.** Nine-plus states now require TILA-like disclosures on *commercial* financing: California (SB 1235, ≤$500K, APR-style disclosure), New York (CFDL, ≤$2.5M), Utah (registration + disclosure), Virginia (sales-based), Connecticut, plus the "standard CFDL" group of Florida, Georgia, Kansas, Missouri ([ABA survey](https://www.americanbar.org/groups/business_law/resources/business-lawyer/2025-spring/commercial-financing-disclosure-laws-survey/), [Onyx IQ tracker](https://onyxiq.com/commercial-financing-disclosure-laws/), [DFPI](https://dfpi.ca.gov/regulated-industries/california-financing-law/about-california-financing-law/california-financing-law-commercial-financing-disclosures/)). Real-property-secured transactions are generally exempt (covers HM), so exposure concentrates in **BB unsecured/UCC-secured loans and WC revolving lines**. Build: SYS gate `CFDL_DISCLOSURE_CHECK` at TERM_SHEET for BB/WC: resolve `borrower_state` + amount + product against `cfdl_matrix`; where triggered, generate the state-format disclosure (CA and NY formats are prescriptive — template from counsel) and require borrower e-sign before APPLICATION→TERM_SHEET exit. Fields: `cfdl_required`, `cfdl_disclosure_doc_id`, `cfdl_signed_at`.

### A4. Investor syndication securities law

**Threshold rule: fractional interests are securities. Plan on it.** Under *Reves v. Ernst & Young* (notes presumptively securities, family-resemblance test) and *Howey*, fractional loan interests sold through a platform to passive investors who rely on the sponsor's underwriting and servicing are securities in practice ([Fortra Law](https://fortralaw.com/why-fractional-loan-platforms-must-think-like-securities-issues/), [Reves](https://supreme.justia.com/cases/federal/us/494/56/)). A negotiated **whole-loan sale to one institutional buyer** generally is not; the Second Circuit's *Kirschner* line confirms institutional syndicated loans are not securities ([Ballard Spahr](https://www.ballardspahr.com/insights/alerts-and-articles/2023/08/second-circuit-affirms-syndicated-loans-are-not-securities)) — but Lendrock's investors are individuals, not banks. **Portal rule: every offering of a fractional/participation interest to more than one investor, or to any passive individual, is created as a Reg D offering object. No "it's just a participation" path exists in the UI.**

**Rule 506(b) vs 506(c):**

| Dimension | 506(b) | 506(c) |
|---|---|---|
| General solicitation / advertising | Prohibited — pre-existing substantive relationship only; no deal pages on the public site | Permitted — public marketing, email blasts, webinars OK |
| Who may invest | Unlimited accredited + up to 35 sophisticated non-accredited (per 90-day window) | Accredited only |
| Accreditation standard | Self-certification questionnaire (reasonable belief) | **"Reasonable steps to verify"**: income/asset docs, third-party letter (CPA/attorney/BD/RIA), or — per SEC March 2025 no-action letter — high-minimum + written self-certification: ≥$200K minimum for natural persons, ≥$1M for entities, plus representations that the investor is accredited and the investment isn't third-party-financed, absent contrary knowledge ([Morgan Lewis](https://www.morganlewis.com/pubs/2025/03/new-sec-guidance-eases-burden-in-rule-506c-accredited-investor-verification-requirements), [Gibson Dunn](https://www.gibsondunn.com/sec-provides-bright-line-test-for-investor-verification-under-rule-506c/)) |
| Non-accredited disclosure burden | If any non-accredited: quasi-registration disclosure docs — practically, take zero non-accredited | N/A |
| Investor caps | No cap on accredited count | No cap |
| Form D | Within 15 days of first sale | Same |
| Bad-actor checks (Rule 506(d)) | Required | Required |

**Default: launch under 506(b)** with the existing broker/referral network; the investor surface shows deals only to logged-in investors with `relationship_established_at` set before the offering was created. **Graduate to 506(c)** when Lendrock wants public capital marketing; at that point the portal must require a `verification_evidence` object (method = DOCS / THIRD_PARTY_LETTER / MIN_INVESTMENT_SELF_CERT, `verified_at`, ≤ 5 years old for repeat investors under the 2020 guidance) before a commitment can be accepted. `offerings.exemption_type` (REG_D_506B / REG_D_506C) drives which workflow is enforced. Never mix: a 506(b) offering that gets advertised is blown, and integration doctrine can infect neighbors.

**Deal-by-deal syndication vs mortgage fund:** deal-by-deal (a series LLC or per-deal SPV holding one note; investors pick deals) = faster launch, no blind-pool disclosure, investors love choice, but per-deal admin (sub docs, K-1s, distributions per SPV) scales linearly and re-raising per deal is slow. Fund (pooled LLC, 3(c)(1) ≤100 investors or 3(c)(5)(C) mortgage-pool exclusion) = capital ready before deals, one K-1 stream, but blind-pool PPM, quarterly reporting expectations, and **investment-adviser analysis becomes live** (advising a pooled vehicle that holds securities for a management fee). **Default: deal-by-deal series structure for year 1–2; evaluate a fund at >$25M cumulative raised or >40 syndicated deals/year.**

**Registration tripwires (each is a ⚖️ stop):**
- **Investment adviser:** charging management/asset-based fees on a pooled vehicle whose assets include securities (participations!). Mitigants: 3(c)(5)(C) whole-mortgage pools, state private-fund-adviser exemptions. Analysis required before any fund launch.
- **Broker-dealer:** paying **transaction-based compensation to anyone unregistered for raising capital** (finders, "capital introducers," employees whose comp varies with dollars raised). Hard portal rule: the investor module has no referral-fee field; capital-raise comp is flat salary/bonus only, documented.
- **Blue sky:** Form D on EDGAR within 15 days of first sale; state notice filings + fees in **each state where any investor resides** (most due within 15 days of first sale in that state; file via NASAA's EFD system; New York's filing regime is notoriously its own animal). SYS automation: first accepted commitment from a new `investor_state` creates a PROC task "Blue-sky notice filing — {state}" with a 10-day SLA and fee amount from a lookup table.

**⚖️ Attorney checkpoints (calendar these):** (1) before first syndicated dollar — PPM/subscription/operating-agreement template suite; (2) before any 506(c) switch or public marketing; (3) before any pooled fund or any fund-level fee; (4) before paying anyone anything for investor introductions; (5) annual securities-compliance review; (6) any investor complaint or missed distribution — same week.

### A5. SBA packaging / referral compliance (SBA pathway)

Lendrock is an **"Agent"** (packager and/or referral agent) under 13 CFR Part 103/120 and SOP 50 10, not the lender. Binding rules ([SBA Form 159](https://www.sba.gov/document/sba-form-159-fee-disclosure-compensation-agreement)):

- **SBA Form 159 (Fee Disclosure and Compensation Agreement)** is required whenever Lendrock is compensated for packaging, referral, consulting, or financial-statement prep on a 7(a)/504 application. Signed by applicant, Agent, and the SBA lender; the lender submits it (7(a) at initial disbursement via SBA's fee-disclosure process). If aggregate compensation from one agent exceeds **$2,500**, it must be itemized with actual services performed, on an hourly-rate or percentage basis.
- Fees must be **reasonable for services actually performed** — SBA scrutinizes percentage fees on large loans; keep contemporaneous work logs (the portal's task history per deal is the evidence — export it into the 159 support file).
- **No double-dipping:** a referral fee paid by the lender cannot also be charged to the applicant, directly or indirectly. Portal enforces: `fee_paid_by` (APPLICANT / LENDER) is exclusive per service type per deal.
- **Prohibited/danger zone:** contingent "success fees" framed to dodge disclosure, unreasonable fees, splitting fees with unlicensed third parties. Violations → suspension/revocation of the privilege of doing business with SBA.
- **State loan-broker licensing:** brokering business loans triggers separate state regimes — California requires a CFL *broker* license to broker to CFL lenders (Lendrock's CFL license should cover both authorities); several states (e.g., Florida, Illinois, others) regulate "loan brokers" primarily via **advance-fee prohibitions and disclosure requirements**. **Default policy: the Module 05 §5.5 fee schedule (50% packaging deposit at engagement, 50% at submission-ready) applies except in states whose loan-broker statutes prohibit advance fees** — the `licensing_matrix` flags those states and SYS defers all fee collection to closing there, under the written fee agreement signed at engagement.

**Build spec:** SBA deals carry `sba_fee_agreement_doc_id`, the `form_159_record` lifecycle owned by the SBA module (Module 05 §5.10: `DRAFT | SENT | SIGNED_APPLICANT_AGENT | SIGNED_LENDER | SUBMITTED_BY_LENDER | SUPERSEDED`; a deal with no agent compensation simply carries no `form_159_record`), `agent_fee_amount`, `agent_fee_basis` (FLAT / HOURLY / PCT), `fee_paid_by`. SYS blocks the SBA pathway's FUNDED analog until `form_159_record.status` reaches `SIGNED_LENDER` or `SUBMITTED_BY_LENDER` (matches the Module 06 §2.2 gate). PROC owns 159 preparation; PRIN signs.

### A6. Compliance gates wired to the canonical pipeline

One table, consumed by the Pipeline module as blocking checks on stage transitions:

| Stage | Owner | Required actions | Automations (SYS) | Exit criteria | Target SLA |
|---|---|---|---|---|---|
| APPLICATION | PROC | Collect `business_purpose_certification`, `occupancy_certification` (HM), guarantor `credit_pull_consents`, beneficial-owner info | `OFAC_SCREEN` all parties; block credit pull without consent row | All certs signed; OFAC CLEAR or reviewed | 3 business days |
| QUALIFIED → TERM_SHEET | PROC | Confirm lending state is green | `LICENSE_CHECK` vs `licensing_matrix`; `USURY_CHECK` on proposed pricing; `CFDL_DISCLOSURE_CHECK` (BB/WC) | All checks PASS or PRIN-overridden with logged reason; CFDL disclosure e-signed where required | Same day (automated) |
| UNDERWRITING | UW | Document decline reasons in structured codes if declining | Timer starts on `application_completed_at` | Decision recorded with reason codes | per credit-box module |
| DECLINED (terminal) | PROC | Send combined ECOA/FCRA adverse-action notice | `ADVERSE_ACTION_TIMER` task at day 20, escalation day 25 | `adverse_action_notice_sent_at` ≤ 30 days after completed application | 25 days |
| DOCS_CLOSING | PROC | Verbal wire-verification callback; final party list review | Re-run `OFAC_SCREEN` (≤ 24h before wire — Module 02 §3.6); block funding on stale screen | Fresh OFAC CLEAR; `wire_verification` complete | 24h window |
| FUNDED (SBA pathway) | PROC | Form 159 lender-countersigned and delivered to lender | Block until `form_159_record.status` = `SIGNED_LENDER` or `SUBMITTED_BY_LENDER` (Module 05 §5.10) | 159 lender-countersigned | before lender disbursement |
| SERVICING (investor events) | CM | Approve distributions | `OFAC_SCREEN` investors before each distribution batch; blue-sky filing task on first commitment per new state | Screens clear; filings logged | 10 days (filings) |

All checks persist to `compliance_checks` (`deal_id`, `check_type`, `status` = PASS/WARN/BLOCKED/OVERRIDDEN, `detail_json`, `checked_at`, `overridden_by`, `override_reason`) — this table is the exam-ready audit trail.

---

## PART B — BUILD VS BUY

### B1. Existing repo assessment (honest)

**State:** the working tree at `/Users/aarshpatel/Desktop/Github Repos/portal.lendrockcapital` is **empty except `.git`** — 40 files exist only in git history (HEAD `aa2f697`). First action of month 1: `git restore .` (or re-clone) to materialize it.

**What it is:** "Setu Loan Advisor OS" — a Claude Design handoff implemented as a prototype for a *different product* (a loan-advisor/brokerage CRM with categories `sba | home | investor | refi`, a Gujarati-name field on Client, and a "submit to external lenders" flow). Stack: Next.js 14.2 App Router, React 18, **Prisma 5 on SQLite**, Tailwind 3, server actions only (`app/actions.ts`, 205 lines), ~3,500 LOC total.

**Reusable (~30–35%, worth ≈2–3 weeks of head start):**
- Stack choice itself — Next.js + Prisma + Tailwind is exactly right; keep it.
- The **checklist-materialization pattern** (`DocItem` rows generated from templates keyed by deal category/borrower type) — this is the correct architecture for the doc-checklist engine; keep the pattern, replace the templates.
- UI shells: `PipelineBoard` (Kanban), `TaskList`, `IntakeForm`, `TopNav`, `ui.tsx` primitives — solid starting components.
- Server-action mutation patterns and the `lib/db.ts` Prisma singleton.

**Not reusable (plan a rewrite, not a refactor):**
- **Entire Prisma schema.** String-typed pseudo-enums everywhere; *display strings persisted in the DB* (`last: "just now"`, `due`, `dueK`); no enums, no audit trail, no money type discipline (`amount Int`); stage taxonomy (`new/screening/.../lender`) conflicts with the canonical NEW_LEAD→…→PAID_OFF pipeline. Replace wholesale with the Data Model module's schema.
- SQLite → Postgres (Neon) on day 1; SQLite cannot serve three surfaces.
- **Zero auth, zero roles** — `app/borrower/[id]/page.tsx` is an unauthenticated page keyed by ID. The three-surface model (internal/borrower/investor) requires real auth + RBAC before anything ships.
- No file storage (documents are status-only checklist rows — no upload), no audit/event log, no background jobs, and consumer categories (`home`, `refi`) that must be deleted for the business-purpose-only posture.

**Verdict:** keep the repo as the scaffold for the internal-ops surface; treat it as a UI head start, not a foundation. The schema, auth, storage, and jobs layers are green-field.

### B2. Three-route comparison

Vendor pricing sanity-checked July 2026 ([Bryt](https://www.brytsoftware.com/pricing/), [The Mortgage Office via SoftwareAdvice/ITQlick](https://www.itqlick.com/the-mortgage-office/pricing), [InvestNext/Agora/AppFolio IM via CRE Daily & Homebase](https://www.credaily.com/reviews/investnext-review/), [LendingWise](https://www.lendingwise.com/pricing/) and [Mortgage Automator](https://www.mortgageautomator.com/) are quote-only):

| Criterion | A — Custom (Next.js/Prisma/Postgres + commodity APIs) | B — Vertical private-lending platforms | C — Horizontal CRM (Salesforce FSC / HubSpot / Monday) |
|---|---|---|---|
| Cost/month (realistic, 5 seats) | $300–900 infra+APIs: Vercel+Neon ~$70; Clerk ~$25; e-sign API ~$75; Plaid ~$100–300 usage; ACH (Moov/Dwolla) ~$0–350; OFAC API ~$99; Sentry/PostHog ~$50. Real cost is dev time | Origination: LendingWise ~$500–1,500 (quote); Mortgage Automator ~$1,000–2,000 (quote); Liquid Logics ~$1,000+; Baseline per-active-loan (quote). Servicing: Bryt $59–500; The Mortgage Office ~$100–300/user + $1–5K setup; LoanPro per-loan, realistically $2K+ floor. Investor: InvestNext $499; AppFolio IM $650; Agora $749 | Salesforce FSC $150–325/user (≈$750–1,600) **plus** $25–100K implementation; HubSpot $20–100/seat; Monday $12–24/seat |
| Time to usable | 6–10 weeks to internal MVP on the existing scaffold (AI-assisted, one strong dev) | 2–6 weeks onboarding per vendor | 2–4 weeks to a CRM; **never** to a loan portal |
| Fit: HM | Build exactly to spec | Strong — this is what they're built for (draws, extensions, fractionals in TMO/Automator) | Pipeline only; no draws, no per-diem interest, no payoff quotes |
| Fit: BB / WC | Build exactly to spec (incl. CFDL disclosures, revolver mechanics) | Weak — RE-centric; revolving WC lines poorly modeled | Pipeline only |
| Fit: SBA packaging | Build exactly to spec (159 workflow, lender-submission tracking) | Not modeled | Tolerable as generic pipeline, nothing SBA-aware |
| Three surfaces (ops/borrower/investor) | Yes, one codebase, full UX control | Borrower/investor portals exist but generic, weak white-label | Borrower/investor portals effectively don't exist |
| Scalability | Scales with team; you own the roadmap | Fine to hundreds of loans; per-loan/per-seat fees grow linearly | Salesforce scales at consulting-budget prices |
| Lock-in | None (own DB, own code) | High — data export is painful, workflows non-portable | Very high (FSC data model + apex customizations) |
| Compliance gates as specced (Part A) | Fully implementable | Partially; adverse-action timers and CFDL matrices mostly not | You'd rebuild them as custom objects — badly |

**Why Route C fails as a loan portal (say it once, decide forever):** CRMs have no ledger — no amortization, per-diem interest, draw schedules, payoff quotes, or investor distribution math; no doc-checklist engine bound to credit policy; no borrower/investor surfaces; and every compliance gate becomes a fragile custom object. Teams that go this route end up custom-building a loan system inside a worse development environment at Salesforce-consultant prices. HubSpot's proper role at Lendrock is marketing/lead-capture upstream (landing-page CTAs → webhook → portal NEW_LEAD), not the system of record.

**Why not Route B outright:** no single vertical vendor covers all four pathways — they are HM-shaped. Running LendingWise (HM) + something for BB/WC + spreadsheets for SBA + InvestNext (investors) ≈ $2,000–3,500/month, four data silos, and the borrower experience Lendrock's brand is supposed to beat.

### B3. Recommendation and phased roadmap

**Decision: Route A-hybrid.** Build the origination portal (pipeline, tasks, doc checklists, borrower surface, compliance gates) custom on the restored repo; **buy the servicing ledger** (highest-risk math: payments, per-diem, 1098/1099-INT, escrow) as **Bryt** ($89–130/month tier) for year 1 — scope: HM/BB payment math only; the WC revolver engine is built in-house at WC go-live regardless, and the Bryt sync contract + component-by-component phasing are specified in Module 10 §10.4; buy every commodity; add InvestNext only if the investor base outgrows a custom-lite investor surface. Rationale tied to shape of the company: 5 people can't operate four SaaS silos; the four-pathway product mix has no vertical vendor; and the moat Lendrock wants (fast, branded, automated borrower experience) is exactly the part you can't buy.

**Exact stack (defaults, not options — aligned with Module 09 §9.1/§9.5):** Next.js 15 (App Router) · TypeScript · Prisma → **Neon Postgres** · **Clerk** (auth + orgs for the three surfaces, implementing the Module 09 §9.2.1 auth requirements: TOTP for internal roles, magic-link + SMS OTP step-up for external) · **AWS S3** (versioned, SSE-KMS) with presigned URLs (documents) · **Inngest** (SYS jobs: timers, OFAC re-screens, SLA escalations) · **Postmark** (email) + **Twilio** (SMS) · **Dropbox Sign API** ($75/mo) for e-sign · **Plaid** (bank verification + asset reports) · **Dwolla** (ACH payments/collections — canonical rail, Module 09 §9.5 #13) · **sanctions.io** (~$99/mo OFAC API) + **Middesk** (KYB/beneficial ownership, per-check) · Sentry + PostHog · Vercel hosting. Total non-payroll run rate: **~$500–800/month** at launch.

**Decision criteria (revisit quarterly):**
- Team stays ≤5 and fundings ≤20/month → stay the course above.
- Fundings exceed ~50/month before an in-house servicing module exists → upgrade Bryt tier or move servicing to The Mortgage Office; do not build servicing under fire.
- Distinct passive investors > 50, or a pooled fund launches → buy InvestNext ($499/mo) as the investor system of record; keep the portal's investor surface as a read-through.
- If engineering capacity disappears entirely (no dev on staff/contract) → fall back to LendingWise as interim system of record; the custom portal's Postgres schema is the migration insurance either way.

**Phased roadmap:**

| Phase | Ships | Compliance items live |
|---|---|---|
| **Month 1** | Restore repo; schema rewrite to canonical pipeline + Data Model module spec; Neon Postgres; Clerk auth + RBAC (LO/PROC/UW/CM/PRIN); intake→pipeline→tasks internal surface; document upload to S3; e-sign | `OFAC_SCREEN`, `LICENSE_CHECK` + `licensing_matrix` (seeded: home state green, Tier-1 states red until licensed), `business_purpose_certification` on every deal; CFL license application filed |
| **Months 2–3 (Q2 start)** | Borrower surface (checklist, upload, status); term-sheet generator; Plaid bank verification; Bryt integrated as servicing ledger for HM/BB per the Module 10 §10.4 sync contract (FUNDED push; payment/payoff pull emitting `payment.received` events); HM draw-request workflow | `ADVERSE_ACTION_TIMER` + combined ECOA/FCRA notice generation; `USURY_CHECK`; `CFDL_DISCLOSURE_CHECK` for BB/WC; `credit_pull_consents` enforcement; SBA Form 159 workflow |
| **Quarter 2–3** | Investor surface v1 (506(b): gated deal room, commitments, distribution statements); Dwolla ACH for payments/distributions; reporting dashboards | Offering objects with `exemption_type`; Form D + blue-sky SYS task automation; investor OFAC screening; ⚖️ checkpoint 1 (PPM template suite) |
| **Later (12 mo+)** | In-house HM/BB servicing ledger (retire Bryt; Module 10 §10.4 Phase 2 — WC engine already in-house from WC go-live) only if fundings > 50/mo and a dedicated dev exists; 506(c) verification workflow when marketing goes public; fund structure evaluation at >$25M raised | 506(c) `verification_evidence` enforcement; IA/BD ⚖️ analysis before any fund; SOC 2-lite hardening (access reviews, encryption at rest, vendor DPAs) |

---

## Interfaces with other modules

- **Pipeline/Stages module:** `compliance_checks` gate stage transitions per the A6 table (`LICENSE_CHECK`, `USURY_CHECK`, `CFDL_DISCLOSURE_CHECK`, `OFAC_SCREEN`, `ADVERSE_ACTION_TIMER`); DECLINED terminal stage consumes shared `decline_reason_codes` enum.
- **Data Model module:** owns tables referenced here — `compliance_checks`, `licensing_matrix`, `usury_cap_table`, `cfdl_matrix`, `ofac_screens`, `credit_pull_consents`, `beneficial_owners`, `offerings`, `verification_evidence`.
- **Documents/Templates module:** template registry for `business_purpose_certification`, `occupancy_certification`, combined ECOA/FCRA adverse-action notice, CA/NY CFDL disclosures, SBA fee agreement + Form 159, usury savings clause in note packages.
- **Investor module:** `exemption_type` workflow enforcement, 506(c) verification evidence, Form D/blue-sky SYS tasks, pre-distribution OFAC screens, prohibition on transaction-based capital-raise comp.
- **SBA pathway module:** `form_159_record.status` gate (Module 05 §5.10) before lender disbursement; fee agreement and `fee_paid_by` exclusivity.
- **Servicing module:** Bryt as system-of-record year 1; SYS sync contract (FUNDED deal push, payment/payoff pull) defined jointly.
- **Intake/Marketing module:** HubSpot/landing-page CTAs remain upstream lead capture only; webhook → NEW_LEAD; no compliance data lives there.

### Sources

State licensing: [Private Lender Link](https://privatelenderlink.com/2024/12/states-that-require-a-license-for-private-lending/) · [AAPL licensing](https://aaplonline.com/articles/compliance/mortgage-lender-licensingwhat-you-need-to-know/) · [AAPL business-purpose](https://aaplonline.com/articles/featured/business-purpose-loans-should-not-be-subject-to-mortgage-lender-licensing/) · [Fortra multistate](https://fortralaw.com/the-originate-report/multistate-licensing-considerations-for-private-lenders/) · [WBK Florida](https://www.thewbkfirm.com/industry/florida-clarifies-licensing-requirements-relating-to-business-purpose-loans). Reg B/FCRA: [12 CFR 1002.9](https://www.consumerfinance.gov/rules-policy/regulations/1002/9/) · [America's Credit Unions](https://www.americascreditunions.org/blogs/compliance/adverse-action-notice-requirements-business-credit-applicants) · [Compliance Alliance](https://compliancealliance.com/news-events/newsletter/november-2022-newsletters/the-fcra-and-commercial-loans/) · [CrossCheck](https://crosscheckcompliance.com/resources/articles/fcra-fundamentals-permissible-purpose-and-use-of-consumer-reports/). 1071: [CFPB](https://www.consumerfinance.gov/1071-rule/) · [Mayer Brown](https://www.mayerbrown.com/en/insights/publications/2026/05/cfpb-issues-final-section-1071-rule-on-small-business-lending-data-collection). Usury: [Wladis](https://wladislawfirm.com/blog/new-york-state-maximum-interest-rate-laws/) · [LegalClarity NY](https://legalclarity.org/new-york-usury-law-interest-rate-limits-and-penalties/). CFDL: [ABA survey](https://www.americanbar.org/groups/business_law/resources/business-lawyer/2025-spring/commercial-financing-disclosure-laws-survey/) · [Onyx IQ](https://onyxiq.com/commercial-financing-disclosure-laws/) · [DFPI](https://dfpi.ca.gov/regulated-industries/california-financing-law/about-california-financing-law/california-financing-law-commercial-financing-disclosures/). Securities: [Reves](https://supreme.justia.com/cases/federal/us/494/56/) · [Fortra fractional](https://fortralaw.com/why-fractional-loan-platforms-must-think-like-securities-issues/) · [Ballard Spahr Kirschner](https://www.ballardspahr.com/insights/alerts-and-articles/2023/08/second-circuit-affirms-syndicated-loans-are-not-securities) · [Morgan Lewis 506(c)](https://www.morganlewis.com/pubs/2025/03/new-sec-guidance-eases-burden-in-rule-506c-accredited-investor-verification-requirements) · [Gibson Dunn 506(c)](https://www.gibsondunn.com/sec-provides-bright-line-test-for-investor-verification-under-rule-506c/). SBA: [Form 159](https://www.sba.gov/document/sba-form-159-fee-disclosure-compensation-agreement) · [SBA 159 PDF](https://www.sba.gov/sites/default/files/2022-02/SBA%20Form%20159_2.10.22-508_0.pdf). Vendors: [Bryt pricing](https://www.brytsoftware.com/pricing/) · [TMO pricing](https://www.itqlick.com/the-mortgage-office/pricing) · [InvestNext review](https://www.credaily.com/reviews/investnext-review/) · [Agora review](https://www.credaily.com/reviews/agora-review/) · [AppFolio IM pricing](https://agorareal.com/compare/appfolio-investment-management-pricing/) · [LendingWise](https://www.lendingwise.com/pricing/) · [Mortgage Automator](https://www.mortgageautomator.com/).
# Module 12 — Open Questions & Recommended Defaults

Every decision below is owed by the founder (with counsel where flagged ⚖️). None blocks the build: each ships with the recommended default already wired into the spec, and the config tables (`credit_box_rules`, `licensing_matrix`, `wc_settings`, `routing_rules`, template defaults) make every number changeable without code. Questions are consolidated and deduplicated from Modules 01–11; the module references show where each answer lands.

## A. Stack & build

| # | Question (source modules) | Recommended default |
|---|---|---|
| A1 | Is there a dev on staff/contract for the 6–10-week custom build, or is the LendingWise fallback the month-1 plan? (11) | Contract one strong full-stack dev now and build custom per Module 11 §B3; invoke the LendingWise fallback only if no dev is secured by end of month 1. |
| A2 | E-sign vendor commitment — Dropbox Sign is specced throughout; will SBA partner banks or investors contractually demand DocuSign envelopes? (06, 07) | Standardize on Dropbox Sign before templates are built; revisit only if a signed partner agreement requires DocuSign, and then only for that partner's SBA closing packages. |
| A3 | Banking/ACH provider and treasury reality: Dwolla is the canonical rail; does the bank support treasury APIs, and do investor wires land in an escrow-style account or the operating account? (07, 09, 10, 11) | Dwolla as the single ACH rail, activated at WC go-live (Module 09 §9.5 #13 phasing); investor wires into a segregated funding account, not operating; confirm bank treasury API in month 1. |
| A4 | Can Lendrock get credentialed with a soft-pull reseller (CRS assumed) for guarantor tri-merge? (09) | Start the CRS application in month 1; Experian-reseller single-bureau soft pull as interim fallback. |
| A5 | Accounting entity structure: single opco in QuickBooks or separate lending/fund entities (chart-of-accounts + QBO subscription count)? (09) | Single opco on one QBO Plus subscription until a fund or SPV entity actually exists; revisit at first syndicated deal. |
| A6 | Broker portal in v1 or deferred? The BROKER role and sanitized views are specced but the surface is real scope. (09, 10) | Ship `/brokers/submit` + the `deals@` email parser at launch (Module 01), plus the automated broker milestone emails on stage-group changes (Module 10 §10.7.2 coarse groups: RECEIVED / IN_REVIEW / TERMS_OUT / IN_CLOSING / FUNDED / NOT_MOVING_FORWARD) — the board UI can wait, the push updates cannot; defer only the magic-link broker status board to v1.x once broker-sourced volume justifies it. |
| A7 | Email-in ingestion (`docs+{deal_id}@`) spoofing surface — keep, restrict, or disable? (06) | Keep enabled but accept attachments only from sender addresses already on the deal; everything else lands in PROC triage. |
| A8 | OTP-on-view friction: SMS OTP before a borrower can view uploaded docs or e-sign — keep or drop for speed? (06) | Keep it. Upload stays zero-friction; viewing stored financials over a forwardable link without OTP is an unacceptable trade. |
| A9 | Build the self-serve borrower SBA prescreen form at launch (spec is LO-run)? (05) | LO-run at launch; borrower self-serve prescreen is a v2 lead-gen feature once the SBA pathway has partner throughput. |

## B. Compliance & legal (⚖️ = requires counsel)

| # | Question (source modules) | Recommended default |
|---|---|---|
| B1 | ⚖️ Year-1 lending/brokering state footprint — the single highest-leverage open item: it seeds `licensing_matrix`/`hm_excluded_states`, gates `MTG_DOT` state variants, drives title vendor routing, CFDL config, and whether AZ/NV in-state-office licenses are worth filing. (01, 02, 03, 08, 09, 10, 11) | Founder names 5–10 launch states this month; file the CA CFL immediately; every unmapped state stays hard-blocked by design (a state with no `licensing_matrix` row cannot pass the credit box). |
| B2 | ⚖️ Counsel selection and budget: securities/licensing counsel (Geraci-tier), ~35 attorney-review templates, per-state MTG_DOT variants, annual January review. (08, 11) | Engage licensing/securities counsel by month 2; budget $25–50K year 1 (template suite + licensing matrix); order MTG_DOT variants in launch-state priority order. |
| B3 | ⚖️ Will Lendrock syndicate investor capital in year 1 at all (triggers Reg D workstream, ~$15–40K PPM/doc spend), and 506(b) vs 506(c) timing — any public deal marketing forces 506(c) day one? (07, 10, 11) | Launch 506(b), no public deal pages or blasts; investor surface shows deals only to pre-existing-relationship logged-in investors; trigger the Reg D template spend only when the first participation is actually sold; graduate to 506(c) as a deliberate later decision. |
| B4 | ⚖️ Legal wrapper for investor capital: per-deal pari-passu participations under an evergreen MLPA (as modeled) vs SPV/fund or note structure — changes docs, accreditation flow, and the 1099-INT assumption. (07, 09) | Per-deal pari-passu participations under the evergreen master agreement, 1099-INT tax reporting; securities counsel confirms before the first syndicated dollar; evaluate a fund at >$25M raised or >40 syndicated deals/yr. |
| B5 | CFPB §1071 activation (schema stubbed, firewalled, toggle OFF). (04, 10) | Keep OFF; SYS produces the annual covered-origination count; revisit with counsel if originations exceed ~500/yr (rule threshold is 1,000). |
| B6 | ⚖️ CFDL disclosure scope for BB/WC (CA SB 1235, NY CFDL, UT/VA/GA/FL regimes) — which SYS-generated disclosures must exist at TERM_SHEET? (03, 11) | Build CA and NY prescriptive-format disclosure templates first; `cfdl_matrix` gates TERM_SHEET exit for BB/WC in triggered states; add states as the footprint grows. |
| B7 | Owner-occupied and natural-person-borrower edge deals: spec hard-blocks both — accept the lost deal flow? (11) | Yes. Entity-borrower, non-owner-occupied only; the licensing/TILA blast radius of exceptions is not worth the volume. |
| B8 | Wet-ink/notarized notes on recorded HM deals vs e-sign with per-state wet-ink fallback flags (assignability to institutional note buyers). (08) | E-sign with per-state wet-ink flags as specced; mandate wet ink portfolio-wide only if/when an institutional note-sale program is real. |
| B9 | One retention number for DEAD/DECLINED files (3 years vs the 12-month Reg B business-credit floor, 12 CFR 1002.12(b)(5), vs 5 years). (02, 03, 05, 06, 10) | As normalized in this spec: DEAD 3 years; DECLINED + adverse-action file 5 years (single APPLICATION_DECLINED class, Module 10 §10.5.4); counsel ratifies. |
| B10 | SMS/call-recording defaults (recording on with two-party-consent-state detection) and the two-Twilio-number ops/servicing split. (10) | Keep both as specced; recording with consent-state announcement detection is the audit-friendly default. |
| B11 | ⚖️ Pursue Lender Service Provider agreements with SBA partner banks (changes which SBA docs Lendrock may prepare vs merely collect)? (05, 06) | Defer LSP status; operate year 1 strictly as packager/referral agent under Form 159, which the spec already enforces. |
| B12 | SBA wind-down letter's automatic BB/WC cross-sell — human review before outreach to just-declined applicants? (05, 08) | Yes: LO reviews and releases the cross-sell outreach; the lead auto-creates either way. |

## C. Capital structure & investor program

| # | Question (source modules) | Recommended default |
|---|---|---|
| C1 | Funding model per pathway: HM balance-sheet vs participation share; BB balance-sheet vs sold/participated; WC warehouse mechanics; and whether >$1M deals (`jumbo_referral`) ever fund on balance sheet. (01, 02, 03, 04, 07, 11) | WC and BB on balance sheet + warehouse; HM syndicated with the 10% house co-invest; HM >$1M allowed on balance sheet only through the deal-committee tier; all other >$1M requests are partner placements. |
| C2 | Should a failed CM capital reservation hard-block APPROVED (HM), and should insufficient warehouse headroom hard-block WC disbursements — or warn only? (02, 04) | Hard block with PRIN in-app override on both; CM alerted at ≥85% facility utilization so the block is rare. |
| C3 | House co-invest economics: 10% target / 35% max balance-sheet absorption per deal, and PRIN's dollar authority ceiling. (07) | Ratify 10%/35%; set PRIN's co-invest ceiling at $500K per deal, above which co-invest itself goes to deal committee. |
| C4 | One uniform investor rate per deal vs negotiated anchor-investor pricing (would require per-participation rate approval workflow). (07) | One rate per deal at launch; revisit only if a committed anchor writes >40% of volume. |
| C5 | Distribution cadence: monthly batch on the 10th vs pass-through within days of each borrower payment. (07) | Monthly batch on the 10th — ops simplicity wins at this team size; pass-through is a v2 concession if a major investor demands it. |
| C6 | Default-interest 50/50 split and 100% late-fee retention — do they match the intended MLPA economics? (07) | Ratify as specced and mirror the exact split language in the MLPA. |
| C7 | IRA/SD-401k investors at launch (custodian signatures + titling in onboarding/docs)? (07) | Defer to v1.x; accept individual and entity investors only at launch. |
| C8 | Concentration limits: portfolio (40% state, 20% ground-up, 10% single borrower), investor-in-deal flags (40%/60%), and the deal-committee numbers CM must enforce. (02, 07, 10) | Adopt the shipped numbers as binding config; PRIN reviews quarterly against the exceptions register. |
| C9 | `revenue_targets` table values that drive dashboard alerting. (10) | PRIN sets monthly targets before dashboards go live; until set, widgets render actuals without variance alerts. |

## D. Ops, credit box & pricing

| # | Question (source modules) | Recommended default |
|---|---|---|
| D1 | Ratify all shipped credit-box numbers: HM guardrails (70% ARV/85% LTC, FICO floors, liquidity), BB box (min revenue $30k/$15k, FICO 640/600, LTV 70%, 14–24% and 10.5–13% + 2–4 pts pricing tiers), WC scorecard/formula, and the tier breakpoints. (02, 03, 04, 10) | Adopt shipped defaults now (structure is fixed, numbers are config); re-tune quarterly from the exceptions register — that loop exists precisely so day-1 numbers don't need to be perfect. |
| D2 | Approval delegation: UW solo at HM $500K / BB $250K / WC $150K (the WC $100K-vs-$150K draft conflict is resolved to $150K portal-wide). (02, 03, 04, 10) | Adopt as normalized in Module 10 §10.2.2; PRIN can tighten any single number in config without touching structure. |
| D3 | WC ceiling: $250K standard / $500K PRIN exception, or intentionally cap lower and push larger needs to BB? (04) | Keep $250K/$500K; the §2.3 formula rarely reaches the ceiling anyway, and BB reroute exists for term-debt-shaped needs. |
| D4 | WC unattended money movement: $25K auto-approve draw ceiling and same-day ACH cutoff (Dwolla fee/limit tiers). (04) | Keep the $25K auto-approve; launch with next-day ACH only and enable same-day after 90 days of clean draw history. |
| D5 | WC origination fee collection: net from first draw (specced) vs debit at activation — revenue timing on never-drawn lines. (04) | Net-first-draw; a line that never draws costing the borrower nothing is a feature, not leakage. |
| D6 | WC pricing details: Prime + 6/9/12 margins, 12% floor, no unused-line fee, and term-out (6-month amortization) vs demand at maturity. (04, 08) | Ratify pricing as shipped; keep no unused-line fee at launch; term-out default stands — counsel confirms the LOC agreement supports automatic conversion. |
| D7 | Statement-only WC borrowers: is the mandatory 30-day post-activation Plaid covenant commercially acceptable? (04) | Keep it; UW may extend to 60 days by memo for bank-privacy-sensitive borrowers rather than waiving. |
| D8 | MCA consolidation as an offered product (full-payoff-only path) vs hard-declining all stacked borrowers. (03) | Keep the disciplined full-payoff-only consolidation path with PRIN sign-off on every one; it is the highest-loss segment — track it as its own cohort from day 1. |
| D9 | Equipment financing: fund on BB or broker to specialty equipment lenders for a fee (site markets it; funding model unstated)? (01) | Fund small-ticket (≤$250K, PMSI-secured) on BB_BIZ; broker larger/specialty equipment to partner lenders under the SBA-style referral mechanics. |
| D10 | Due-diligence deposits: $1,995 FF/BTP, $2,995 GUC, $2,500 BB_CRE — and refundable on Lendrock decline vs credited only at closing? (02, 03) | Confirm amounts; refund in full when Lendrock declines, credit against closing costs otherwise — cheap reputation insurance in a referral-driven market. |
| D11 | Interest reserve: financed into the loan (specced, 6–9 months) vs borrower-funded at closing. (02) | Financed, as specced; borrower-funded reserves kill marginal-liquidity deals that are otherwise in-box. |
| D12 | Extension economics: 1.0%/1.5% fees, rate step-up during extensions, and BB's +1pp at extension 3. (02, 10) | Keep as normalized (HM: no step-up through extension 2, max 2 extensions; BB: +1pp at ext 3); counsel checks against state usury/fee caps alongside the default-rate (+5pp) and late-fee (10%/10-day) terms. |
| D13 | First-time investors (track-record TIER-3/no-exit): serve at reduced leverage (specced) or decline outright? (02) | Serve at −10 pts max LTC with mandatory PRIN sign-off, as specced; monitor the cohort's loss rate for 12 months before loosening or killing. |
| D14 | Draw inspection sourcing: national panel via API vs regional network, and the $250 per-draw fee pass-through. (02, 10) | National inspection panel via API for coverage and SLA enforcement; pass the $250 fee through against the draw. |
| D15 | Appraisal policy: valuation-matrix thresholds and who fronts the appraisal fee. (02, 06) | Matrix per Module 02 §3.2 governs (not a flat $500K rule); borrower pays at TERM_SHEET acceptance via the DD deposit, credited at closing. |
| D16 | Non-recourse/bad-boy carve-outs on BB_CRE given a 5-person team's workout capacity. (03) | Allow only for tier T1 at ≤60% LTV with PRIN approval (as specced); no other PG relief. |
| D17 | Business-hours window and weekend coverage for HOT-lead SLA clocks; LO ownership today and broker-vs-web routing when a second LO is hired. (01) | Mon–Fri 08:00–20:00 ET portal-wide (as normalized); HOT leads page PRIN's phone on weekends, no formal weekend SLA; routing stays FIXED to the sole LO now — on the second hire, broker-sourced deals move to the house-LO rule already dormant in `routing_rules`. |
| D18 | Minimum credit floor: sub-550 self-reported stays a score penalty, not a knockout — should any pathway hard-decline on stated credit alone? (01) | Keep penalty-only at intake; verified tier floors at underwriting (620–680 by product) do the hard-declining with proper adverse-action handling. |
| D19 | Prohibited-industry list (adult, cannabis-touching, gambling, firearms dealers, crypto mining defaulted) — cannabis-adjacent and MCA-heavy industries are real revenue tradeoffs. (01, 03, 04) | Adopt the default list in the shared NAICS-keyed config; PRIN revisits cannabis-adjacent quarterly with loss data rather than debating it at launch. |
| D20 | Broker upload rights: broker-scoped magic link on sourced deals, or borrower-link-only (current spec)? (06) | Grant brokers a scoped upload-only magic link on their sourced deals (extends Module 06's guarantor-link pattern); review/acceptance stays internal. |
| D21 | SBA program mechanics: packaging fees flat $3,500/$5,000 non-contingent; referral fee 1% with per-deal overrides; parallel-3 vs sequential submission; borrower-visible lender names; 504 at launch. (05) | Flat non-contingent fees (the compliance-safe default); add a per-deal `referral_fee_bps` override field at LENDER_MATCHING; keep 3-parallel default with a per-lender "no shopped deals" flag forcing sequential; anonymize lender names until proposal stage; launch 7(a)-only and hide the 504 enum until a CDC relationship exists. |
| D22 | Recovery of ~$50–70/application third-party costs (credit, screening, AVM). (09) | $295 application/processing fee collected at TERM_SHEET acceptance on BB/WC (HM deposits already absorb it); disclosed on the term sheet. |
| D23 | Vendor confirmations: Dwolla (ACH), sanctions.io (OFAC), Postmark (email), Lob (mail), Persona/Middesk (KYC/KYB), inspection panel — all specced as swappable defaults. (09, 10, 11) | Adopt all defaults now; every vendor sits behind the Module 09 integration layer, so swaps are config-plus-adapter, never schema changes. |
