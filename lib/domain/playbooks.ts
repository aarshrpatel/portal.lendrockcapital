// Module 10 §10.6 — the task engine's stage playbooks. When a deal enters a
// stage, its playbook materializes as Task rows. This is the mechanism the
// pathway workflows (Modules 02–05) actually run on.

import type { Role } from "@/lib/enums";

export type PlaybookTask = {
  code: string;
  title: string;
  type: string;
  owner: Role | "SYS";
  priority?: "HIGH" | "MED" | "LOW";
  slaHours?: number;
};

type Playbook = Record<string, PlaybookTask[]>;

const COMMON: Playbook = {
  APPLICATION: [
    { code: "APP_SEND_LINK", title: "Send borrower application magic link", type: "GENERAL", owner: "SYS" },
    { code: "APP_MONITOR", title: "Monitor application completion; chase stalled items", type: "DOC_CHASE", owner: "PROC", slaHours: 24 },
    { code: "APP_CREDIT_PULL", title: "Soft tri-merge credit pull — all guarantors", type: "ORDER", owner: "SYS" },
    { code: "APP_OFAC", title: "OFAC/watchlist scan — entity + guarantors", type: "COMPLIANCE", owner: "SYS" },
  ],
  TERM_SHEET: [
    { code: "TS_PRESCREEN", title: "Run credit-box pre-screen", type: "REVIEW", owner: "SYS" },
    { code: "TS_ISSUE", title: "Review pre-screen; issue term sheet", type: "GENERAL", owner: "LO", priority: "HIGH", slaHours: 8 },
    { code: "TS_DEPOSIT", title: "Collect signed TS + due-diligence deposit", type: "GENERAL", owner: "LO", slaHours: 80 },
  ],
  UNDERWRITING: [
    { code: "UW_MEMO", title: "Full credit underwrite; write credit memo", type: "REVIEW", owner: "UW", priority: "HIGH", slaHours: 40 },
    { code: "UW_CONDITIONS", title: "Clear prior-to-approval conditions", type: "REVIEW", owner: "PROC", slaHours: 40 },
  ],
  APPROVED: [
    { code: "APR_ROUTE", title: "Route approval package per sign-off matrix", type: "REVIEW", owner: "SYS" },
    { code: "APR_COMMITMENT", title: "Issue commitment letter; lock rate/fees", type: "GENERAL", owner: "UW", slaHours: 8 },
    { code: "APR_CAPITAL", title: "Reserve capital for funding", type: "GENERAL", owner: "CM", slaHours: 8 },
  ],
  DOCS_CLOSING: [
    { code: "CLS_DOCS", title: "Generate doc package; send to title/escrow", type: "CLOSING", owner: "PROC", priority: "HIGH", slaHours: 8 },
    { code: "CLS_CONDITIONS", title: "Clear prior-to-funding conditions", type: "CLOSING", owner: "PROC", slaHours: 24 },
    { code: "CLS_OFAC", title: "OFAC re-scan ≤ 24h pre-wire (blocks wire)", type: "COMPLIANCE", owner: "SYS" },
    { code: "CLS_WIRE_VERIFY", title: "Verify wire instructions via out-of-band callback", type: "CLOSING", owner: "PROC", priority: "HIGH" },
    { code: "CLS_WIRE_RELEASE", title: "Release funding wire (dual control)", type: "CLOSING", owner: "UW", priority: "HIGH" },
  ],
  FUNDED: [
    { code: "FND_CONFIRM", title: "Confirm wire settlement; assign capital source", type: "GENERAL", owner: "CM", slaHours: 16 },
    { code: "FND_SERVICING", title: "Servicing record + payment schedule live", type: "GENERAL", owner: "SYS" },
    { code: "FND_WELCOME", title: "Borrower welcome + autopay setup", type: "GENERAL", owner: "SYS" },
  ],
  SERVICING: [
    { code: "SVC_MONITOR", title: "Monthly billing, tax/insurance ticklers, maturity watch", type: "GENERAL", owner: "PROC" },
  ],
  PAID_OFF: [
    { code: "PO_RECONCILE", title: "Reconcile ledger; release lien", type: "GENERAL", owner: "PROC", slaHours: 24 },
    { code: "PO_CAPITAL_RETURN", title: "Return investor capital + final distribution", type: "GENERAL", owner: "CM", slaHours: 24 },
  ],
};

