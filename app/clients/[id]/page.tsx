import { notFound } from "next/navigation";
import { getCase, getTasksForCase } from "@/lib/data";
import {
  STAGE,
  clamp,
  money,
  rCol,
  seed,
  DOC_STATUS_META,
  type StageKey,
} from "@/lib/domain";
import { ClientDetail, type ClientVM } from "@/components/ClientDetail";

export const dynamic = "force-dynamic";

const TL_ORDER: StageKey[] = [
  "new",
  "screening",
  "qualified",
  "docs",
  "consult",
  "review",
  "submitted",
  "lender",
  "approved",
  "funded",
];

const ACTION: Record<
  string,
  { title: string; desc: string; cta: string; tab?: string; href?: string }
> = {
  new: { title: "Make first contact", desc: "Call within the 15-minute SLA window.", cta: "Start intake", href: "/intake" },
  screening: { title: "Finish screening", desc: "A few more questions to qualify this lead.", cta: "Open intake", href: "/intake" },
  qualified: { title: "Book a strategy consult", desc: "Lock in a follow-up call to present options.", cta: "Book consult" },
  docs: { title: "Chase missing documents", desc: "Send a reminder for outstanding items.", cta: "Send docs link" },
  consult: { title: "Prep for the consult", desc: "Review the pre-call summary before you dial.", cta: "Open intake summary", tab: "intake" },
  review: { title: "Review & package the file", desc: "All docs are in — verify and submit.", cta: "Open documents", tab: "documents" },
  submitted: { title: "Await lender decision", desc: "Follow up on any conditions.", cta: "Lender strategy", tab: "lender" },
  lender: { title: "Follow up with the lender", desc: "Chase outstanding conditions.", cta: "Lender strategy", tab: "lender" },
  approved: { title: "Coordinate closing", desc: "Confirm closing docs and funding date.", cta: "Open timeline", tab: "timeline" },
  funded: { title: "Close out the file", desc: "Log commission and request a referral.", cta: "Open timeline", tab: "timeline" },
  nurture: { title: "Schedule the next callback", desc: "Keep warm with a future touch.", cta: "Set callback", href: "/tasks" },
  lost: { title: "Re-engage later", desc: "Note the reason and set a future touch.", cta: "Set callback", href: "/tasks" },
};

