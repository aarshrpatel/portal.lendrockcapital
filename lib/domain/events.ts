// Module 09 §9.3 — the event backbone, in-process edition. Every stage
// transition flows through transitionDealStage: it validates gates, writes
// the immutable StageEvent, materializes the next stage's playbook tasks,
// seeds compliance checks, sends templated borrower updates (MessageLog),
// and audits. Swap the tail of this file for a queue (Inngest) in production
// without touching callers.

import { db } from "@/lib/db";
import { STAGE_OWNER, STAGE_SLA_HOURS, stagesFor } from "@/lib/enums";
import { playbookFor } from "@/lib/domain/playbooks";

export class GateError extends Error {
  constructor(message: string, public gates: string[]) {
    super(message);
  }
}

// Documents that must be ACCEPTED before leaving `stage` (Module 06 §2.2).
export async function openDocGates(dealId: string, stage: string): Promise<string[]> {
  const open = await db.documentRequest.findMany({
    where: { dealId, stageGate: stage, status: { notIn: ["ACCEPTED"] } },
    select: { name: true },
  });
  return open.map((d) => d.name);
}

// Compliance checks that block the transition (Module 11 §A6).
export async function openComplianceGates(dealId: string, toStage: string): Promise<string[]> {
  const blocking: string[] = [];
  const checks = await db.complianceCheck.findMany({ where: { dealId } });
  const byType = (t: string) => checks.find((c) => c.checkType === t);

  if (toStage === "TERM_SHEET" || toStage === "UNDERWRITING") {
    const lic = byType("LICENSE_CHECK");
    if (lic && lic.status === "FAIL") blocking.push("License check failed for property/borrower state");
  }
  if (toStage === "FUNDED") {
    const ofac = byType("OFAC_SCREEN");
    if (!ofac || ofac.status !== "PASS") blocking.push("OFAC pre-wire re-scan not passed");
  }
  return blocking;
}

export async function transitionDealStage(opts: {
  dealId: string;
  toStage: string;
  actor: string;
  note?: string;
  force?: boolean; // PRIN override — still audited
}): Promise<void> {
  const { dealId, toStage, actor, note, force } = opts;
  const deal = await db.deal.findUniqueOrThrow({ where: { id: dealId } });
  const fromStage = deal.stage;
  if (fromStage === toStage) return;

  const path = stagesFor(deal.dealType);
  const isTerminal = toStage === "DEAD" || toStage === "DECLINED";
  if (!isTerminal && !path.includes(toStage)) {
    throw new GateError(`${toStage} is not a valid stage for ${deal.dealType}`, []);
  }

  // Forward moves check gates (backward moves and terminals don't).
  const movingForward = !isTerminal && path.indexOf(toStage) > path.indexOf(fromStage);
  if (movingForward && !force) {
    const gates = [
      ...(await openDocGates(dealId, fromStage)).map((g) => `Document gate: ${g}`),
      ...(await openComplianceGates(dealId, toStage)),
    ];
    if (gates.length > 0) {
      throw new GateError(`Cannot exit ${fromStage} — ${gates.length} open gate(s)`, gates);
    }
  }

  await db.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: dealId },
      data: {
        stage: toStage,
        stageEnteredAt: new Date(),
        ...(toStage === "FUNDED" ? { fundedAt: new Date(), servicingStatus: "CURRENT" } : {}),
        ...(toStage === "PAID_OFF" ? { servicingStatus: "PAID_OFF" } : {}),
      },
    });

    await tx.stageEvent.create({
      data: { dealId, fromStage, toStage, actor, note: note ?? (force ? "PRIN override" : "") },
    });

    // Materialize the destination stage's playbook (skip if re-entering).
    if (!isTerminal) {
      const playbook = playbookFor(deal.dealType, toStage);
      const existing = await tx.task.findMany({
        where: { dealId, playbookCode: { in: playbook.map((p) => p.code) } },
        select: { playbookCode: true },
      });
      const have = new Set(existing.map((t) => t.playbookCode));
      const now = Date.now();
      for (const t of playbook) {
        if (have.has(t.code)) continue;
        if (t.owner === "SYS") {
          // SYS steps are recorded as completed automations, not human tasks.
          await tx.task.create({
            data: {
              dealId, title: t.title, type: t.type, ownerRole: "SYS", status: "DONE",
              priority: t.priority ?? "MED", playbookCode: t.code, completedAt: new Date(),
            },
          });
        } else {
          await tx.task.create({
            data: {
              dealId, title: t.title, type: t.type, ownerRole: t.owner, status: "OPEN",
              priority: t.priority ?? "MED", playbookCode: t.code, slaHours: t.slaHours,
              dueAt: t.slaHours ? new Date(now + t.slaHours * 3600_000) : null,
            },
          });
        }
      }

      // Compliance checkpoints seeded on entry (Module 11 §A6).
      if (toStage === "DOCS_CLOSING") {
        const existing = await tx.complianceCheck.findFirst({ where: { dealId, checkType: "OFAC_SCREEN" } });
        if (existing) {
          await tx.complianceCheck.update({ where: { id: existing.id }, data: { status: "PENDING", detail: "Pre-wire re-scan required ≤ 24h before funding" } });
        } else {
          await tx.complianceCheck.create({
            data: { dealId, checkType: "OFAC_SCREEN", status: "PENDING", detail: "Pre-wire re-scan required ≤ 24h before funding" },
          });
        }
      }

      // Borrower status push — the automation that kills "what's the status?" calls.
      await tx.messageLog.create({
        data: {
          dealId, channel: "EMAIL", direction: "OUT",
          toAddress: "borrower", templateCode: `SEQ_STAGE_${toStage}`,
          subject: `Your Lendrock ${deal.dealNumber} update`,
          body: `Your file moved to ${toStage.replace(/_/g, " ")}. Owner: ${STAGE_OWNER[toStage] ?? "team"} · target ${STAGE_SLA_HOURS[toStage] ?? 24} business hours.`,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actor, action: "STAGE_TRANSITION", objectType: "Deal", objectId: dealId,
        detail: `${fromStage} → ${toStage}${force ? " (override)" : ""}${note ? ` — ${note}` : ""}`,
      },
    });
  });
}

export async function audit(actor: string, action: string, objectType: string, objectId: string, detail = "") {
  await db.auditLog.create({ data: { actor, action, objectType, objectId, detail } });
}
