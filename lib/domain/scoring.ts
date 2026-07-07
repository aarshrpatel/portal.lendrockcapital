// Module 01 — lead scoring (fixed 100-point formula), hard knockouts, and
// deal-type classification from use_of_funds.

import { LEAD_BANDS, USE_OF_FUNDS_OPTIONS } from "@/lib/enums";

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

// ── scoring (amount 20 · strength 20 · type 15 · timeline 15 · credit 10 · source 10 · contact 10)
export function scoreLead(input: LeadInput): { score: number; band: string } {
  let score = 0;

  const amt = input.amountCents / 100;
  if (amt >= 1_000_000) score += 20;
  else if (amt >= 500_000) score += 17;
  else if (amt >= 250_000) score += 14;
  else if (amt >= 100_000) score += 10;
  else if (amt >= 50_000) score += 6;
  else if (amt > 0) score += 3;

  // deal strength proxy: a concrete use of funds beats "exploring"
  if (input.useOfFunds) score += input.fundingTimeline === "EXPLORING" ? 8 : 20;

  const typeScore: Record<string, number> = { HM: 15, BB: 13, WC: 11, SBA: 8 };
  score += typeScore[classifyDealType(input.useOfFunds, input.fundingTimeline)] ?? 0;

  const timelineScore: Record<string, number> = {
    ASAP: 15,
    UNDER_30D: 13,
    D30_90: 9,
    OVER_90D: 5,
    EXPLORING: 1,
  };
  score += timelineScore[input.fundingTimeline] ?? 0;

  const creditScore: Record<string, number> = {
    EXCELLENT: 10,
    GOOD: 8,
    FAIR: 5,
    UNKNOWN: 3,
    POOR: 1,
  };
  score += creditScore[input.creditStated] ?? 0;

  const sourceScore: Record<string, number> = {
    REFERRAL: 10,
    BROKER: 8,
    WEB: 6,
    EVENT: 5,
    QUICK_ADD: 5,
    EMAIL_PARSE: 4,
    CSV_IMPORT: 2,
  };
  score += sourceScore[input.source] ?? 3;

  if (input.email) score += 5;
  if (input.phone) score += 5;

  const band = score >= LEAD_BANDS.HOT ? "HOT" : score >= LEAD_BANDS.WARM ? "WARM" : "COOL";
  return { score, band };
}

// ── hard knockouts (Module 01 §4.4) ───────────────────────────────
export type Knockout = { code: string; label: string };

export function checkKnockouts(
  input: LeadInput & { consumerPurpose?: boolean; industry?: string },
  licensedStates: Set<string>
): Knockout | null {
  if (input.state && licensedStates.size > 0 && !licensedStates.has(input.state)) {
    return { code: "DQ_EXCLUDED_STATE", label: `Not licensed to lend in ${input.state}` };
  }
  if (input.consumerPurpose) {
    return { code: "DQ_CONSUMER_PURPOSE", label: "Consumer-purpose request — business-purpose lending only" };
  }
  if (input.amountCents > 0 && input.amountCents < 2_500_000) {
    return { code: "DQ_BELOW_MINIMUM", label: "Requested amount below $25k portal minimum" };
  }
  const prohibited = ["ADULT", "CANNABIS", "GAMBLING", "FIREARMS_DEALER", "CRYPTO_MINING"];
  if (input.industry && prohibited.includes(input.industry)) {
    return { code: "DQ_PROHIBITED_INDUSTRY", label: "Prohibited industry per credit policy" };
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
