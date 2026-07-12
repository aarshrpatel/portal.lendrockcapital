// Module 01 — hard knockouts and deal-type classification from use_of_funds.

import { USE_OF_FUNDS_OPTIONS } from "@/lib/enums";

export type LeadInput = {
  amountCents: number;
  useOfFunds: string;
  fundingTimeline: string;
  creditStated: string;
  source: string;
  email: string;
  phone: string;
  state: string;
};

// ── classification ────────────────────────────────────────────────
export function classifyDealType(useOfFunds: string, fundingTimeline: string): string {
  const opt = USE_OF_FUNDS_OPTIONS.find((o) => o.code === useOfFunds);
  if (!opt) return "";
  // Disambiguation (Module 01 §4.2): an SBA-shaped acquisition that needs
  // money in under two weeks reclasses to a BB bridge (sba_takeout_candidate).
  if (opt.dealType === "SBA" && (fundingTimeline === "ASAP" || fundingTimeline === "UNDER_30D")) {
    return "BB";
  }
  return opt.dealType;
}

// ── hard knockouts (Module 01 §4.4) ───────────────────────────────
// Rules live in the KnockoutRule table (data, not code — same pattern as
// CreditBoxRule). PRIN/ADMIN manage them at /leads/knockouts. The
// unlicensed-state check stays structural: LicensingMatrix is the
// compliance source of truth and is not editable as a knockout row.
export type Knockout = { code: string; label: string };

export type KnockoutInput = LeadInput & { consumerPurpose?: boolean; industry?: string };

export type KnockoutRuleSpec = {
  code: string;
  label: string;
  field: string;
  op: string;
  value: string;
  active: boolean;
};

// Fields a rule can test. `collected` marks what the intake forms capture
// today — rules on un-collected fields are legal but dormant until the
// form asks for the answer (unknown values never DQ; UW verifies later).
export const KNOCKOUT_FIELDS = [
  { code: "amount_cents", label: "Requested amount", kind: "money", collected: true },
  { code: "state", label: "State", kind: "text", collected: true },
  { code: "use_of_funds", label: "Use of funds", kind: "text", collected: true },
  { code: "funding_timeline", label: "Funding timeline", kind: "text", collected: true },
  { code: "credit_stated", label: "Stated credit", kind: "text", collected: true },
  { code: "source", label: "Lead source", kind: "text", collected: true },
  { code: "industry", label: "Industry", kind: "text", collected: true },
  { code: "consumer_purpose", label: "Consumer-purpose flag", kind: "flag", collected: true },
] as const;

export const KNOCKOUT_OPS = [
  { code: "LT", label: "is below" },
  { code: "GT", label: "is above" },
  { code: "EQ", label: "equals" },
  { code: "NEQ", label: "does not equal" },
  { code: "IN", label: "is one of" },
  { code: "NOT_IN", label: "is not one of" },
  { code: "IS_TRUE", label: "is flagged" },
] as const;

function knockoutFieldValue(input: KnockoutInput, field: string): string | number | boolean | undefined {
  switch (field) {
    case "amount_cents": return input.amountCents;
    case "state": return input.state;
    case "use_of_funds": return input.useOfFunds;
    case "funding_timeline": return input.fundingTimeline;
    case "credit_stated": return input.creditStated;
    case "source": return input.source;
    case "industry": return input.industry;
    case "consumer_purpose": return input.consumerPurpose;
    default: return undefined;
  }
}

export function ruleViolated(actual: string | number | boolean | undefined, op: string, value: string): boolean {
  if (op === "IS_TRUE") return actual === true;
  // Unknown/empty/zero values never DQ — same principle as the credit box.
  if (actual === undefined || actual === null || actual === "" || actual === 0 || actual === false) return false;
  if (op === "LT" || op === "GT") {
    const limit = Number(value);
    const n = Number(actual);
    if (!Number.isFinite(limit) || !Number.isFinite(n)) return false;
    return op === "LT" ? n < limit : n > limit;
  }
  const s = String(actual).trim().toUpperCase();
  const list = value.split(",").map((v) => v.trim().toUpperCase()).filter(Boolean);
  if (list.length === 0) return false;
  switch (op) {
    case "EQ": return s === list[0];
    case "NEQ": return s !== list[0];
    case "IN": return list.includes(s);
    case "NOT_IN": return !list.includes(s);
    default: return false;
  }
}

export function checkKnockouts(
  input: KnockoutInput,
  licensedStates: Set<string>,
  rules: KnockoutRuleSpec[]
): Knockout | null {
  if (input.state && licensedStates.size > 0 && !licensedStates.has(input.state)) {
    return { code: "DQ_EXCLUDED_STATE", label: `Not licensed to lend in ${input.state}` };
  }
  for (const rule of rules) {
    if (!rule.active) continue;
    if (ruleViolated(knockoutFieldValue(input, rule.field), rule.op, rule.value)) {
      return { code: rule.code, label: rule.label };
    }
  }
  return null;
}

// ── speed-to-lead SLA (Module 01 §5.2) ────────────────────────────
export const SPEED_TO_LEAD = {
  autoResponseSeconds: 30,
  firstTouchMinutes: 5, // business minutes, human touch required
  prinEscalationMinutes: 15,
  secondChanceMinutes: 30,
};

// ── stale-lead auto-DEAD clocks (business days by stage) ──────────
export const STALE_CLOCK_DAYS: Record<string, number> = {
  NEW_LEAD: 10,
  CONTACTED: 21,
  QUALIFIED: 30,
};
