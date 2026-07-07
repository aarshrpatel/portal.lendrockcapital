"use server";

// All portal mutations. Every write audits; stage moves flow through the
// event dispatcher (lib/domain/events.ts) so gates, playbooks, compliance
// checks, and borrower notifications fire in one place.

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, sessionCookieName, sessionCookieOptions, mintSessionValue } from "@/lib/auth";
import { audit, transitionDealStage, GateError } from "@/lib/domain/events";
import { classifyDealType, scoreLead, checkKnockouts } from "@/lib/domain/scoring";
import { runCreditBox } from "@/lib/domain/creditbox";
import { approvalTier } from "@/lib/domain/approvals";
import { docsForDeal } from "@/lib/domain/docs";
import { drawAutoChecks, wcLimitCents, WC_SETTINGS } from "@/lib/domain/wc";
import { distributionSplits } from "@/lib/domain/capital";
import { playbookFor } from "@/lib/domain/playbooks";

function reval() {
  revalidatePath("/", "layout");
}

// ─────────────── session ───────────────

export async function loginAs(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (user && user.active) {
    const { value, maxAge } = mintSessionValue(user.id);
    cookies().set(sessionCookieName(), value, { ...sessionCookieOptions(), maxAge });
    await audit(user.role, "SESSION_START", "User", user.id, user.name);
  }
  redirect("/");
}

export async function logout() {
  cookies().delete(sessionCookieName());
  redirect("/login");
}

// ─────────────── leads (Module 01) ───────────────

export type LeadFormInput = {
  source: string;
  formVariant?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  state?: string;
  useOfFunds?: string;
  amountCents?: number;
  fundingTimeline?: string;
  creditStated?: string;
  smsConsent?: boolean;
  brokerId?: string;
  utmSource?: string;
  utmCampaign?: string;
};

export async function createLeadRecord(input: LeadFormInput): Promise<{ leadId: string; dq: string | null }> {
  const dealType = classifyDealType(input.useOfFunds ?? "", input.fundingTimeline ?? "");
  const { score, band } = scoreLead({
    amountCents: input.amountCents ?? 0,
    useOfFunds: input.useOfFunds ?? "",
    fundingTimeline: input.fundingTimeline ?? "",
    creditStated: input.creditStated ?? "",
    source: input.source,
    email: input.email ?? "",
    phone: input.phone ?? "",
    state: input.state ?? "",
  });

  const licensed = await db.licensingMatrix.findMany({ where: { licensed: true } });
  const licensedStates = new Set(licensed.map((l) => l.state));
  const dq = checkKnockouts(
    {
      amountCents: input.amountCents ?? 0,
      useOfFunds: input.useOfFunds ?? "",
      fundingTimeline: input.fundingTimeline ?? "",
      creditStated: input.creditStated ?? "",
      source: input.source,
      email: input.email ?? "",
      phone: input.phone ?? "",
      state: input.state ?? "",
    },
    licensedStates
  );

  // Dedupe: exact email or last-10 phone (Module 01 §3.4) — oldest survives.
  const phone10 = (input.phone ?? "").replace(/\D/g, "").slice(-10);
  const existing = await db.lead.findFirst({
    where: {
      OR: [
        ...(input.email ? [{ email: input.email }] : []),
        ...(phone10.length === 10 ? [{ phone: { contains: phone10 } }] : []),
      ],
      stage: { notIn: ["DEAD", "CONVERTED"] },
    },
  });
  if (existing) {
    await audit("SYS", "LEAD_DEDUPED", "Lead", existing.id, "Duplicate submission merged into surviving lead");
    return { leadId: existing.id, dq: null };
  }

  const lead = await db.lead.create({
    data: {
      source: input.source,
      formVariant: input.formVariant ?? "",
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email ?? "",
      phone: input.phone ?? "",
      companyName: input.companyName ?? "",
      state: input.state ?? "",
      dealType,
      useOfFunds: input.useOfFunds ?? "",
      amountCents: input.amountCents ?? 0,
      fundingTimeline: input.fundingTimeline ?? "",
      creditStated: input.creditStated ?? "",
      smsConsent: input.smsConsent ?? false,
      brokerId: input.brokerId || null,
      utmSource: input.utmSource ?? "",
      utmCampaign: input.utmCampaign ?? "",
      score,
      band,
      ...(dq ? { stage: "DEAD", dqCode: dq.code, deadReason: dq.code } : {}),
    },
  });

  // SYS auto-response at T+30s (Module 01 §2.6) — logged, not "sent".
  await db.messageLog.create({
    data: {
      leadId: lead.id,
      channel: input.smsConsent ? "SMS" : "EMAIL",
      direction: "OUT",
      toAddress: input.email || input.phone || "",
      templateCode: dq ? "SEQ_DQ_DECLINE" : "SEQ_LEAD_RESPONSE",
      subject: dq ? "About your Lendrock inquiry" : "We got your request — talk in 5 minutes?",
      body: dq
        ? `Thanks for reaching out. We aren't able to help with this request (${dq.label}). This notice preserves your rights under federal credit law.`
        : "Thanks for your request — a loan officer will reach out within minutes. Want to pick a time instead?",
    },
  });

  await audit("SYS", "LEAD_CREATED", "Lead", lead.id, dq ? `Auto-DQ: ${dq.code}` : `Scored ${score} (${band})`);
  return { leadId: lead.id, dq: dq?.code ?? null };
}

