import "server-only";
import { prisma } from "@/lib/db";
import {
  STAGE,
  PIPE_ORDER,
  initialsOf,
  avatarOf,
  isDocHave,
  type StageKey,
} from "@/lib/domain";

// ---- serializable row shapes passed to client components ----

export type DocItemRow = {
  id: string;
  idx: number;
  name: string;
  hint: string;
  status: string;
};

export type CaseRow = {
  id: string;
  name: string;
  guj: string;
  phone: string;
  email: string;
  lang: string;
  cat: string;
  loan: string;
  borrower: string;
  borrowerLabel: string;
  amount: number;
  stage: string;
  rep: string;
  readiness: number;
  source: string;
  credit: string;
  income: string;
  timeline: string;
  last: string;
  idleDays: number;
  tpl: string | null;
  initials: string;
  avBg: string;
  avFg: string;
  // doc rollup
  docTotal: number;
  docHave: number;
  docApproved: number;
  docMissing: number;
  docPct: number;
  docItems: DocItemRow[];
};

export type TaskRow = {
  id: string;
  caseId: string;
  clientName: string;
  initials: string;
  avBg: string;
  avFg: string;
  title: string;
  type: string;
  pri: string;
  due: string;
  dueK: string;
  reason: string;
  done: boolean;
};

// Stable avatar index per case id (mirrors the prototype's positional palette).
async function avatarIndexMap(): Promise<Record<string, number>> {
  const ids = await prisma.case.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const map: Record<string, number> = {};
  ids.forEach((c, i) => (map[c.id] = i));
  return map;
}

function buildCaseRow(
  c: {
    id: string;
    cat: string;
    loan: string;
    borrower: string;
    borrowerLabel: string;
    amount: number;
    stage: string;
    rep: string;
    readiness: number;
    source: string;
    credit: string;
    income: string;
    timeline: string;
    last: string;
    idleDays: number;
    tpl: string | null;
    client: { name: string; guj: string; phone: string; email: string; lang: string };
    docItems: { id: string; idx: number; name: string; hint: string; status: string }[];
  },
  avIndex: number
): CaseRow {
  const av = avatarOf(avIndex);
  const items = [...c.docItems].sort((a, b) => a.idx - b.idx);
  const have = items.filter((d) => isDocHave(d.status)).length;
  const approved = items.filter((d) => d.status === "approved").length;
  const total = items.length;
  return {
    id: c.id,
    name: c.client.name,
    guj: c.client.guj,
    phone: c.client.phone,
    email: c.client.email,
    lang: c.client.lang,
    cat: c.cat,
    loan: c.loan,
    borrower: c.borrower,
    borrowerLabel: c.borrowerLabel,
    amount: c.amount,
    stage: c.stage,
    rep: c.rep,
    readiness: c.readiness,
    source: c.source,
    credit: c.credit,
    income: c.income,
    timeline: c.timeline,
    last: c.last,
    idleDays: c.idleDays,
    tpl: c.tpl,
    initials: initialsOf(c.client.name),
    avBg: av.bg,
    avFg: av.fg,
    docTotal: total,
    docHave: have,
    docApproved: approved,
    docMissing: total - have,
    docPct: total ? Math.round((have / total) * 100) : 0,
    docItems: items.map((d) => ({ id: d.id, idx: d.idx, name: d.name, hint: d.hint, status: d.status })),
  };
}

export async function getAllCases(): Promise<CaseRow[]> {
  const [cases, avMap] = await Promise.all([
    prisma.case.findMany({
      orderBy: { createdAt: "asc" },
      include: { client: true, docItems: true },
    }),
    avatarIndexMap(),
  ]);
  return cases.map((c) => buildCaseRow(c, avMap[c.id] ?? 0));
}

