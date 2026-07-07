// Module 07 — capital math: investor matching, capital dashboard rows,
// concentration flags, and distribution splits.

import type { Deal, Investor, Participation } from "@prisma/client";

export const CAPITAL_LIMITS = {
  investorMaxOfDealBps: 4000, // flag: single investor > 40% of a deal
  dealMaxOfInvestorBps: 6000, // flag: single deal > 60% of an investor's deployed
  houseCoInvestTargetBps: 1000, // 10% target
  houseCoInvestMaxBps: 3500, // 35% max balance-sheet absorption
  servicingStripBps: 200, // spread Lendrock keeps over the investor rate
};

export function matchInvestors(deal: Deal, investors: Investor[]): Investor[] {
  return investors.filter((inv) => {
    if (inv.status !== "ACTIVE") return false;
    const types = inv.prefDealTypes.split(",").map((s) => s.trim());
    if (!types.includes(deal.dealType)) return false;
    if (inv.prefStates) {
      const states = inv.prefStates.split(",").map((s) => s.trim());
      if (deal.state && !states.includes(deal.state)) return false;
    }
    if (deal.amountCents > 0 && inv.prefMinCents > deal.amountCents) return false;
    return true;
  });
}

export type CapitalRow = {
  investor: Investor;
  committedNotWiredCents: number;
  deployedCents: number;
  headroomCents: number;
  blendedYieldBps: number;
};

// Module 07 §5 canonical capital model: headroom = self-reported
// capital_available − committed-not-wired; deployed tracked separately.
export function capitalRow(investor: Investor, participations: Participation[]): CapitalRow {
  const mine = participations.filter((p) => p.investorId === investor.id);
  const committedNotWired = mine
    .filter((p) => ["SOFT_COMMIT", "DOCS_OUT", "SIGNED"].includes(p.status))
    .reduce((s, p) => s + p.committedCents, 0);
  const deployedList = mine.filter((p) => ["WIRED", "ACTIVE"].includes(p.status));
  const deployed = deployedList.reduce((s, p) => s + p.fundedCents, 0);
  const blended =
    deployed > 0
      ? Math.round(deployedList.reduce((s, p) => s + p.rateBps * p.fundedCents, 0) / deployed)
      : 0;
  return {
    investor,
    committedNotWiredCents: committedNotWired,
    deployedCents: deployed,
    headroomCents: Math.max(0, investor.capitalAvailableCents - committedNotWired),
    blendedYieldBps: blended,
  };
}

export type ConcentrationFlag = { code: string; label: string };

export function concentrationFlags(
  deal: Deal,
  participations: Participation[]
): ConcentrationFlag[] {
  const flags: ConcentrationFlag[] = [];
  const active = participations.filter((p) => !["CANCELLED", "REPAID"].includes(p.status));
  const total = active.reduce((s, p) => s + p.committedCents, 0);
  if (deal.amountCents > 0) {
    for (const p of active) {
      if (p.committedCents * 10000 > deal.amountCents * CAPITAL_LIMITS.investorMaxOfDealBps) {
        flags.push({
          code: "INVESTOR_OVER_40PCT",
          label: `A single investor holds > 40% of this deal`,
        });
        break;
      }
    }
    if (total > deal.amountCents) {
      flags.push({ code: "OVERSUBSCRIBED", label: "Commitments exceed deal size" });
    }
  }
  return flags;
}

// Distribution split for a received borrower payment (Module 07 §6.2):
// each ACTIVE participation earns interest at its investor rate pro-rata;
// Lendrock keeps the servicing strip.
export function distributionSplits(
  paymentCents: number,
  deal: Deal,
  participations: Participation[]
): { investorId: string; amountCents: number }[] {
  const active = participations.filter((p) => p.status === "ACTIVE" && p.fundedCents > 0);
  if (active.length === 0 || deal.amountCents === 0) return [];
  return active.map((p) => {
    const share = p.fundedCents / deal.amountCents;
    const investorPortion = (p.rateBps / Math.max(deal.rateBps, 1)) * share;
    return {
      investorId: p.investorId,
      amountCents: Math.floor(paymentCents * investorPortion),
    };
  });
}
