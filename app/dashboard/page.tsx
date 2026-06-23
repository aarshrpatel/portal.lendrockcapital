import Link from "next/link";
import { getDashboard, type CaseRow } from "@/lib/data";
import { STAGE, rCol, type StageKey } from "@/lib/domain";
import { Avatar, Badge, Card, ProgressBar, SectionHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

// Curated, illustrative panels (mirroring the prototype's hand-built lists).
const CALLBACKS = [
  { time: "10:30", ampm: "am", id: "priya", name: "Priya Trivedi", sub: "Strategy consult — FHA", badge: "Consult", bg: "#f5f3ff", fg: "#7c3aed", bd: "#ede9fe" },
  { time: "12:00", ampm: "pm", id: "bhavin", name: "Bhavin Modi", sub: "Callback — send docs link", badge: "Callback", bg: "#e6f2f0", fg: "#0e5b54", bd: "#cfe7e3" },
  { time: "2:15", ampm: "pm", id: "dilip", name: "Dilip Desai", sub: "Lender update call", badge: "Call", bg: "#fffbeb", fg: "#b45309", bd: "#fde68a" },
  { time: "4:00", ampm: "pm", id: "meena", name: "Meena Shah", sub: "Pre-approval walkthrough", badge: "Consult", bg: "#f5f3ff", fg: "#7c3aed", bd: "#ede9fe" },
];

const ACTIVITY = [
  { text: "You moved Sunil Mehta to Submitted", when: "18m ago", dot: "#0e5b54" },
  { text: "Anjali logged a 9-min call with Meena Shah", when: "34m ago", dot: "#2563eb" },
  { text: "Reminder sent — Anita Joshi missing bank statements", when: "1h ago", dot: "#d97706" },
  { text: "Rakesh Patel’s file marked ready for review", when: "2h ago", dot: "#16a34a" },
  { text: "New lead captured — Hardik Shah (web form)", when: "3h ago", dot: "#4f46e5" },
];

function PersonRow({ c, children }: { c: CaseRow; children: React.ReactNode }) {
  return (
    <Link
      href={`/clients/${c.id}`}
      className="flex cursor-pointer items-center gap-3 border-b border-line3 py-[11px] last:border-0 hover:bg-[#fafbfb]"
    >
      <Avatar initials={c.initials} bg={c.avBg} fg={c.avFg} />
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-ink">{c.name}</div>
        <div className="mt-px text-[12px] text-muted">{c.loan}</div>
      </div>
      {children}
    </Link>
  );
}

export default async function DashboardPage() {
  const d = await getDashboard();
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const kpis = [
    { label: "New leads today", value: d.newLeads, color: "#1a1f24", note: "+2 vs yesterday", noteColor: "#16a34a", href: "/pipeline" },
    { label: "Awaiting first contact", value: d.awaitingContact, color: "#dc2626", note: "1 over 15-min SLA", noteColor: "#dc2626", href: "/pipeline" },
    { label: "Waiting on docs", value: d.waitingDocs, color: "#d97706", note: `across ${d.waitingDocs} files`, noteColor: "#9aa1a8", href: "/documents" },
    { label: "Ready for review", value: d.readyForReview, color: "#0e5b54", note: "docs complete", noteColor: "#9aa1a8", href: "/pipeline" },
    { label: "Stalled 7d+", value: d.stalled, color: "#dc2626", note: "need a nudge", noteColor: "#9aa1a8", href: "/tasks" },
    { label: "Callbacks today", value: 5, color: "#1a1f24", note: "2 consults booked", noteColor: "#9aa1a8", href: "/tasks" },
  ];

  return (
    <div>
      <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 font-serif text-[30px] font-semibold -tracking-[0.015em]">
            Good afternoon, Hitesh
          </h1>
          <p className="mt-[6px] text-[13.5px] text-[#6b747c]">
            {dateStr} ·{" "}
            <span className="font-semibold text-brand">$6.2M in pipeline</span> across
            10 active files
          </p>
        </div>
        <div className="flex gap-[9px]">
          <Link
            href="/intake"
            className="rounded-lg border border-[#d4d8db] bg-white px-[15px] py-[9px] text-[13px] font-semibold text-body hover:bg-page"
          >
            + New lead
          </Link>
          <Link
            href="/intake"
            className="flex items-center gap-[7px] rounded-lg bg-brand px-[17px] py-[9px] text-[13px] font-semibold text-white hover:bg-brand-hover"
            style={{ boxShadow: "0 1px 2px rgba(14,91,84,.3)" }}
          >
            <span className="text-[14px]">☏</span> Start intake call
          </Link>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="mb-[22px] grid grid-cols-6 gap-3">
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="cursor-pointer rounded-xl border border-line bg-white px-[15px] py-[13px] transition hover:border-[#cfd4d8]"
            style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04)" }}
          >
            <div className="text-[10.5px] font-semibold uppercase leading-[1.3] tracking-[0.045em] text-[#8a929a]">
              {k.label}
            </div>
            <div
              className="mt-2 font-serif text-[28px] font-semibold leading-none"
              style={{ color: k.color }}
            >
              {k.value}
            </div>
            <div className="mt-[6px] text-[11px]" style={{ color: k.noteColor }}>
              {k.note}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-[1.55fr_1fr] items-start gap-[18px]">
        {/* left column */}
        <div className="flex flex-col gap-[18px]">
          <Card>
            <SectionHeader
              title="Needs first contact"
              right={
                <Badge bg="#fffbeb" fg="#b45309" bd="#fde68a">
                  15-min SLA
                </Badge>
              }
            />
            <div className="px-[18px] pb-2 pt-1">
              {d.dFirst.map((c) => {
                const isNew = c.stage === "new";
                return (
                  <PersonRow key={c.id} c={c}>
                    {isNew ? (
                      <Badge bg="#fffbeb" fg="#b45309" bd="#fde68a">
                        New · {c.last}
                      </Badge>
                    ) : (
                      <Badge
                        bg={STAGE[c.stage as StageKey].bg}
                        fg={STAGE[c.stage as StageKey].fg}
                      >
                        {STAGE[c.stage as StageKey].label}
                      </Badge>
                    )}
                    <Link
                      href="/intake"
                      className="rounded-[7px] border border-[#d4d8db] bg-white px-[11px] py-[5px] text-[11.5px] font-semibold text-brand hover:border-brand hover:bg-brand-tint"
                    >
                      Call
                    </Link>
                  </PersonRow>
                );
              })}
            </div>
          </Card>

          <Card>
            <SectionHeader
              title="Waiting on documents"
              right={
                <Link
                  href="/documents"
                  className="text-[12px] font-semibold text-brand"
                >
                  Open document center →
                </Link>
              }
            />
            <div className="px-[18px] pb-2 pt-1">
              {d.dDocs.map((c) => {
                const heavy = c.docMissing > 3;
                return (
                  <PersonRow key={c.id} c={c}>
                    <div className="flex items-center gap-[10px]">
                      <div className="w-[88px]">
                        <ProgressBar pct={c.docPct} />
                        <div className="mt-[3px] text-right text-[10.5px] text-[#8a929a]">
                          {c.docHave} of {c.docTotal}
                        </div>
                      </div>
                      <Badge
                        bg={heavy ? "#fef2f2" : "#fffbeb"}
                        fg={heavy ? "#b91c1c" : "#b45309"}
                        bd={heavy ? "#fecaca" : "#fde68a"}
                      >
                        {c.docMissing} missing
                      </Badge>
                    </div>
                  </PersonRow>
                );
              })}
            </div>
          </Card>

          <Card>
            <SectionHeader
              title="Stalled files"
              right={<span className="text-[11px] text-faint">No activity 7+ days</span>}
            />
            <div className="px-[18px] pb-2 pt-1">
              {d.dStalled.map((c) => {
                const heavy = c.idleDays >= 9;
                return (
                  <PersonRow key={c.id} c={c}>
                    <Badge
                      bg={heavy ? "#fef2f2" : "#fffbeb"}
                      fg={heavy ? "#b91c1c" : "#b45309"}
                      bd={heavy ? "#fecaca" : "#fde68a"}
                    >
                      Stalled {c.idleDays}d
                    </Badge>
                  </PersonRow>
                );
              })}
            </div>
          </Card>
        </div>

        {/* right column */}
        <div className="flex flex-col gap-[18px]">
          <Card>
            <div className="border-b border-line2 px-[18px] pb-[11px] pt-[15px]">
              <h3 className="m-0 text-[14px] font-semibold">Today · callbacks & consults</h3>
            </div>
            <div className="px-[18px] pb-[10px] pt-1">
              {CALLBACKS.map((cb) => (
                <Link
                  key={cb.name}
                  href={`/clients/${cb.id}`}
                  className="flex cursor-pointer items-center gap-[11px] border-b border-line3 py-[10px] last:border-0 hover:bg-[#fafbfb]"
                >
                  <div className="flex-[0_0_46px] text-center">
                    <div className="font-serif text-[13px] font-bold text-brand">
                      {cb.time}
                    </div>
                    <div className="text-[9.5px] uppercase tracking-[0.04em] text-[#a9b0b6]">
                      {cb.ampm}
                    </div>
                  </div>
                  <div className="w-px self-stretch bg-line2" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-ink">{cb.name}</div>
                    <div className="text-[11.5px] text-muted">{cb.sub}</div>
                  </div>
                  <Badge bg={cb.bg} fg={cb.fg} bd={cb.bd}>
                    {cb.badge}
                  </Badge>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHeader
              title="Hot files by readiness"
              right={<span className="text-[11px] text-faint">internal score</span>}
            />
            <div className="px-[18px] pb-3 pt-[6px]">
              {d.dFocus.map((c) => {
                const rc = rCol(c.readiness);
                return (
                  <Link
                    key={c.id}
                    href={`/clients/${c.id}`}
                    className="flex cursor-pointer items-center gap-3 py-[9px] hover:bg-[#fafbfb]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-ink">{c.name}</div>
                      <div className="text-[11.5px] text-muted">{c.loan}</div>
                    </div>
                    <div className="flex items-center gap-[9px]">
                      <div className="w-[60px]">
                        <ProgressBar pct={c.readiness} color={rc.fg} />
                      </div>
                      <div
                        className="w-6 text-right font-serif text-[13px] font-bold"
                        style={{ color: rc.fg }}
                      >
                        {c.readiness}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="border-b border-line2 px-[18px] pb-[11px] pt-[15px]">
              <h3 className="m-0 text-[14px] font-semibold">Recent activity</h3>
            </div>
            <div className="px-[18px] pb-[14px] pt-2">
              {ACTIVITY.map((a, i) => (
                <div key={i} className="flex gap-[11px] py-[7px]">
                  <div className="flex flex-[0_0_8px] flex-col items-center pt-1">
                    <span
                      className="h-[7px] w-[7px] rounded-full"
                      style={{ background: a.dot }}
                    />
                    <span className="mt-[3px] w-px flex-1 bg-line2" />
                  </div>
                  <div className="pb-[3px]">
                    <div className="text-[12.5px] leading-[1.45] text-body">{a.text}</div>
                    <div className="mt-px text-[11px] text-[#a9b0b6]">{a.when}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