export async function getCase(id: string): Promise<CaseRow | null> {
  const [c, avMap] = await Promise.all([
    prisma.case.findUnique({ where: { id }, include: { client: true, docItems: true } }),
    avatarIndexMap(),
  ]);
  if (!c) return null;
  return buildCaseRow(c, avMap[c.id] ?? 0);
}

export async function getTasks(): Promise<TaskRow[]> {
  const [tasks, avMap] = await Promise.all([
    prisma.task.findMany({ include: { case: { include: { client: true } } } }),
    avatarIndexMap(),
  ]);
  // Preserve seed order (t1, t2, ...) then any created leads.
  const order = (id: string) => {
    const m = id.match(/^t(\d+)$/);
    return m ? parseInt(m[1], 10) : 1000;
  };
  tasks.sort((a, b) => order(a.id) - order(b.id));
  return tasks.map((t) => {
    const av = avatarOf(avMap[t.caseId] ?? 0);
    return {
      id: t.id,
      caseId: t.caseId,
      clientName: t.case.client.name,
      initials: initialsOf(t.case.client.name),
      avBg: av.bg,
      avFg: av.fg,
      title: t.title,
      type: t.type,
      pri: t.pri,
      due: t.due,
      dueK: t.dueK,
      reason: t.reason,
      done: t.done,
    };
  });
}

// ---- pipeline ----

export type PipelineColumn = {
  key: StageKey;
  label: string;
  fg: string;
  bg: string;
  cards: CaseRow[];
};

export async function getPipeline(rep: string): Promise<{ columns: PipelineColumn[]; total: number }> {
  const all = await getAllCases();
  const visible = all.filter(
    (c) => PIPE_ORDER.includes(c.stage as StageKey) && (rep === "all" || c.rep === rep)
  );
  const columns = PIPE_ORDER.map((k) => ({
    key: k,
    label: STAGE[k].label,
    fg: STAGE[k].fg,
    bg: STAGE[k].bg,
    cards: visible.filter((c) => c.stage === k),
  }));
  return { columns, total: visible.length };
}

// ---- dashboard aggregates ----

export type DashboardData = {
  newLeads: number;
  awaitingContact: number;
  waitingDocs: number;
  readyForReview: number;
  stalled: number;
  dFirst: CaseRow[];
  dDocs: CaseRow[];
  dStalled: CaseRow[];
  dFocus: CaseRow[];
};

export async function getDashboard(): Promise<DashboardData> {
  const all = await getAllCases();
  const active = all.filter((c) => c.stage !== "lost" && c.stage !== "funded");

  const dFirst = all
    .filter((c) => c.stage === "new" || c.stage === "screening")
    .slice(0, 4);
  const dDocs = active
    .filter((c) => c.stage !== "new" && c.docTotal > 0 && c.docMissing > 0)
    .sort((a, b) => b.docMissing - a.docMissing)
    .slice(0, 4);
  const dStalled = active
    .filter((c) => c.idleDays >= 7)
    .sort((a, b) => b.idleDays - a.idleDays)
    .slice(0, 3);
  const dFocus = active
    .filter((c) => c.readiness > 0)
    .sort((a, b) => b.readiness - a.readiness)
    .slice(0, 4);

  return {
    newLeads: all.filter((c) => c.stage === "new").length,
    awaitingContact: all.filter((c) => c.stage === "new").length,
    waitingDocs: active.filter((c) => c.stage !== "new" && c.docMissing > 0).length,
    readyForReview: all.filter((c) => c.stage === "review").length,
    stalled: active.filter((c) => c.idleDays >= 7).length,
    dFirst,
    dDocs,
    dStalled,
    dFocus,
  };
}

// Files actively collecting documents (document-center sidebar).
export async function getDocCollecting(): Promise<CaseRow[]> {
  const all = await getAllCases();
  return all.filter((c) => c.stage !== "funded" && c.stage !== "lost");
}

export async function getTasksForCase(caseId: string): Promise<TaskRow[]> {
  const all = await getTasks();
  return all.filter((t) => t.caseId === caseId);
}