export async function quickAddLead(formData: FormData) {
  const user = await requireUser();
  const amount = Math.round(Number(formData.get("amount") ?? 0) * 100);
  await createLeadRecord({
    source: String(formData.get("source") ?? "QUICK_ADD"),
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    companyName: String(formData.get("companyName") ?? ""),
    state: String(formData.get("state") ?? "").toUpperCase(),
    useOfFunds: String(formData.get("useOfFunds") ?? ""),
    amountCents: amount,
    fundingTimeline: String(formData.get("fundingTimeline") ?? ""),
    creditStated: String(formData.get("creditStated") ?? "UNKNOWN"),
  });
  await audit(user.role, "LEAD_QUICK_ADD", "Lead", "-", `by ${user.name}`);
  reval();
}

export async function touchLead(leadId: string) {
  const user = await requireUser();
  await db.lead.update({
    where: { id: leadId },
    data: { firstTouchAt: new Date(), stage: "CONTACTED", stageEnteredAt: new Date() },
  });
  await db.messageLog.create({
    data: { leadId, channel: "CALL_LOG", direction: "OUT", body: `First touch logged by ${user.name}` },
  });
  await audit(user.role, "LEAD_FIRST_TOUCH", "Lead", leadId, user.name);
  reval();
}

export async function qualifyLead(leadId: string, formData: FormData) {
  const user = await requireUser();
  const dealType = String(formData.get("dealType") ?? "");
  await db.lead.update({
    where: { id: leadId },
    data: {
      dealType,
      stage: "QUALIFIED",
      stageEnteredAt: new Date(),
      amountCents: Math.round(Number(formData.get("amount") ?? 0) * 100) || undefined,
      state: String(formData.get("state") ?? "").toUpperCase() || undefined,
      notes: String(formData.get("notes") ?? ""),
    },
  });
  await audit(user.role, "LEAD_QUALIFIED", "Lead", leadId, `Pathway ${dealType}`);
  reval();
}

export async function killLead(leadId: string, formData: FormData) {
  const user = await requireUser();
  const reason = String(formData.get("reason") ?? "DEAD_UNRESPONSIVE");
  await db.lead.update({
    where: { id: leadId },
    data: { stage: "DEAD", deadReason: reason, stageEnteredAt: new Date() },
  });
  await audit(user.role, "LEAD_DEAD", "Lead", leadId, reason);
  reval();
}

