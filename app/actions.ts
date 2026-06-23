"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  TPL,
  tplKey,
  DOC_CYCLE_NEXT,
  initialsOf,
  type StageKey,
} from "@/lib/domain";

// Move a case to a new pipeline stage (pipeline drag-and-drop).
export async function moveStage(caseId: string, stage: string) {
  await prisma.case.update({ where: { id: caseId }, data: { stage } });
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

// Cycle a checklist item: requested → received → approved → requested.
export async function cycleDoc(docItemId: string) {
  const item = await prisma.docItem.findUnique({ where: { id: docItemId } });
  if (!item) return;
  await prisma.docItem.update({
    where: { id: docItemId },
    data: { status: DOC_CYCLE_NEXT[item.status] ?? "requested" },
  });
  revalidatePath("/documents");
  revalidatePath("/dashboard");
}

// Reject a checklist item.
export async function rejectDoc(docItemId: string) {
  await prisma.docItem.update({
    where: { id: docItemId },
    data: { status: "rejected" },
  });
  revalidatePath("/documents");
}

// Borrower self-serve upload: mark an outstanding item as received.
export async function borrowerUpload(docItemId: string) {
  await prisma.docItem.update({
    where: { id: docItemId },
    data: { status: "received" },
  });
  revalidatePath("/documents");
  revalidatePath("/dashboard");
}

// Switch a case's checklist template and regenerate items from it.
export async function setTemplate(caseId: string, key: string) {
  const tpl = TPL[key];
  if (!tpl) return;
  await prisma.docItem.deleteMany({ where: { caseId } });
  await prisma.case.update({ where: { id: caseId }, data: { tpl: key } });
  await prisma.docItem.createMany({
    data: tpl.map((t, i) => ({
      caseId,
      idx: i,
      name: t[0],
      hint: t[1],
      status: "requested",
    })),
  });
  revalidatePath("/documents");
}

// Toggle task completion (task center + dashboard checkboxes).
export async function toggleTask(taskId: string) {
  const t = await prisma.task.findUnique({ where: { id: taskId } });
  if (!t) return;
  await prisma.task.update({
    where: { id: taskId },
    data: { done: !t.done },
  });
  revalidatePath("/tasks");
}

export type NewLead = {
  name: string;
  phone: string;
  lang: string;
  source: string;
  loanType: string; // chip label
  borrower: string; // chip label
  income: string;
  credit: string;
  timeline: string;
  notes: string;
  outcome: string | null; // consult | docs | callback | notfit
};

// Map intake chip labels back to the canonical category/borrower keys.
const CAT_BY_LABEL: Record<string, string> = {
  "SBA / Business": "sba",
  "Home purchase": "home",
  Refinance: "refi",
  Investment: "investor",
};
const BORROWER_BY_LABEL: Record<string, string> = {
  "W-2 employee": "w2",
  "Self-employed": "self",
  "Business owner": "business",
  Investor: "investor",
};
const STAGE_BY_OUTCOME: Record<string, StageKey> = {
  consult: "consult",
  docs: "docs",
  callback: "nurture",
  notfit: "lost",
};

function slugId(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base || "lead"}-${Date.now().toString(36).slice(-4)}`;
}

// Create a new lead from the live-intake screen (person + case + checklist + first-contact task).
export async function createLead(lead: NewLead): Promise<string> {
  const id = slugId(lead.name);
  const cat = CAT_BY_LABEL[lead.loanType] ?? "home";
  const borrower = BORROWER_BY_LABEL[lead.borrower] ?? "w2";
  const stage = (lead.outcome && STAGE_BY_OUTCOME[lead.outcome]) ?? "new";

  // Rough readiness estimate, mirroring the intake screen's live formula.
  const est =
    (lead.timeline === "ASAP — ready now" ? 28 : lead.timeline ? 14 : 0) +
    (lead.credit.includes("740") ? 26 : lead.credit.includes("680") ? 18 : lead.credit.includes("620") ? 9 : 0) +
    (lead.loanType ? 16 : 0) +
    (lead.borrower ? 12 : 0) +
    (lead.income ? 10 : 0) +
    (lead.source.includes("Referral") ? 8 : lead.source ? 4 : 0);

  await prisma.client.create({
    data: {
      id,
      name: lead.name || "New lead",
      phone: lead.phone || "—",
      email: "—",
      lang: lead.lang || "English",
    },
  });

  await prisma.case.create({
    data: {
      id,
      clientId: id,
      cat,
      loan: lead.loanType || "New inquiry",
      borrower,
      borrowerLabel: lead.borrower || "—",
      amount: 0,
      stage,
      rep: "Hitesh",
      readiness: Math.max(0, Math.min(100, Math.round(est))),
      source: lead.source || "Manual entry",
      credit: lead.credit || "—",
      income: lead.income || "—",
      timeline: lead.timeline || "—",
      last: "just now",
      idleDays: 0,
    },
  });

  // Generate the starting checklist for files that proceed to doc collection.
  if (stage !== "lost" && stage !== "nurture") {
    const key = tplKey(cat, borrower);
    const tpl = TPL[key] || [];
    await prisma.docItem.createMany({
      data: tpl.map((t, i) => ({
        caseId: id,
        idx: i,
        name: t[0],
        hint: t[1],
        status: "requested",
      })),
    });
  }

  // A new lead always gets a first-contact / follow-up task.
  const firstName = initialsOf(lead.name || "New lead");
  void firstName;
  await prisma.task.create({
    data: {
      id: `t-${id}`,
      caseId: id,
      title:
        stage === "new"
          ? `First contact — ${lead.name || "New lead"}`
          : `Follow up — ${lead.name || "New lead"}`,
      type: stage === "new" ? "first" : stage === "docs" ? "docs" : stage === "consult" ? "consult" : "nurture",
      pri: "high",
      due: "Now",
      dueK: "today",
      reason: "Created from live intake",
      done: false,
    },
  });

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  return id;
}
