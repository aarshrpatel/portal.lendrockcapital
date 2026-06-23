"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { badge } from "@/lib/domain";
import { Avatar, Badge } from "@/components/ui";

export type ClientVM = {
  id: string;
  name: string;
  guj: string;
  phone: string;
  email: string;
  initials: string;
  avBg: string;
  avFg: string;
  stageLabel: string;
  stageBg: string;
  stageFg: string;
  readiness: number;
  rFg: string;
  action: { title: string; desc: string; cta: string; tab?: string; href?: string };
  facts: [string, string][];
  factors: { label: string; v: number; pct: string; color: string }[];
  timeline: { label: string; fg: string; when: string }[];
  calls: { who: string; when: string; dur: string; text: string }[];
  notes: { who: string; when: string; text: string }[];
  comms: { ch: string; color: string; dir: string; when: string; text: string }[];
  lenderActive: boolean;
  lenders: { name: string; status: string; note: string }[];
  intakeRows: [string, string][];
  docItems: { id: string; name: string; hint: string; label: string; bg: string; fg: string; bd: string }[];
  docMeta: string;
  tasks: { id: string; title: string; reason: string; due: string; dueK: string; pri: string }[];
};

const TABS: [string, string][] = [
  ["overview", "Overview"],
  ["intake", "Intake"],
  ["notes", "Notes & calls"],
  ["tasks", "Tasks"],
  ["documents", "Documents"],
  ["timeline", "Timeline"],
  ["lender", "Lender strategy"],
  ["comms", "Communications"],
];