// Lead → Deal conversion (Module 09 §9.2.7): enter-once — everything the
// lead captured lands on the Deal; nothing is retyped.
export async function convertLead(leadId: string, formData: FormData) {
  const user = await requireUser();
  const lead = await db.lead.findUniqueOrThrow({ where: { id: leadId } });
  const subType = String(formData.get("subType") ?? "");
  const dealType = lead.dealType || "BB";

  const company = await db.company.create({
    data: {
      legalName: lead.companyName || `${lead.firstName} ${lead.lastName} LLC`,
      state: lead.state,
    },
  });
  const contact = await db.contact.create({
    data: { firstName: lead.firstName, lastName: lead.lastName, email: lead.email, phone: lead.phone },
  });

  const count = await db.deal.count();
  const dealNumber = `LR-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const deal = await db.deal.create({
    data: {
      dealNumber,
      dealType,
      subType,
      stage: dealType === "SBA" ? "ENGAGED" : "APPLICATION",
      leadId: lead.id,
      companyId: company.id,
      amountCents: lead.amountCents,
      state: lead.state,
      useOfProceeds: lead.useOfFunds,
      termMonths: dealType === "HM" ? 12 : dealType === "WC" ? 12 : 24,
    },
  });
  await db.dealContact.create({
    data: { dealId: deal.id, contactId: contact.id, role: "GUARANTOR", ownershipPct: 100 },
  });

  // Materialize the document checklist from the catalog (Module 06).
  for (const spec of docsForDeal(dealType, subType)) {
    await db.documentRequest.create({
      data: {
        dealId: deal.id,
        docCode: spec.docCode,
        name: spec.name,
        category: spec.category,
        stageGate: spec.stageGate ?? "",
        freshnessDays: spec.freshnessDays ?? 0,
        gateCritical: Boolean(spec.stageGate),
      },
    });
  }

  // Compliance checks seeded at birth (Module 11 §A6).
  const lic = lead.state ? await db.licensingMatrix.findUnique({ where: { state: lead.state } }) : null;
  await db.complianceCheck.create({
    data: {
      dealId: deal.id,
      checkType: "LICENSE_CHECK",
      status: lic?.licensed ? "PASS" : lead.state ? "FAIL" : "PENDING",
      detail: lic?.licensed
        ? `${lead.state}: licensed (${lic.licenseType || "exempt"})`
        : `${lead.state || "state unknown"}: no licensing_matrix row — blocked by design`,
    },
  });
  if ((dealType === "BB" || dealType === "WC") && lic?.cfdlRequired) {
    await db.complianceCheck.create({
      data: { dealId: deal.id, checkType: "CFDL_DISCLOSURE", status: "PENDING", detail: `${lead.state} commercial financing disclosure required at term sheet` },
    });
  }
  if (dealType === "SBA") {
    await db.form159Record.create({ data: { dealId: deal.id } });
    await db.complianceCheck.create({
      data: { dealId: deal.id, checkType: "FORM_159", status: "PENDING", detail: "Form 159 must be signed before lender disbursement" },
    });
  }
  await db.ofacScreen.create({
    data: { partyType: "CONTACT", partyName: `${lead.firstName} ${lead.lastName}`, dealId: deal.id, result: "CLEAR", context: "APPLICATION" },
  });

  // Entry-stage playbook.
  const entry = dealType === "SBA" ? "ENGAGED" : "APPLICATION";
  for (const t of playbookFor(dealType, entry)) {
    await db.task.create({
      data: {
        dealId: deal.id,
        title: t.title,
        type: t.type,
        ownerRole: t.owner === "SYS" ? "SYS" : t.owner,
        status: t.owner === "SYS" ? "DONE" : "OPEN",
        priority: t.priority ?? "MED",
        playbookCode: t.code,
        slaHours: t.slaHours,
        dueAt: t.slaHours ? new Date(Date.now() + t.slaHours * 3600_000) : null,
        completedAt: t.owner === "SYS" ? new Date() : null,
      },
    });
  }

  await db.lead.update({ where: { id: leadId }, data: { stage: "CONVERTED", stageEnteredAt: new Date() } });
  await db.stageEvent.create({ data: { dealId: deal.id, fromStage: "QUALIFIED", toStage: entry, actor: user.role, note: "Converted from lead" } });
  await audit(user.role, "LEAD_CONVERTED", "Deal", deal.id, `${dealNumber} (${dealType}/${subType})`);
  reval();
  redirect(`/deals/${deal.id}`);
}

// ─────────────── deals ───────────────

export async function updateDealEconomics(dealId: string, formData: FormData) {
  const user = await requireUser();
  const num = (k: string) => Math.round(Number(formData.get(k) ?? 0) * 100);
  await db.deal.update({
    where: { id: dealId },
    data: {
      amountCents: num("amount") || undefined,
      rateBps: Math.round(Number(formData.get("rate") ?? 0) * 100) || undefined,
      termMonths: Number(formData.get("termMonths") ?? 0) || undefined,
      ficoMid: Number(formData.get("ficoMid") ?? 0) || undefined,
      asIsValueCents: num("asIsValue") || undefined,
      arvCents: num("arv") || undefined,
      rehabBudgetCents: num("rehabBudget") || undefined,
      monthlyRevenueCents: num("monthlyRevenue") || undefined,
      dscrBps: Math.round(Number(formData.get("dscr") ?? 0) * 10000) || undefined,
    },
  });
  await audit(user.role, "DEAL_ECONOMICS_UPDATED", "Deal", dealId);
  reval();
}

export async function runPrescreen(dealId: string) {
  const user = await requireUser();
  const deal = await db.deal.findUniqueOrThrow({ where: { id: dealId } });
  const rules = await db.creditBoxRule.findMany({ where: { active: true } });
  const { result, flags, snapshot } = runCreditBox(deal, rules);
  await db.creditBoxRun.create({
    data: { dealId, result, flags: JSON.stringify(flags), snapshot: JSON.stringify(snapshot) },
  });
  await db.deal.update({
    where: { id: dealId },
    data: { prescreenResult: result, prescreenSnapshot: JSON.stringify({ flags, snapshot, at: new Date().toISOString() }) },
  });
  await audit(user.role, "PRESCREEN_RUN", "Deal", dealId, `${result} (${flags.length} flags)`);
  reval();
}

export async function moveStage(dealId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const toStage = String(formData.get("toStage"));
  const force = formData.get("force") === "1" && (user.role === "PRIN" || user.role === "ADMIN");
  try {
    await transitionDealStage({ dealId, toStage, actor: user.role, force });

    // Entering APPROVED spawns the tiered approval record (Module 10 §10.2.2).
    if (toStage === "APPROVED") {
      const deal = await db.deal.findUniqueOrThrow({ where: { id: dealId } });
      const lastRun = await db.creditBoxRun.findFirst({ where: { dealId }, orderBy: { createdAt: "desc" } });
      const exceptions = lastRun ? (JSON.parse(lastRun.flags) as unknown[]).length : 0;
      const spec = approvalTier(deal, exceptions);
      const approval = await db.approval.create({
        data: {
          dealId,
          type: "CREDIT_DECISION",
          tier: spec.tier,
          requestedBy: user.role,
          memo: JSON.stringify({ reason: spec.reason, exceptions, snapshot: deal.prescreenSnapshot ? "attached" : "none" }),
        },
      });
      for (const role of spec.roles) {
        await db.approvalSignoff.create({ data: { approvalId: approval.id, approverRole: role } });
      }
    }
  } catch (e) {
    if (e instanceof GateError) {
      await audit(user.role, "STAGE_BLOCKED", "Deal", dealId, `${toStage}: ${e.gates.join("; ")}`);
    } else {
      throw e;
    }
  }
  reval();
}

export async function markDealTerminal(dealId: string, formData: FormData) {
  const user = await requireUser();
  const toStage = String(formData.get("terminal")); // DEAD | DECLINED
  const reason = String(formData.get("reason") ?? "");
  await transitionDealStage({ dealId, toStage, actor: user.role, note: reason, force: true });
  if (toStage === "DECLINED") {
    await db.deal.update({ where: { id: dealId }, data: { declineReasons: reason } });
    // Reg B adverse-action timer (Module 10 §10.5.2): notice within 30 days.
    await db.complianceCheck.create({
      data: {
        dealId,
        checkType: "ADVERSE_ACTION_TIMER",
        status: "PENDING",
        detail: `Adverse-action notice due — reasons: ${reason}`,
        dueAt: new Date(Date.now() + 30 * 86400_000),
      },
    });
  } else {
    await db.deal.update({ where: { id: dealId }, data: { deadReason: reason } });
  }
  reval();
}

// ─────────────── documents (Module 06) ───────────────

export async function borrowerUpload(docId: string, formData: FormData) {
  const fileName = String(formData.get("fileName") ?? "upload.pdf");
  await db.documentRequest.update({
    where: { id: docId },
    data: { status: "UPLOADED", fileName, uploadedAt: new Date() },
  });
  const doc = await db.documentRequest.findUniqueOrThrow({ where: { id: docId } });
  await audit("BORROWER", "DOC_UPLOADED", "DocumentRequest", docId, `${doc.docCode}: ${fileName}`);
  reval();
}

export async function reviewDoc(docId: string, formData: FormData) {
  const user = await requireUser();
  const decision = String(formData.get("decision")); // ACCEPTED | REJECTED | IN_REVIEW
  const reason = String(formData.get("reason") ?? "");
  const doc = await db.documentRequest.findUniqueOrThrow({ where: { id: docId } });
  await db.documentRequest.update({
    where: { id: docId },
    data: {
      status: decision,
      rejectedReason: decision === "REJECTED" ? reason || "Illegible / wrong document" : "",
      reviewedBy: user.name,
      ...(decision === "ACCEPTED" && doc.freshnessDays > 0
        ? { expiresAt: new Date(Date.now() + doc.freshnessDays * 86400_000) }
        : {}),
    },
  });
  await audit(user.role, `DOC_${decision}`, "DocumentRequest", docId, doc.docCode);
  reval();
}

// ─────────────── tasks ───────────────

export async function completeTask(taskId: string) {
  const user = await requireUser();
  await db.task.update({
    where: { id: taskId },
    data: { status: "DONE", completedAt: new Date(), ownerUserId: user.id },
  });
  await audit(user.role, "TASK_DONE", "Task", taskId, user.name);
  reval();
}

// ─────────────── approvals ───────────────

export async function signOff(signoffId: string, formData: FormData) {
  const user = await requireUser();
  const decision = String(formData.get("decision"));
  const note = String(formData.get("note") ?? "");
  const signoff = await db.approvalSignoff.update({
    where: { id: signoffId },
    data: { decision, note, decidedAt: new Date(), approverId: user.id },
    include: { approval: { include: { signoffs: true } } },
  });

  const all = await db.approvalSignoff.findMany({ where: { approvalId: signoff.approvalId } });
  const anyDeclined = all.some((s) => s.decision === "DECLINED");
  const anyReturned = all.some((s) => s.decision === "RETURNED");
  const allDecided = all.every((s) => s.decision !== "PENDING");

  if (anyDeclined) {
    await db.approval.update({ where: { id: signoff.approvalId }, data: { status: "DECLINED", decidedAt: new Date() } });
    const fd = new FormData();
    fd.set("terminal", "DECLINED");
    fd.set("reason", note || "Credit committee decline");
    await markDealTerminal(signoff.approval.dealId, fd);
  } else if (anyReturned) {
    await db.approval.update({ where: { id: signoff.approvalId }, data: { status: "RETURNED", decidedAt: new Date() } });
    await transitionDealStage({ dealId: signoff.approval.dealId, toStage: "UNDERWRITING", actor: user.role, note: "Returned by approver", force: true });
  } else if (allDecided) {
    const withConditions = all.some((s) => s.decision === "APPROVED_WITH_CONDITIONS");
    await db.approval.update({
      where: { id: signoff.approvalId },
      data: { status: withConditions ? "APPROVED_WITH_CONDITIONS" : "APPROVED", decidedAt: new Date() },
    });
    const deal = await db.deal.findUniqueOrThrow({ where: { id: signoff.approval.dealId } });
    await db.deal.update({
      where: { id: deal.id },
      data: { approvedAmountCents: deal.amountCents, approvedRateBps: deal.rateBps },
    });
  }
  await audit(user.role, `SIGNOFF_${decision}`, "Approval", signoff.approvalId, note);
  reval();
}

// ─────────────── HM draws (Module 02 §5.3) ───────────────

export async function requestDraw(dealId: string, formData: FormData) {
  const amount = Math.round(Number(formData.get("amount") ?? 0) * 100);
  if (amount <= 0) return;
  await db.drawRequest.create({ data: { dealId, amountCents: amount, status: "INSPECTION_ORDERED" } });
  await audit("BORROWER", "DRAW_REQUESTED", "Deal", dealId, `$${(amount / 100).toLocaleString()} — inspection auto-ordered`);
  reval();
}

export async function recordInspection(drawId: string, formData: FormData) {
  const user = await requireUser();
  const pct = Number(formData.get("pct") ?? 0);
  const draw = await db.drawRequest.update({
    where: { id: drawId },
    data: { status: "INSPECTION_RECEIVED", inspectionPct: pct },
  });
  // Routing per Module 02: PROC self-approves ≤ $25k fully supported; else UW.
  const fullySupported = pct >= 100;
  const routeTo = draw.amountCents <= 2_500_000 && fullySupported ? "PROC" : "UW";
  await db.task.create({
    data: {
      dealId: draw.dealId,
      title: `Review draw $${(draw.amountCents / 100).toLocaleString()} (inspection ${pct}% supported)`,
      type: "DRAW",
      ownerRole: routeTo,
      priority: "HIGH",
      slaHours: 16,
      dueAt: new Date(Date.now() + 16 * 3600_000),
    },
  });
  await audit(user.role, "INSPECTION_RECEIVED", "DrawRequest", drawId, `${pct}% → routed to ${routeTo}`);
  reval();
}

export async function decideDraw(drawId: string, formData: FormData) {
  const user = await requireUser();
  const decision = String(formData.get("decision")); // APPROVED | REJECTED | WIRED
  const draw = await db.drawRequest.findUniqueOrThrow({ where: { id: drawId } });
  await db.drawRequest.update({
    where: { id: drawId },
    data: {
      status: decision,
      decidedBy: user.name,
      ...(decision === "WIRED" ? { wiredAt: new Date() } : {}),
    },
  });
  if (decision === "WIRED") {
    await db.transaction.create({
      data: { dealId: draw.dealId, type: "DRAW_DISBURSEMENT", direction: "OUT", amountCents: draw.amountCents, method: "WIRE", memo: "Rehab draw" },
    });
  }
  await audit(user.role, `DRAW_${decision}`, "DrawRequest", drawId);
  reval();
}

// ─────────────── WC draws (Module 04 §4) ───────────────

export async function wcRequestDraw(lineId: string, formData: FormData) {
  const amount = Math.round(Number(formData.get("amount") ?? 0) * 100);
  if (amount <= 0) return;
  const line = await db.wcLine.findUniqueOrThrow({ where: { id: lineId }, include: { draws: true } });
  const openAlerts = line.status === "ACTIVE" ? 0 : 1;
  const { checks, outcome } = drawAutoChecks({
    amountCents: amount,
    limitCents: line.limitCents,
    drawnCents: line.drawnCents,
    lineStatus: line.status,
    isFirstDraw: line.draws.length === 0,
    pastDue: false,
    openAlerts,
  });
  const draw = await db.wcDraw.create({
    data: { lineId, amountCents: amount, status: outcome === "AUTO_APPROVED" ? "SENT" : outcome, autoChecks: JSON.stringify(checks) },
  });
  if (outcome === "AUTO_APPROVED") {
    await db.wcLine.update({ where: { id: lineId }, data: { drawnCents: line.drawnCents + amount } });
    await db.transaction.create({
      data: { dealId: line.dealId, type: "DRAW_DISBURSEMENT", direction: "OUT", amountCents: amount, memo: "WC draw (auto-approved, same-day ACH)" },
    });
  } else if (outcome === "REVIEW") {
    await db.task.create({
      data: {
        dealId: line.dealId,
        title: `Review WC draw $${(amount / 100).toLocaleString()}`,
        type: "DRAW",
        ownerRole: amount > 5_000_000 ? "UW" : "PROC",
        priority: "HIGH",
        slaHours: 4,
        dueAt: new Date(Date.now() + 4 * 3600_000),
      },
    });
  }
  await audit("SYS", `WC_DRAW_${outcome}`, "WcDraw", draw.id, `$${(amount / 100).toLocaleString()}`);
  reval();
}

export async function wcDecideDraw(drawId: string, formData: FormData) {
  const user = await requireUser();
  const decision = String(formData.get("decision")); // APPROVED | REJECTED
  const draw = await db.wcDraw.findUniqueOrThrow({ where: { id: drawId }, include: { line: true } });
  if (decision === "APPROVED") {
    await db.wcDraw.update({ where: { id: drawId }, data: { status: "SENT" } });
    await db.wcLine.update({ where: { id: draw.lineId }, data: { drawnCents: draw.line.drawnCents + draw.amountCents } });
    await db.transaction.create({
      data: { dealId: draw.line.dealId, type: "DRAW_DISBURSEMENT", direction: "OUT", amountCents: draw.amountCents, memo: "WC draw (reviewed)" },
    });
  } else {
    await db.wcDraw.update({ where: { id: drawId }, data: { status: "REJECTED" } });
  }
  await audit(user.role, `WC_DRAW_${decision}`, "WcDraw", drawId);
  reval();
}

export async function wcActivateLine(dealId: string) {
  const user = await requireUser();
  const deal = await db.deal.findUniqueOrThrow({ where: { id: dealId } });
  const tier = deal.ficoMid && deal.ficoMid >= 700 ? "A" : deal.ficoMid && deal.ficoMid >= 660 ? "B" : "C";
  const limit = wcLimitCents(deal.monthlyRevenueCents, tier, true);
  await db.wcLine.upsert({
    where: { dealId },
    create: { dealId, limitCents: limit, rateBps: WC_SETTINGS.tierRateBps[tier], tier, renewalDate: new Date(Date.now() + 365 * 86400_000) },
    update: {},
  });
  await audit(user.role, "WC_LINE_ACTIVATED", "Deal", dealId, `Limit $${(limit / 100).toLocaleString()} tier ${tier}`);
  reval();
}

// ─────────────── capital (Module 07) ───────────────

export async function addInvestor(formData: FormData) {
  const user = await requireUser();
  const inv = await db.investor.create({
    data: {
      type: String(formData.get("type") ?? "INDIVIDUAL"),
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      status: "ONBOARDING",
      capitalAvailableCents: Math.round(Number(formData.get("capital") ?? 0) * 100),
      prefDealTypes: String(formData.get("prefDealTypes") ?? "HM,BB"),
      prefTargetYieldBps: Math.round(Number(formData.get("targetYield") ?? 10) * 100),
    },
  });
  await audit(user.role, "INVESTOR_CREATED", "Investor", inv.id, inv.name);
  reval();
}

export async function activateInvestor(investorId: string) {
  const user = await requireUser();
  await db.investor.update({
    where: { id: investorId },
    data: {
      status: "ACTIVE",
      accreditationStatus: "SELF_CERTIFIED",
      accreditationExpires: new Date(Date.now() + 365 * 86400_000),
      ofacStatus: "CLEAR",
    },
  });
  const inv = await db.investor.findUniqueOrThrow({ where: { id: investorId } });
  await db.ofacScreen.create({ data: { partyType: "INVESTOR", partyName: inv.name, result: "CLEAR", context: "ONBOARDING" } });
  await audit(user.role, "INVESTOR_ACTIVATED", "Investor", investorId);
  reval();
}

export async function commitInvestor(dealId: string, formData: FormData) {
  const user = await requireUser();
  const investorId = String(formData.get("investorId"));
  const amount = Math.round(Number(formData.get("amount") ?? 0) * 100);
  const deal = await db.deal.findUniqueOrThrow({ where: { id: dealId } });
  const investorRate = Math.max(deal.rateBps - 200, 0); // servicing strip 200bps
  await db.participation.create({
    data: { dealId, investorId, committedCents: amount, rateBps: investorRate },
  });
  await db.deal.update({ where: { id: dealId }, data: { capitalSource: "SYNDICATED" } });
  await audit(user.role, "PARTICIPATION_COMMITTED", "Deal", dealId, `$${(amount / 100).toLocaleString()}`);
  reval();
}

export async function advanceParticipation(participationId: string, formData: FormData) {
  const user = await requireUser();
  const toStatus = String(formData.get("toStatus"));
  const p = await db.participation.findUniqueOrThrow({ where: { id: participationId } });
  await db.participation.update({
    where: { id: participationId },
    data: {
      status: toStatus,
      ...(toStatus === "WIRED" || toStatus === "ACTIVE"
        ? { fundedCents: p.committedCents, wiredAt: p.wiredAt ?? new Date() }
        : {}),
    },
  });
  if (toStatus === "WIRED") {
    await db.transaction.create({
      data: {
        dealId: p.dealId, investorId: p.investorId, participationId,
        type: "FUNDING_WIRE", direction: "IN", amountCents: p.committedCents, method: "WIRE",
        memo: "Investor participation wire",
      },
    });
  }
  await audit(user.role, `PARTICIPATION_${toStatus}`, "Participation", participationId);
  reval();
}

export async function recordPayment(dealId: string, formData: FormData) {
  const user = await requireUser();
  const amount = Math.round(Number(formData.get("amount") ?? 0) * 100);
  if (amount <= 0) return;
  const deal = await db.deal.findUniqueOrThrow({ where: { id: dealId }, include: { participations: true } });
  await db.transaction.create({
    data: { dealId, type: "PAYMENT", direction: "IN", amountCents: amount, memo: "Borrower interest payment" },
  });
  // Investor splits accrue immediately; batch pays on the 10th (Module 07 §6.2).
  for (const split of distributionSplits(amount, deal, deal.participations)) {
    await db.transaction.create({
      data: {
        dealId, investorId: split.investorId, type: "DISTRIBUTION", direction: "OUT",
        amountCents: split.amountCents, status: "INITIATED", memo: "Accrued distribution — pays in monthly batch (10th)",
      },
    });
  }
  await audit(user.role, "PAYMENT_RECORDED", "Deal", dealId, `$${(amount / 100).toLocaleString()}`);
  reval();
}

export async function runDistributionBatch() {
  const user = await requireUser();
  const pending = await db.transaction.findMany({ where: { type: "DISTRIBUTION", status: "INITIATED" } });
  for (const t of pending) {
    await db.transaction.update({ where: { id: t.id }, data: { status: "SETTLED" } });
  }
  await audit(user.role, "DISTRIBUTION_BATCH", "Transaction", "-", `${pending.length} distributions settled`);
  reval();
}

// ─────────────── SBA (Module 05) ───────────────

export async function form159Advance(dealId: string, formData: FormData) {
  const user = await requireUser();
  const status = String(formData.get("status"));
  await db.form159Record.update({ where: { dealId }, data: { status } });
  if (status === "COMPLETE") {
    const check = await db.complianceCheck.findFirst({ where: { dealId, checkType: "FORM_159" } });
    if (check) await db.complianceCheck.update({ where: { id: check.id }, data: { status: "PASS", resolvedAt: new Date() } });
  }
  await audit(user.role, "FORM_159_" + status, "Deal", dealId);
  reval();
}

export async function sbaSubmit(dealId: string, formData: FormData) {
  const user = await requireUser();
  const lenderId = String(formData.get("lenderId"));
  await db.sbaSubmission.create({
    data: { dealId, lenderId, status: "SUBMITTED", submittedAt: new Date() },
  });
  await audit(user.role, "SBA_SUBMITTED", "Deal", dealId, lenderId);
  reval();
}

export async function sbaSetStatus(submissionId: string, formData: FormData) {
  const user = await requireUser();
  const status = String(formData.get("status"));
  await db.sbaSubmission.update({ where: { id: submissionId }, data: { status } });
  await audit(user.role, "SBA_SUBMISSION_" + status, "SbaSubmission", submissionId);
  reval();
}

// ─────────────── compliance ───────────────

export async function resolveCompliance(checkId: string, formData: FormData) {
  const user = await requireUser();
  const status = String(formData.get("status"));
  await db.complianceCheck.update({
    where: { id: checkId },
    data: { status, resolvedAt: new Date() },
  });
  const check = await db.complianceCheck.findUniqueOrThrow({ where: { id: checkId } });
  if (check.checkType === "OFAC_SCREEN" && status === "PASS") {
    const deal = await db.deal.findUniqueOrThrow({ where: { id: check.dealId }, include: { contacts: { include: { contact: true } } } });
    for (const dc of deal.contacts) {
      await db.ofacScreen.create({
        data: { partyType: "CONTACT", partyName: `${dc.contact.firstName} ${dc.contact.lastName}`, dealId: deal.id, result: "CLEAR", context: "PRE_WIRE" },
      });
    }
  }
  await audit(user.role, `COMPLIANCE_${status}`, "ComplianceCheck", checkId, check.checkType);
  reval();
}
