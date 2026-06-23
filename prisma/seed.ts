import { PrismaClient } from "@prisma/client";
import { TPL, tplKey } from "../lib/domain";

const prisma = new PrismaClient();

// Source case data, ported from the prototype's `C` array. Each row is a
// person + their loan file; `recv` seeds how many checklist items have arrived.
type Row = {
  id: string;
  name: string;
  guj: string;
  phone: string;
  email: string;
  lang: string;
  source: string;
  cat: string;
  loan: string;
  borrower: string;
  borrowerLabel: string;
  amount: number;
  stage: string;
  rep: string;
  readiness: number;
  last: string;
  idleDays: number;
  credit: string;
  income: string;
  timeline: string;
  recv: number;
};

const C: Row[] = [
  { id: "rakesh", name: "Rakesh Patel", guj: "રાકેશ પટેલ", phone: "(408) 555-0192", email: "rakesh@patelmarket.com", lang: "Gujarati", source: "Referral — Sweet Frog owner", cat: "sba", loan: "SBA 7(a) — store acquisition", borrower: "business", borrowerLabel: "Business owner", amount: 485000, stage: "review", rep: "Hitesh", readiness: 82, last: "2h ago", idleDays: 0, credit: "710 (est.)", income: "$640K revenue", timeline: "45–60 days", recv: 6 },
  { id: "meena", name: "Meena Shah", guj: "મીના શાહ", phone: "(510) 555-0148", email: "meena.shah@gmail.com", lang: "English", source: "Repeat client", cat: "home", loan: "Conventional purchase", borrower: "w2", borrowerLabel: "W-2 employee", amount: 640000, stage: "qualified", rep: "Anjali", readiness: 74, last: "1d ago", idleDays: 1, credit: "758", income: "$165K household", timeline: "Found a home", recv: 2 },
  { id: "dilip", name: "Dilip Desai", guj: "દિલીપ દેસાઈ", phone: "(408) 555-0167", email: "dilip@desaiholdings.com", lang: "Gujarati", source: "Walk-in", cat: "investor", loan: "Commercial — 12-unit", borrower: "investor", borrowerLabel: "Investor", amount: 1200000, stage: "lender", rep: "Hitesh", readiness: 88, last: "4h ago", idleDays: 0, credit: "742", income: "$3.1M portfolio", timeline: "In escrow", recv: 6 },
  { id: "anita", name: "Anita Joshi", guj: "અનિતા જોશી", phone: "(669) 555-0121", email: "anita.j@designstudio.io", lang: "English", source: "Instagram", cat: "refi", loan: "Cash-out refinance", borrower: "self", borrowerLabel: "Self-employed", amount: 320000, stage: "docs", rep: "Anjali", readiness: 54, last: "3d ago", idleDays: 7, credit: "690 (est.)", income: "$120K (1099)", timeline: "No rush", recv: 2 },
  { id: "sunil", name: "Sunil Mehta", guj: "સુનિલ મેહતા", phone: "(408) 555-0183", email: "sunil@mehtaautocare.com", lang: "Gujarati", source: "Referral — CPA", cat: "sba", loan: "SBA 504 — equipment", borrower: "business", borrowerLabel: "Business owner", amount: 760000, stage: "submitted", rep: "Hitesh", readiness: 79, last: "6h ago", idleDays: 0, credit: "725", income: "$1.2M revenue", timeline: "30 days", recv: 7 },
  { id: "priya", name: "Priya Trivedi", guj: "પ્રિયા ત્રિવેદી", phone: "(510) 555-0139", email: "priya.t@gmail.com", lang: "English", source: "Google ad", cat: "home", loan: "FHA purchase", borrower: "w2", borrowerLabel: "W-2 employee", amount: 410000, stage: "consult", rep: "Anjali", readiness: 66, last: "Yesterday", idleDays: 1, credit: "701", income: "$98K household", timeline: "2–3 months", recv: 3 },
  { id: "bhavin", name: "Bhavin Modi", guj: "ભાવિન મોદી", phone: "(408) 555-0155", email: "bhavin@modihardware.com", lang: "Gujarati", source: "Cold call back", cat: "sba", loan: "Business line of credit", borrower: "business", borrowerLabel: "Business owner", amount: 150000, stage: "screening", rep: "Hitesh", readiness: 41, last: "22m ago", idleDays: 0, credit: "Unknown", income: "$480K revenue", timeline: "Exploring", recv: 0 },
  { id: "kavita", name: "Kavita Rao", guj: "", phone: "(669) 555-0177", email: "kavita.rao@outlook.com", lang: "English", source: "Web form", cat: "home", loan: "First-time purchase", borrower: "w2", borrowerLabel: "W-2 employee", amount: 295000, stage: "new", rep: "Anjali", readiness: 0, last: "8m ago", idleDays: 0, credit: "—", income: "—", timeline: "—", recv: 0 },
  { id: "jayesh", name: "Jayesh Amin", guj: "જયેશ અમીન", phone: "(408) 555-0144", email: "jayesh@aminrealty.com", lang: "Gujarati", source: "Referral — Dilip Desai", cat: "investor", loan: "4-plex purchase (DSCR)", borrower: "investor", borrowerLabel: "Investor", amount: 540000, stage: "qualified", rep: "Hitesh", readiness: 63, last: "2d ago", idleDays: 2, credit: "736", income: "$2.0M portfolio", timeline: "Shopping", recv: 1 },
  { id: "nilesh", name: "Nilesh Gandhi", guj: "નિલેશ ગાંધી", phone: "(510) 555-0190", email: "nilesh@spicevillage.com", lang: "Gujarati", source: "Referral — vendor", cat: "sba", loan: "SBA 7(a) — restaurant", borrower: "business", borrowerLabel: "Business owner", amount: 390000, stage: "nurture", rep: "Hitesh", readiness: 35, last: "9d ago", idleDays: 9, credit: "662", income: "$720K revenue", timeline: "6+ months", recv: 1 },
  { id: "hardik", name: "Hardik Shah", guj: "હાર્દિક શાહ", phone: "(408) 555-0136", email: "hardik@quickstopgas.com", lang: "Gujarati", source: "Web form", cat: "sba", loan: "SBA 7(a) — c-store acq.", borrower: "business", borrowerLabel: "Business owner", amount: 610000, stage: "new", rep: "Hitesh", readiness: 0, last: "14m ago", idleDays: 0, credit: "—", income: "—", timeline: "—", recv: 0 },
  { id: "reema", name: "Reema Kapoor", guj: "", phone: "(669) 555-0112", email: "reema.k@gmail.com", lang: "English", source: "Repeat client", cat: "refi", loan: "Rate-term refinance", borrower: "w2", borrowerLabel: "W-2 employee", amount: 280000, stage: "funded", rep: "Anjali", readiness: 100, last: "5d ago", idleDays: 5, credit: "770", income: "$140K household", timeline: "Closed", recv: 5 },
];

