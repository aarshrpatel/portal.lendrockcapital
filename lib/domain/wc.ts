// Module 04 — WC revolver engine: limit formula, tier pricing, and the
// draw auto-check battery.

export const WC_SETTINGS = {
  limitFactorBps: 5000, // 0.50 × trailing-6-month avg monthly revenue
  floorCents: 2_500_000, // $25k
  houseCapCents: 25_000_000, // $250k standard ($500k PRIN exception)
  statementsHaircutBps: 8500, // 0.85 when underwritten from statements, not Plaid
  autoApproveMaxCents: 2_500_000, // draws ≤ min($25k, 25% of limit) auto-approve
  autoApprovePctOfLimitBps: 2500,
  sameDayCutoffHourEt: 14,
  tierAdjustBps: { A: 10000, B: 8500, C: 7000 } as Record<string, number>,
  tierRateBps: { A: 1450, B: 1750, C: 2100 } as Record<string, number>,
};

export function wcLimitCents(avgMonthlyRevenueCents: number, tier: "A" | "B" | "C", plaidLinked: boolean): number {
  let limit = Math.round((avgMonthlyRevenueCents * WC_SETTINGS.limitFactorBps) / 10000);
  limit = Math.round((limit * WC_SETTINGS.tierAdjustBps[tier]) / 10000);
  if (!plaidLinked) limit = Math.round((limit * WC_SETTINGS.statementsHaircutBps) / 10000);
  limit = Math.max(limit, WC_SETTINGS.floorCents);
  limit = Math.min(limit, WC_SETTINGS.houseCapCents);
  // round down to nearest $5k
  return Math.floor(limit / 500000) * 500000;
}

export type WcCheck = { check: string; pass: boolean; detail: string };

export function drawAutoChecks(params: {
  amountCents: number;
  limitCents: number;
  drawnCents: number;
  lineStatus: string;
  isFirstDraw: boolean;
  pastDue: boolean;
  openAlerts: number;
}): { checks: WcCheck[]; outcome: "AUTO_APPROVED" | "REVIEW" | "REJECTED" } {
  const { amountCents, limitCents, drawnCents, lineStatus, isFirstDraw, pastDue, openAlerts } = params;
  const available = limitCents - drawnCents;
  const autoCap = Math.min(
    WC_SETTINGS.autoApproveMaxCents,
    Math.round((limitCents * WC_SETTINGS.autoApprovePctOfLimitBps) / 10000)
  );

  const checks: WcCheck[] = [
    { check: "LINE_ACTIVE", pass: lineStatus === "ACTIVE", detail: `Line status ${lineStatus}` },
    { check: "AVAILABILITY", pass: amountCents <= available, detail: `$${(amountCents / 100).toLocaleString()} vs $${(available / 100).toLocaleString()} available` },
    { check: "NOT_PAST_DUE", pass: !pastDue, detail: pastDue ? "Billed amount past due" : "Current" },
    { check: "NO_OPEN_ALERTS", pass: openAlerts === 0, detail: `${openAlerts} open covenant alerts` },
    { check: "NOT_FIRST_DRAW", pass: !isFirstDraw, detail: isFirstDraw ? "First draw always reviewed" : "Repeat draw" },
    { check: "UNDER_AUTO_CAP", pass: amountCents <= autoCap, detail: `Auto cap $${(autoCap / 100).toLocaleString()}` },
  ];

  const hardFail = !checks[0].pass || !checks[1].pass;
  if (hardFail) return { checks, outcome: "REJECTED" };
  const allPass = checks.every((c) => c.pass);
  return { checks, outcome: allPass ? "AUTO_APPROVED" : "REVIEW" };
}

export const WC_FREEZE_TRIGGERS = [
  { code: "FRZ_DPD_10", label: "10+ days past due", kind: "SOFT" },
  { code: "FRZ_STACKING", label: "New MCA debit stream detected", kind: "HARD" },
  { code: "FRZ_NEW_LIEN", label: "New UCC lien filed", kind: "HARD" },
  { code: "FRZ_NSF_SPIKE", label: "NSF spike in bank feed", kind: "SOFT" },
  { code: "FRZ_BALANCE_DECLINE", label: "Avg balance decline > 40%", kind: "SOFT" },
  { code: "FRZ_PLAID_DISCONNECT", label: "Bank link disconnected > 21 days", kind: "SOFT" },
  { code: "FRZ_BBC_OVERDUE", label: "Borrowing-base certificate overdue", kind: "SOFT" },
  { code: "FRZ_BANKRUPTCY", label: "Bankruptcy filing detected", kind: "HARD" },
];
