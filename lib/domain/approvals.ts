// Module 10 §10.2.2 — tiered approval matrix. Signoffs are collected in
// parallel; PRIN pinged after others land (modeled here as required roles).

import type { Deal } from "@prisma/client";

export type TierSpec = { tier: 1 | 2 | 3; roles: ("UW" | "PRIN" | "CM")[]; reason: string };

export function approvalTier(deal: Deal, exceptionCount: number): TierSpec {
  const amt = deal.amountCents;
  const t = deal.dealType;

  if (t === "HM") {
    if (amt > 200_000_000 || exceptionCount >= 2 || (deal.subType === "HM_GUC" && amt > 100_000_000)) {
      return { tier: 3, roles: ["UW", "PRIN", "CM"], reason: "Deal committee: > $2M, ≥ 2 exceptions, or GUC > $1M" };
    }
    if (amt > 50_000_000 || exceptionCount === 1) {
      return { tier: 2, roles: ["UW", "PRIN"], reason: "> $500k or 1 exception" };
    }
    return { tier: 1, roles: ["UW"], reason: "≤ $500k, clean file" };
  }

  if (t === "BB") {
    if (amt > 75_000_000) return { tier: 3, roles: ["UW", "PRIN", "CM"], reason: "> $750k" };
    if (amt > 25_000_000 || exceptionCount > 0) {
      return { tier: 2, roles: ["UW", "PRIN"], reason: "> $250k or any exception" };
    }
    return { tier: 1, roles: ["UW"], reason: "≤ $250k, in-box" };
  }

  if (t === "WC") {
    if (amt > 15_000_000 || exceptionCount > 0 || deal.subType === "WC_BORROWING_BASE") {
      return { tier: 2, roles: ["UW", "PRIN"], reason: "> $150k, exception, or borrowing-base structure" };
    }
    return { tier: 1, roles: ["UW"], reason: "≤ $150k standard" };
  }

  // SBA: UW signs package quality, CM signs partner routing; PRIN joins > $2M
  if (amt > 200_000_000) {
    return { tier: 2, roles: ["UW", "CM", "PRIN"], reason: "Package > $2M adds PRIN" };
  }
  return { tier: 1, roles: ["UW", "CM"], reason: "UW: package quality · CM: partner routing" };
}

export const APPROVAL_SLA_DAYS: Record<number, number> = { 1: 1, 2: 2, 3: 3 };