export default async function ClientPage({ params }: { params: { id: string } }) {
  const c = await getCase(params.id);
  if (!c) notFound();
  const tasks = await getTasksForCase(c.id);

  const rc = rCol(c.readiness);
  const fn = c.name.split(" ")[0];

  const factors = [
    { label: "Loan-type fit", v: clamp(c.readiness + ((seed(c.id, 7) % 17) - 6)) },
    { label: "Responsiveness", v: clamp(c.readiness + ((seed(c.id, 13) % 21) - 12)) },
    { label: "Document completion", v: c.docPct },
    { label: "Credit / income fit", v: clamp(c.readiness + ((seed(c.id, 29) % 15) - 7)) },
    { label: "Timeline urgency", v: clamp(c.readiness + ((seed(c.id, 41) % 23) - 11)) },
  ].map((f) => ({ label: f.label, v: f.v, pct: `${f.v}%`, color: rCol(f.v || 1).fg }));

  const facts: [string, string][] = [
    ["Loan type", c.loan],
    ["Amount", money(c.amount)],
    ["Borrower", c.borrowerLabel],
    ["Source", c.source],
    ["Language", c.lang],
    ["Credit", c.credit],
    ["Income / revenue", c.income],
    ["Timeline", c.timeline],
    ["Assigned", c.rep],
  ];

  const ci = TL_ORDER.indexOf(c.stage as StageKey);
  const notesWhen = ["Today", "2 days ago", "5 days ago", "1 week ago"];
  const timeline =
    ci >= 0
      ? TL_ORDER.slice(0, ci + 1)
          .map((k, i) => ({
            label: STAGE[k].label,
            fg: STAGE[k].fg,
            when: notesWhen[Math.min(ci - i, 3)] || "2 weeks ago",
          }))
          .reverse()
      : [{ label: STAGE[c.stage as StageKey].label, fg: STAGE[c.stage as StageKey].fg, when: "Today" }];

  const calls = [
    {
      who: c.rep,
      when: c.last,
      dur: "9 min",
      text:
        "Discussed " +
        c.loan.toLowerCase() +
        ". " +
        (c.lang === "Gujarati" ? "Spoke in Gujarati — borrower more comfortable. " : "") +
        (c.readiness >= 70
          ? "Motivated and responsive; clear on next steps."
          : "Still gathering details; needs gentle follow-up."),
    },
    {
      who: c.rep,
      when: "3 days ago",
      dur: "4 min",
      text: "Intro call. Captured basic profile and set expectations on documents.",
    },
  ];

  const notes = [
    {
      who: "Hitesh",
      when: "1 day ago",
      text:
        (c.lang === "Gujarati" ? "Family is well-known in the community — referral source is strong. " : "") +
        "Wants to keep monthly payment under a comfortable threshold.",
    },
    {
      who: "System",
      when: "2 days ago",
      text: "Readiness recalculated to " + c.readiness + " after document update.",
    },
  ];

  const lenderActive = ["submitted", "lender", "approved", "funded"].includes(c.stage);
  const lenders = lenderActive
    ? [
        {
          name: c.cat === "sba" ? "Live Oak Bank (SBA)" : c.cat === "investor" ? "Velocity DSCR" : "Pennymac",
          status: "Reviewing",
          note:
            "Submitted " +
            c.last +
            ". " +
            (c.cat === "sba" ? "Awaiting credit memo and updated P&L." : "Conditions: updated reserves statement."),
        },
        {
          name: c.cat === "sba" ? "Celtic Bank" : c.cat === "investor" ? "Kiavi" : "UWM",
          status: "Backup option",
          note: "Pre-screened; competitive on rate if primary stalls.",
        },
      ]
    : [];

  const comms = [
    {
      ch: "SMS",
      color: "#0e5b54",
      dir: "Sent",
      when: "2h ago",
      text: "Hi " + fn + ", here’s your secure upload link: setu.link/" + c.id + " — reply here with any questions.",
    },
    {
      ch: "Call",
      color: "#2563eb",
      dir: c.rep,
      when: c.last,
      text: "Outbound — 9 min. " + (c.readiness >= 70 ? "Positive, moving forward." : "Needs follow-up."),
    },
    {
      ch: "Email",
      color: "#7c3aed",
      dir: "Sent",
      when: "2 days ago",
      text: "Loan options summary and document checklist attached.",
    },
  ];

  const intakeRows: [string, string][] = [
    ["Full name", c.name],
    ["Phone", c.phone],
    ["Preferred language", c.lang],
    ["Referral source", c.source],
    ["Loan type", c.loan],
    ["Borrower type", c.borrowerLabel],
    ["Income / revenue", c.income],
    ["Credit estimate", c.credit],
    ["Timeline", c.timeline],
  ];

  const docItems = c.docItems.map((d) => {
    const [label, bg, fg, bd] = DOC_STATUS_META[d.status];
    return { id: d.id, name: d.name, hint: d.hint, label, bg, fg, bd };
  });

  const vm: ClientVM = {
    id: c.id,
    name: c.name,
    guj: c.guj,
    phone: c.phone,
    email: c.email,
    initials: c.initials,
    avBg: c.avBg,
    avFg: c.avFg,
    stageLabel: STAGE[c.stage as StageKey].label,
    stageBg: STAGE[c.stage as StageKey].bg,
    stageFg: STAGE[c.stage as StageKey].fg,
    readiness: c.readiness,
    rFg: rc.fg,
    action: ACTION[c.stage] ?? ACTION.new,
    facts,
    factors,
    timeline,
    calls,
    notes,
    comms,
    lenderActive,
    lenders,
    intakeRows,
    docItems,
    docMeta: `${c.docHave} of ${c.docTotal} received`,
    tasks: tasks.map((t) => ({ id: t.id, title: t.title, reason: t.reason, due: t.due, dueK: t.dueK, pri: t.pri })),
  };

  return <ClientDetail vm={vm} />;
}