// Task list, ported from the prototype's `T` array.
const T = [
  { id: "t1", title: "First contact — Hardik Shah", cid: "hardik", type: "first", pri: "high", due: "Now", dueK: "overdue", reason: "New lead uncontacted — SLA breached 14m ago" },
  { id: "t2", title: "First contact — Kavita Rao", cid: "kavita", type: "first", pri: "high", due: "in 7m", dueK: "today", reason: "New web-form lead, SLA running" },
  { id: "t3", title: "Strategy consult — Priya Trivedi", cid: "priya", type: "consult", pri: "med", due: "10:30 AM", dueK: "today", reason: "Consult booked — prep checklist ready" },
  { id: "t4", title: "Callback — Bhavin Modi", cid: "bhavin", type: "nurture", pri: "med", due: "12:00 PM", dueK: "today", reason: "Promised callback to send LOC docs" },
  { id: "t5", title: "Chase bank statements — Anita Joshi", cid: "anita", type: "docs", pri: "high", due: "Today", dueK: "today", reason: "Docs incomplete 48h — auto-reminder fired" },
  { id: "t6", title: "Lender follow-up — Dilip Desai", cid: "dilip", type: "submission", pri: "high", due: "2:15 PM", dueK: "today", reason: "Lender requested updated rent roll" },
  { id: "t7", title: "Pre-approval walkthrough — Meena Shah", cid: "meena", type: "consult", pri: "med", due: "4:00 PM", dueK: "today", reason: "Qualified — ready to present options" },
  { id: "t8", title: "Collect P&L — Jayesh Amin", cid: "jayesh", type: "docs", pri: "med", due: "Sep 18", dueK: "overdue", reason: "5 of 6 documents still outstanding" },
  { id: "t9", title: "Re-engage — Nilesh Gandhi", cid: "nilesh", type: "nurture", pri: "low", due: "Sep 16", dueK: "overdue", reason: "Stalled 9 days — no activity" },
  { id: "t10", title: "Package file for review — Rakesh Patel", cid: "rakesh", type: "submission", pri: "high", due: "Tomorrow", dueK: "soon", reason: "All documents received — ready for review" },
  { id: "t11", title: "Verify equipment quote — Sunil Mehta", cid: "sunil", type: "submission", pri: "med", due: "Sep 24", dueK: "future", reason: "SBA 504 condition — lender request" },
  { id: "t12", title: "Send referral thank-you — Reema Kapoor", cid: "reema", type: "nurture", pri: "low", due: "Sep 26", dueK: "future", reason: "Funded — request a review + referral" },
];

function docStatusFor(i: number, recv: number): string {
  if (i < Math.floor(recv * 0.5)) return "approved";
  if (i < recv) return "received";
  return "requested";
}

async function main() {
  // Clean slate (FK cascades handle children).
  await prisma.task.deleteMany();
  await prisma.docItem.deleteMany();
  await prisma.case.deleteMany();
  await prisma.client.deleteMany();

  for (const c of C) {
    await prisma.client.create({
      data: {
        id: c.id,
        name: c.name,
        guj: c.guj,
        phone: c.phone,
        email: c.email,
        lang: c.lang,
      },
    });

    await prisma.case.create({
      data: {
        id: c.id, // one case per seed client; share the id for friendly URLs
        clientId: c.id,
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
      },
    });

    const key = tplKey(c.cat, c.borrower);
    const tpl = TPL[key] || [];
    await prisma.docItem.createMany({
      data: tpl.map((t, i) => ({
        caseId: c.id,
        idx: i,
        name: t[0],
        hint: t[1],
        status: docStatusFor(i, c.recv),
      })),
    });
  }

  for (const t of T) {
    await prisma.task.create({
      data: {
        id: t.id,
        caseId: t.cid,
        title: t.title,
        type: t.type,
        pri: t.pri,
        due: t.due,
        dueK: t.dueK,
        reason: t.reason,
        done: false,
      },
    });
  }

  console.log(`Seeded ${C.length} clients/cases and ${T.length} tasks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
