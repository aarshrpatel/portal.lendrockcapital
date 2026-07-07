// Module 10 §10.2.1 — the credit-box auto-check engine. Rules live in the
// CreditBoxRule table (data, not code); this evaluates a deal snapshot
// against them and returns PASS / PASS_WITH_EXCEPTIONS / FAIL.

import type { CreditBoxRule, Deal } from "@prisma/client";

export type CreditFlag = {
  field: string;
  label: string;
  severity: "HARD" | "SOFT";
  actual: number;
  op: string;
  limit: number;
};

export type CreditBoxResult = {
  result: "PASS" | "PASS_WITH_EXCEPTIONS" | "FAIL";
  flags: CreditFlag[];
  snapshot: Record<string, number>;
};

export function dealSnapshot(deal: Deal): Record<string, number> {
  const amount = deal.amountCents;
  const ltvBps = deal.asIsValueCents > 0 ? Math.round((amount / deal.asIsValueCents) * 10000) : 0;
  const ltarvBps = deal.arvCents > 0 ? Math.round((amount / deal.arvCents) * 10000) : 0;
  const cost = deal.asIsValueCents + deal.rehabBudgetCents;
  const ltcBps = cost > 0 ? Math.round((amount / cost) * 10000) : 0;
  return {
    amount_cents: amount,
    ltv_bps: ltvBps,
    ltarv_bps: ltarvBps,
    ltc_bps: ltcBps,
    fico_mid: deal.ficoMid ?? 0,
    monthly_revenue_cents: deal.monthlyRevenueCents,
    dscr_bps: deal.dscrBps,
    rate_bps: deal.rateBps,
    term_months: deal.termMonths,
  };
}

export function runCreditBox(deal: Deal, rules: CreditBoxRule[]): CreditBoxResult {
  const snapshot = dealSnapshot(deal);
  const applicable = rules.filter(
    (r) =>
      r.active &&
      r.dealType === deal.dealType &&
      (r.subType === "" || r.subType === deal.subType)
  );

  const flags: CreditFlag[] = [];
  for (const rule of applicable) {
    const actual = snapshot[rule.field];
    if (actual === undefined || actual === 0) continue; // unknown values don't flag; UW verifies
    const violated = rule.op === "LTE" ? actual > rule.value : actual < rule.value;
    if (violated) {
      flags.push({
        field: rule.field,
        label: rule.label,
        severity: rule.severity as "HARD" | "SOFT",
        actual,
        op: rule.op,
        limit: rule.value,
      });
    }
  }

  const hard = flags.filter((f) => f.severity === "HARD");
  const result: CreditBoxResult["result"] =
    hard.length > 0 ? "FAIL" : flags.length > 0 ? "PASS_WITH_EXCEPTIONS" : "PASS";

  return { result, flags, snapshot };
}

export function describeFlag(f: CreditFlag): string {
  const fmtVal = (field: string, v: number) => {
    if (field.endsWith("_bps")) return `${(v / 100).toFixed(1)}%`;
    if (field.endsWith("_cents")) return `$${Math.round(v / 100).toLocaleString()}`;
    return String(v);
  };
  const dir = f.op === "LTE" ? "max" : "min";
  return `${f.label}: ${fmtVal(f.field, f.actual)} vs ${dir} ${fmtVal(f.field, f.limit)}`;
}