const HM_EXTRA: Playbook = {
  UNDERWRITING: [
    { code: "UW_ORDER_TITLE", title: "Auto-order: title prelim + escrow open", type: "ORDER", owner: "SYS" },
    { code: "UW_ORDER_VALUATION", title: "Auto-order: valuation per size matrix", type: "ORDER", owner: "SYS" },
    { code: "UW_ORDER_INSURANCE", title: "Auto-order: insurance request to borrower's agent", type: "ORDER", owner: "SYS" },
    { code: "UW_ORDER_BACKGROUND", title: "Auto-order: background + entity good standing", type: "ORDER", owner: "SYS" },
    { code: "UW_TRACK_RECORD", title: "Score borrower track record (T1/T2/T3)", type: "REVIEW", owner: "UW", slaHours: 16 },
    { code: "UW_BUDGET_REVIEW", title: "Rehab budget / feasibility review", type: "REVIEW", owner: "UW", slaHours: 24 },
  ],
  DOCS_CLOSING: [
    { code: "CLS_DRAW_SCHEDULE", title: "Create draw schedule from approved budget", type: "CLOSING", owner: "PROC", slaHours: 16 },
  ],
};

const BB_EXTRA: Playbook = {
  UNDERWRITING: [
    { code: "UW_CASHFLOW", title: "Review SYS cash-flow analysis (Plaid/statements)", type: "REVIEW", owner: "UW", slaHours: 16 },
    { code: "UW_STACKING", title: "Review MCA-stacking detection output", type: "REVIEW", owner: "UW", priority: "HIGH", slaHours: 8 },
    { code: "UW_UCC_SEARCH", title: "UCC-1 lien search; payoff/subordination plan", type: "ORDER", owner: "PROC", slaHours: 24 },
  ],
  DOCS_CLOSING: [
    { code: "CLS_UCC_FILE", title: "E-file UCC-1 (funding blocks until acknowledgment)", type: "CLOSING", owner: "SYS" },
  ],
};

const WC_EXTRA: Playbook = {
  UNDERWRITING: [
    { code: "UW_LIMIT", title: "Set credit limit from formula + tier scorecard", type: "REVIEW", owner: "UW", slaHours: 16 },
  ],
  FUNDED: [
    { code: "WC_ACTIVATE", title: "Activate line ($0 drawn); enable borrower draws", type: "GENERAL", owner: "SYS" },
  ],
};

const SBA: Playbook = {
  ENGAGED: [
    { code: "SBA_AGREEMENT", title: "Packaging agreement + Form 159 e-sign", type: "GENERAL", owner: "LO", priority: "HIGH", slaHours: 24 },
    { code: "SBA_DEPOSIT", title: "Collect packaging deposit", type: "GENERAL", owner: "LO", slaHours: 24 },
  ],
  APPLICATION: [
    { code: "SBA_PACKAGE", title: "Assemble SBA package (1919, 413, returns, debt schedule)", type: "DOC_CHASE", owner: "PROC", slaHours: 80 },
    { code: "SBA_STATUS_CADENCE", title: "Weekly borrower status update (mandatory)", type: "GENERAL", owner: "SYS" },
  ],
  LENDER_MATCHING: [
    { code: "SBA_MATCH", title: "Match package to partner-lender appetites (3 parallel)", type: "REVIEW", owner: "CM", priority: "HIGH", slaHours: 24 },
  ],
  SUBMITTED: [
    { code: "SBA_LIAISON", title: "Lender underwriting liaison; track responses", type: "GENERAL", owner: "CM", slaHours: 80 },
  ],
  UNDERWRITING: [
    { code: "SBA_LENDER_UW", title: "Support lender underwriting; chase conditions", type: "DOC_CHASE", owner: "PROC", slaHours: 80 },
  ],
  APPROVED: [
    { code: "SBA_AUTH", title: "SBA authorization received; coordinate closing", type: "GENERAL", owner: "CM", slaHours: 40 },
  ],
  DOCS_CLOSING: [
    { code: "SBA_CLOSING", title: "Closing coordination with lender + borrower", type: "CLOSING", owner: "PROC", slaHours: 40 },
  ],
  FUNDED: [
    { code: "SBA_FEE", title: "Invoice packaging/referral fee (per Form 159)", type: "GENERAL", owner: "CM", priority: "HIGH", slaHours: 16 },
  ],
};

export function playbookFor(dealType: string, stage: string): PlaybookTask[] {
  if (dealType === "SBA") return SBA[stage] ?? [];
  const extra =
    dealType === "HM" ? HM_EXTRA[stage] : dealType === "BB" ? BB_EXTRA[stage] : dealType === "WC" ? WC_EXTRA[stage] : undefined;
  return [...(COMMON[stage] ?? []), ...(extra ?? [])];
}