const PRI_STYLE: Record<string, [string, string, string]> = {
  high: ["#fef2f2", "#b91c1c", "#fecaca"],
  med: ["#fff7ed", "#c2410c", "#fed7aa"],
  low: ["#f3f4f6", "#6b7280", "#e5e7eb"],
};
const PRI_LABEL: Record<string, string> = { high: "High", med: "Med", low: "Low" };
const DUE_STYLE: Record<string, [string, string, string]> = {
  overdue: ["#fef2f2", "#b91c1c", "#fecaca"],
  today: ["#fffbeb", "#b45309", "#fde68a"],
  soon: ["#eff6ff", "#2563eb", "#dbeafe"],
  future: ["#f3f4f6", "#6b7280", "#e5e7eb"],
};

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-white p-[18px_20px] ${className}`}>
      {children}
    </div>
  );
}

export function ClientDetail({ vm }: { vm: ClientVM }) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");

  function doAction() {
    if (vm.action.href) router.push(vm.action.href === "/borrower" ? `/borrower/${vm.id}` : vm.action.href);
    else if (vm.action.tab) setTab(vm.action.tab);
  }
  // "Chase missing documents" (docs stage) routes to the borrower page for this case.
  const actionHandler = vm.action.cta === "Send docs link" ? () => router.push(`/borrower/${vm.id}`) : doAction;

  return (
    <div>
      <Link
        href="/pipeline"
        className="mb-[14px] inline-block text-[13px] font-semibold text-[#6b747c] hover:text-brand"
      >
        ← Pipeline
      </Link>

      <div
        className="overflow-hidden rounded-2xl border border-line bg-white"
        style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04)" }}
      >
        {/* header */}
        <div className="flex flex-wrap items-center gap-4 border-b border-line2 px-[22px] py-5">
          <Avatar initials={vm.initials} bg={vm.avBg} fg={vm.avFg} size={52} fontSize={18} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-[11px]">
              <h1 className="m-0 font-serif text-[25px] font-semibold -tracking-[0.01em]">
                {vm.name}
              </h1>
              <Badge bg={vm.stageBg} fg={vm.stageFg}>
                {vm.stageLabel}
              </Badge>
            </div>
            <div className="mt-[5px] flex flex-wrap items-center gap-[14px] text-[12.5px] text-muted">
              {vm.guj && <span className="font-guj">{vm.guj}</span>}
              <span>☏ {vm.phone}</span>
              <span>✉ {vm.email}</span>
            </div>
          </div>
          <div className="flex gap-[9px]">
            <button
              onClick={() => router.push(`/borrower/${vm.id}`)}
              className="rounded-lg border border-[#d4d8db] bg-white px-[14px] py-2 text-[12.5px] font-semibold text-body hover:bg-page"
            >
              Send upload link
            </button>
            <button className="rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-brand-hover">
              ☏ Call now
            </button>
          </div>
        </div>

        {/* tabs */}
        <div className="flex flex-wrap border-b border-line2 px-[22px]">
          {TABS.map(([k, l]) => {
            const active = tab === k;
            return (
              <button
                key={k}
                onClick={() => setTab(k)}
                className="mr-5 cursor-pointer py-[11px] text-[13px] font-semibold transition-colors"
                style={{
                  borderBottom: `2px solid ${active ? "#0e5b54" : "transparent"}`,
                  color: active ? "#0e5b54" : "#7b848c",
                }}
              >
                {l}
              </button>
            );
          })}
        </div>

        {/* tab content */}
        <div className="bg-[#fafbfb] p-[22px]">
          {tab === "overview" && (
            <div className="grid grid-cols-[1.5fr_1fr] items-start gap-[18px]">
              <div className="flex flex-col gap-[18px]">
                <div className="flex items-center justify-between gap-[14px] rounded-xl bg-brand p-[17px_19px] text-white">
                  <div>
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.07em] opacity-70">
                      Next best action
                    </div>
                    <div className="mt-1 font-serif text-[17px] font-semibold">
                      {vm.action.title}
                    </div>
                    <div className="mt-[3px] text-[12.5px] opacity-85">{vm.action.desc}</div>
                  </div>
                  <button
                    onClick={actionHandler}
                    className="flex-none whitespace-nowrap rounded-lg bg-white px-[15px] py-[9px] text-[12.5px] font-bold text-brand"
                  >
                    {vm.action.cta} →
                  </button>
                </div>

                <Panel>
                  <h3 className="mb-[13px] mt-0 text-[13px] font-semibold">Case facts</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-[13px]">
                    {vm.facts.map(([k, v]) => (
                      <div key={k}>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-faint">
                          {k}
                        </div>
                        <div className="mt-[3px] text-[13.5px] font-medium text-ink">{v}</div>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel>
                  <div className="mb-[6px] flex items-center justify-between">
                    <h3 className="m-0 text-[13px] font-semibold">Recent communication</h3>
                    <span className="text-[11px] text-faint">{vm.docMeta}</span>
                  </div>
                  {vm.comms.map((m, i) => (
                    <div key={i} className="flex gap-[11px] border-b border-line3 py-[10px] last:border-0">
                      <span
                        className="h-fit flex-none rounded-md px-[7px] py-[3px] text-[10px] font-bold uppercase tracking-[0.04em] text-white"
                        style={{ background: m.color }}
                      >
                        {m.ch}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[12.5px] leading-[1.45] text-body">{m.text}</div>
                        <div className="mt-[2px] text-[11px] text-[#a9b0b6]">
                          {m.dir} · {m.when}
                        </div>
                      </div>
                    </div>
                  ))}
                </Panel>
              </div>

              <div className="flex flex-col gap-[18px]">
                <Panel>
                  <div className="flex items-center justify-between">
                    <h3 className="m-0 text-[13px] font-semibold">Readiness score</h3>
                    <span className="text-[10.5px] text-faint">internal only</span>
                  </div>
                  <div className="my-[4px] mt-[10px] flex items-baseline gap-2">
                    <span
                      className="font-serif text-[44px] font-semibold leading-none"
                      style={{ color: vm.rFg }}
                    >
                      {vm.readiness}
                    </span>
                    <span className="text-[14px] text-faint">/ 100</span>
                  </div>
                  <div className="mb-4 h-2 overflow-hidden rounded" style={{ background: "#eef0f1" }}>
                    <div
                      className="h-full rounded"
                      style={{ background: vm.rFg, width: `${vm.readiness}%` }}
                    />
                  </div>
                  {vm.factors.map((f) => (
                    <div key={f.label} className="mb-[11px]">
                      <div className="mb-1 flex justify-between text-[12px]">
                        <span className="text-[#5b6470]">{f.label}</span>
                        <span className="font-semibold" style={{ color: f.color }}>
                          {f.v}
                        </span>
                      </div>
                      <div className="h-[5px] overflow-hidden rounded" style={{ background: "#eef0f1" }}>
                        <div
                          className="h-full rounded"
                          style={{ background: f.color, width: f.pct }}
                        />
                      </div>
                    </div>
                  ))}
                </Panel>

                <Panel>
                  <h3 className="mb-[11px] mt-0 text-[13px] font-semibold">Open tasks</h3>
                  {vm.tasks.length === 0 && (
                    <div className="py-2 text-[12px] text-faint">No open tasks.</div>
                  )}
                  {vm.tasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-start gap-[10px] border-b border-line3 py-[9px] last:border-0"
                    >
                      <span className="mt-px h-[15px] w-[15px] flex-none rounded-md border-[1.5px] border-[#c9ced2]" />
                      <div>
                        <div className="text-[12.5px] font-medium text-ink">{t.title}</div>
                        <div className="mt-px text-[11px] text-faint">{t.due}</div>
                      </div>
                    </div>
                  ))}
                </Panel>
              </div>
            </div>
          )}

          {tab === "intake" && (
            <Panel className="max-w-[720px] !p-[20px_22px]">
              <h3 className="mb-1 mt-0 text-[14px] font-semibold">Intake summary</h3>
              <p className="mb-4 mt-0 text-[12.5px] text-muted">
                Captured on the first call — use this as your pre-consult brief.
              </p>
              <div
                className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line2"
                style={{ background: "#eef0f1" }}
              >
                {vm.intakeRows.map(([k, v]) => (
                  <div key={k} className="bg-white px-[15px] py-[12px]">
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-faint">
                      {k}
                    </div>
                    <div className="mt-[3px] text-[13.5px] text-ink">{v}</div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === "notes" && (
            <div className="grid max-w-[920px] grid-cols-2 gap-[18px]">
              <Panel>
                <h3 className="mb-[13px] mt-0 text-[13px] font-semibold">Call log</h3>
                {vm.calls.map((c, i) => (
                  <div key={i} className="border-b border-line3 py-[11px] last:border-0">
                    <div className="flex justify-between text-[12px]">
                      <span className="font-semibold text-brand">☏ {c.who}</span>
                      <span className="text-[#a9b0b6]">
                        {c.when} · {c.dur}
                      </span>
                    </div>
                    <div className="mt-[5px] text-[12.5px] leading-[1.5] text-body">{c.text}</div>
                  </div>
                ))}
              </Panel>
              <Panel>
                <div className="mb-[11px] flex items-center justify-between">
                  <h3 className="m-0 text-[13px] font-semibold">Internal notes</h3>
                  <button className="rounded-[7px] border border-[#d4d8db] bg-white px-[10px] py-1 text-[11.5px] font-semibold text-brand">
                    + Note
                  </button>
                </div>
                {vm.notes.map((n, i) => (
                  <div key={i} className="border-b border-line3 py-[11px] last:border-0">
                    <div className="text-[12px]">
                      <b className="text-ink">{n.who}</b>{" "}
                      <span className="text-[#a9b0b6]">· {n.when}</span>
                    </div>
                    <div className="mt-1 text-[12.5px] leading-[1.5] text-body">{n.text}</div>
                  </div>
                ))}
              </Panel>
            </div>
          )}

          {tab === "tasks" && (
            <div className="max-w-[720px] rounded-xl border border-line bg-white px-5 py-2">
              {vm.tasks.length === 0 && (
                <div className="py-8 text-center text-[13px] text-faint">No tasks on this file.</div>
              )}
              {vm.tasks.map((t) => {
                const [pb, pf, pd] = PRI_STYLE[t.pri];
                const [db, df, dd] = DUE_STYLE[t.dueK];
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 border-b border-line3 py-[14px] last:border-0"
                  >
                    <span className="h-[18px] w-[18px] flex-none rounded-md border-[1.5px] border-[#c9ced2]" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium">{t.title}</div>
                      <div className="mt-[2px] text-[11.5px] text-faint">{t.reason}</div>
                    </div>
                    <span style={badge(pb, pf, pd)}>{PRI_LABEL[t.pri]}</span>
                    <span style={badge(db, df, dd)}>{t.due}</span>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "documents" && (
            <div className="max-w-[760px] rounded-xl border border-line bg-white px-5 py-2">
              {vm.docItems.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 border-b border-line3 py-[13px] last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium">{d.name}</div>
                    <div className="mt-px text-[11.5px] text-faint">{d.hint}</div>
                  </div>
                  <span style={badge(d.bg, d.fg, d.bd)}>{d.label}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "timeline" && (
            <Panel className="max-w-[620px] !p-[20px_22px]">
              <h3 className="mb-4 mt-0 text-[13px] font-semibold">Status history</h3>
              {vm.timeline.map((s, i) => (
                <div key={i} className="flex gap-[13px]">
                  <div className="flex flex-none flex-col items-center">
                    <span
                      className="h-[13px] w-[13px] rounded-full border-[2.5px] border-white"
                      style={{ background: s.fg, boxShadow: `0 0 0 1.5px ${s.fg}` }}
                    />
                    {i < vm.timeline.length - 1 && (
                      <span className="my-[3px] w-[2px] flex-1 bg-line2" />
                    )}
                  </div>
                  <div className="pb-[18px]">
                    <div className="text-[13.5px] font-semibold text-ink">{s.label}</div>
                    <div className="mt-[2px] text-[11.5px] text-[#a9b0b6]">{s.when}</div>
                  </div>
                </div>
              ))}
            </Panel>
          )}

          {tab === "lender" && (
            <div className="max-w-[760px]">
              {vm.lenderActive ? (
                <div className="flex flex-col gap-[13px]">
                  {vm.lenders.map((l, i) => (
                    <div key={i} className="rounded-xl border border-line bg-white p-[16px_19px]">
                      <div className="flex items-center justify-between">
                        <div className="font-serif text-[14.5px] font-semibold">{l.name}</div>
                        <span className="rounded-full border border-[#dbeafe] bg-[#eff6ff] px-[10px] py-px text-[11px] font-semibold text-[#2563eb]">
                          {l.status}
                        </span>
                      </div>
                      <div className="mt-[7px] text-[12.5px] leading-[1.5] text-[#5b6470]">
                        {l.note}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-line bg-white px-[22px] py-[34px] text-center">
                  <div className="text-[14px] font-semibold text-ink">No lender activity yet</div>
                  <div className="mt-[5px] text-[12.5px] text-faint">
                    Log lender attempts and conditions once this file is submitted.
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "comms" && (
            <div className="max-w-[760px] rounded-xl border border-line bg-white px-5 py-2">
              {vm.comms.map((m, i) => (
                <div
                  key={i}
                  className="flex gap-3 border-b border-line3 py-[14px] last:border-0"
                >
                  <span
                    className="h-fit flex-none rounded-md px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.04em] text-white"
                    style={{ background: m.color }}
                  >
                    {m.ch}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] leading-[1.5] text-body">{m.text}</div>
                    <div className="mt-[3px] text-[11px] text-[#a9b0b6]">
                      {m.dir} · {m.when}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
