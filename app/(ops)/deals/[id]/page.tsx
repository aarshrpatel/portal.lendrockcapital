import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { money, rate, ago, dt, daysIn, pct } from "@/lib/format";
import { stagesFor, STAGE_LABELS, STAGE_OWNER, subTypeLabel } from "@/lib/enums";
import {
  moveStage, markDealTerminal, runPrescreen, updateDealEconomics, reviewDoc,
  completeTask, signOff, requestDraw, recordInspection, decideDraw,
  commitInvestor, advanceParticipation, recordPayment, wcActivateLine,
  wcRequestDraw, wcDecideDraw, form159Advance, sbaSubmit, sbaSetStatus, resolveCompliance,
} from "@/app/actions";
import { Section, StatusPill, TypeBadge, Empty } from "@/components/ui";
import { matchInvestors, concentrationFlags } from "@/lib/domain/capital";
import { openDocGates } from "@/lib/domain/events";
import type { CreditFlag } from "@/lib/domain/creditbox";
import { describeFlag } from "@/lib/domain/creditbox";

const TABS = ["overview", "docs", "underwriting", "approvals", "capital", "servicing", "timeline"] as const;

export default async function DealPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  const deal = await db.deal.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      lead: true,
      contacts: { include: { contact: true } },
      collateral: true,
      documents: { orderBy: [{ category: "asc" }] },
      tasks: { orderBy: [{ status: "asc" }, { dueAt: "asc" }] },
      approvals: { include: { signoffs: { include: { approver: true } } }, orderBy: { createdAt: "desc" } },
      creditBoxRuns: { orderBy: { createdAt: "desc" }, take: 1 },
      participations: { include: { investor: true } },
      transactions: { orderBy: { date: "desc" } },
      draws: { orderBy: { requestedAt: "desc" } },
      wcLine: { include: { draws: { orderBy: { requestedAt: "desc" } } } },
      stageEvents: { orderBy: { createdAt: "desc" } },
      messages: { orderBy: { createdAt: "desc" }, take: 30 },
      compliance: true,
      form159: true,
      sbaSubmissions: { include: { lender: true } },
    },
  });
  if (!deal) notFound();

  const tab = (TABS as readonly string[]).includes(searchParams.tab ?? "") ? (searchParams.tab as string) : "overview";
  const rail = stagesFor(deal.dealType);
  const isTerminal = deal.stage === "DEAD" || deal.stage === "DECLINED";
  const currentIdx = rail.indexOf(deal.stage);
  const nextStage = !isTerminal && currentIdx >= 0 && currentIdx < rail.length - 1 ? rail[currentIdx + 1] : null;
  const gates = nextStage ? await openDocGates(deal.id, deal.stage) : [];
  const lastRun = deal.creditBoxRuns[0];
  const flags: CreditFlag[] = lastRun ? JSON.parse(lastRun.flags) : [];
  const auditTrail = await db.auditLog.findMany({
    where: { objectType: "Deal", objectId: deal.id },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  const eligibleInvestors = deal.stage !== "PAID_OFF" ? matchInvestors(deal, await db.investor.findMany({ where: { status: "ACTIVE" } })) : [];
  const partnerLenders = deal.dealType === "SBA" ? await db.partnerLender.findMany() : [];
  const concFlags = concentrationFlags(deal, deal.participations);

  const committedTotal = deal.participations
    .filter((p) => !["CANCELLED", "REPAID"].includes(p.status))
    .reduce((s, p) => s + p.committedCents, 0);

  return (
    <div className="grid gap-4">
      {/* ── header ── */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 pt-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-faint">{deal.dealNumber}</span>
              <TypeBadge dealType={deal.dealType} />
              <span className="text-2xs text-muted">{subTypeLabel(deal.subType)}</span>
              {isTerminal ? <StatusPill status={deal.stage} /> : null}
            </div>
            <h1 className="h-serif text-[25px] font-semibold leading-tight mt-0.5 truncate">{deal.company.legalName}</h1>
          </div>
          <div className="ml-auto flex items-stretch divide-x divide-line2 rounded-lg border border-line2 bg-page/50">
            {[
              ["Amount", money(deal.amountCents)],
              ["Rate", rate(deal.rateBps)],
              ["Term", `${deal.termMonths} mo`],
              ["Pre-screen", deal.prescreenResult ? (deal.prescreenResult === "PASS_WITH_EXCEPTIONS" ? "PASS w/ EXC" : deal.prescreenResult) : "—"],
            ].map(([l, v]) => (
              <div key={String(l)} className="px-4 py-2 text-center">
                <div className="label">{l}</div>
                <div className={`text-[14.5px] font-serif font-semibold tabular-nums mt-0.5 ${
                  l === "Pre-screen" ? (v === "PASS" ? "text-brand" : v === "FAIL" ? "text-oxide" : v === "—" ? "text-faint" : "text-bronze") : "text-ink"
                }`}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* stage rail */}
        {!isTerminal ? (
          <div className="flex items-center mt-4 px-5 pb-4 overflow-x-auto rail-scroll">
            {rail.map((s, i) => (
              <div key={s} className="flex items-center shrink-0">
                {i > 0 ? <span className={`w-5 h-[1.5px] ${i <= currentIdx ? "bg-brand/50" : "bg-line"}`} /> : null}
                <span
                  className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-1 rounded-md ${
                    s === deal.stage
                      ? "bg-brand text-white shadow-card"
                      : i < currentIdx
                        ? "text-brand"
                        : "text-faint"
                  }`}
                >
                  {i < currentIdx ? <span className="text-brand text-[10px]">✓</span> : null}
                  {STAGE_LABELS[s]}
                </span>
              </div>
            ))}
            <span className="inline-flex items-center gap-1.5 text-2xs text-faint font-mono ml-4 shrink-0">
              <span className={`pill-dot ${daysIn(deal.stageEnteredAt) > 7 ? "bg-oxide" : "bg-brand/60"}`} />
              {daysIn(deal.stageEnteredAt)}d in stage · owner {STAGE_OWNER[deal.stage]}
            </span>
          </div>
        ) : (
          <p className="mx-5 mb-4 mt-3 text-[13px] text-oxide bg-oxide-tint rounded-md px-3 py-2">
            {deal.stage === "DEAD" ? `Dead: ${deal.deadReason}` : `Declined: ${deal.declineReasons} — adverse-action timer running`}
          </p>
        )}

        {/* advance controls */}
        {!isTerminal && nextStage ? (
          <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-line2 bg-page/40">
            <form action={moveStage.bind(null, deal.id)}>
              <input type="hidden" name="toStage" value={nextStage} />
              <button className="btn btn-primary" disabled={gates.length > 0}>
                Advance → {STAGE_LABELS[nextStage]}
              </button>
            </form>
            {gates.length > 0 ? (
              <span className="text-[12.5px] text-bronze">
                {gates.length} document gate{gates.length > 1 ? "s" : ""} open: {gates.slice(0, 3).join(", ")}
                {gates.length > 3 ? "…" : ""}
              </span>
            ) : null}
            {(user.role === "PRIN" || user.role === "ADMIN") && gates.length > 0 ? (
              <form action={moveStage.bind(null, deal.id)}>
                <input type="hidden" name="toStage" value={nextStage} />
                <input type="hidden" name="force" value="1" />
                <button className="btn">PRIN override</button>
              </form>
            ) : null}
            <form action={markDealTerminal.bind(null, deal.id)} className="ml-auto flex items-center gap-2">
              <select name="terminal" className="input w-32 py-1">
                <option value="DEAD">DEAD</option>
                <option value="DECLINED">DECLINED</option>
              </select>
              <input name="reason" placeholder="reason code" className="input w-44 py-1 font-mono text-[12px]" />
              <button className="btn btn-danger">Terminate</button>
            </form>
          </div>
        ) : null}
      </div>

      {/* ── tabs ── */}
      <div className="flex gap-0.5 border-b-[1.5px] border-line text-[13.5px] overflow-x-auto rail-scroll">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/deals/${deal.id}?tab=${t}`}
            className={`px-3.5 py-2 -mb-[1.5px] border-b-2 capitalize whitespace-nowrap transition-colors ${
              tab === t
                ? "border-brand text-brand font-semibold"
                : "border-transparent text-muted hover:text-ink hover:border-line"
            }`}
          >
            {t}
            {t === "docs" ? (
              <span className={`font-mono text-2xs ml-1.5 rounded-full px-1.5 py-px ${
                deal.documents.every((d) => d.status === "ACCEPTED") ? "bg-brand-tint text-brand" : "bg-line3 text-muted"
              }`}>
                {deal.documents.filter((d) => d.status === "ACCEPTED").length}/{deal.documents.length}
              </span>
            ) : null}
          </Link>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" ? (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 grid gap-4 content-start">
            <Section title="Open tasks">
              {deal.tasks.filter((t) => ["OPEN", "IN_PROGRESS"].includes(t.status)).length === 0 ? (
                <Empty text="No open tasks — stage playbook is clear." />
              ) : (
                <ul className="divide-y divide-line3">
                  {deal.tasks
                    .filter((t) => ["OPEN", "IN_PROGRESS"].includes(t.status))
                    .map((t) => (
                      <li key={t.id} className="flex items-center gap-3 py-2">
                        <form action={completeTask.bind(null, t.id)}>
                          <button className="w-[18px] h-[18px] rounded border border-line hover:border-brand hover:bg-brand-tint" aria-label="Done" />
                        </form>
                        <span className="text-[13.5px] text-ink flex-1">{t.title}</span>
                        <span className="kcode">{t.ownerRole}</span>
                        {t.dueAt ? <span className="text-2xs text-faint font-mono">{dt(t.dueAt)}</span> : null}
                      </li>
                    ))}
                </ul>
              )}
            </Section>

            <Section title="SYS automations completed">
              <ul className="grid md:grid-cols-2 gap-x-6">
                {deal.tasks
                  .filter((t) => t.ownerRole === "SYS")
                  .map((t) => (
                    <li key={t.id} className="text-[12.5px] text-muted py-1 flex gap-2">
                      <span className="text-brand">✓</span> {t.title}
                    </li>
                  ))}
              </ul>
            </Section>

            {deal.dealType === "SBA" ? (
              <Section title="SBA — Form 159 & lender submissions">
                <div className="flex items-center gap-3 mb-4">
                  <span className="label">Form 159</span>
                  <StatusPill status={deal.form159?.status ?? "DRAFT"} />
                  {deal.form159 && deal.form159.status !== "COMPLETE" ? (
                    <form action={form159Advance.bind(null, deal.id)} className="flex gap-2">
                      <input
                        type="hidden"
                        name="status"
                        value={deal.form159.status === "DRAFT" ? "SENT" : deal.form159.status === "SENT" ? "SIGNED" : "COMPLETE"}
                      />
                      <button className="btn">
                        Advance to {deal.form159.status === "DRAFT" ? "SENT" : deal.form159.status === "SENT" ? "SIGNED" : "COMPLETE"}
                      </button>
                    </form>
                  ) : null}
                  <span className="text-2xs text-faint">Packaging fee {money(deal.form159?.packagingFeeCents ?? 0)} · flat, non-contingent, never from proceeds</span>
                </div>
                {deal.sbaSubmissions.length > 0 ? (
                  <ul className="divide-y divide-line3 mb-3">
                    {deal.sbaSubmissions.map((s) => (
                      <li key={s.id} className="flex items-center gap-3 py-2">
                        <span className="text-[13.5px] text-ink">{s.lender.name}</span>
                        <StatusPill status={s.status} />
                        <form action={sbaSetStatus.bind(null, s.id)} className="ml-auto flex gap-1.5">
                          <select name="status" className="input py-0.5 w-36 text-[12px]" defaultValue={s.status}>
                            {["SUBMITTED", "IN_UW", "PROPOSAL", "APPROVED", "DECLINED", "WITHDRAWN"].map((x) => (
                              <option key={x}>{x}</option>
                            ))}
                          </select>
                          <button className="btn py-0.5">Set</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty text="Not yet submitted to partner lenders." />
                )}
                <form action={sbaSubmit.bind(null, deal.id)} className="flex gap-2">
                  <select name="lenderId" className="input w-64">
                    {partnerLenders.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} · {l.turnaroundDays}d turnaround
                      </option>
                    ))}
                  </select>
                  <button className="btn">Submit package</button>
                </form>
              </Section>
            ) : null}
          </div>

          <div className="grid gap-4 content-start">
            <Section title="Borrower">
              {deal.contacts.map((dc) => (
                <div key={dc.id} className="text-[13.5px] py-1.5">
                  <p className="font-medium text-ink">
                    {dc.contact.firstName} {dc.contact.lastName}
                    <span className="kcode ml-2">{dc.role}</span>
                  </p>
                  <p className="text-2xs text-faint">{dc.contact.email || "no email"} · {dc.contact.phone || "no phone"} · {dc.ownershipPct}% owner</p>
                </div>
              ))}
              <p className="text-2xs text-faint mt-2 pt-2 border-t border-line2">
                Borrower portal: <span className="font-mono text-brand">/b/{deal.borrowerToken.slice(0, 8)}…</span>{" "}
                <Link href={`/b/${deal.borrowerToken}`} className="text-brand hover:underline">open ↗</Link>
              </p>
            </Section>

            <Section title="Compliance gates">
              {deal.compliance.length === 0 ? (
                <Empty text="No checks seeded." />
              ) : (
                <ul className="divide-y divide-line3">
                  {deal.compliance.map((c) => (
                    <li key={c.id} className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11.5px] text-ink">{c.checkType}</span>
                        <StatusPill status={c.status} />
                        {c.status === "PENDING" && (c.checkType === "OFAC_SCREEN" || c.checkType === "CFDL_DISCLOSURE" || c.checkType === "ADVERSE_ACTION_TIMER") ? (
                          <form action={resolveCompliance.bind(null, c.id)} className="ml-auto">
                            <input type="hidden" name="status" value={c.checkType === "OFAC_SCREEN" ? "PASS" : "SENT"} />
                            <button className="btn py-0.5 text-[12px]">
                              {c.checkType === "OFAC_SCREEN" ? "Run re-scan" : "Mark sent"}
                            </button>
                          </form>
                        ) : null}
                      </div>
                      <p className="text-2xs text-faint mt-0.5">{c.detail}{c.dueAt ? ` · due ${dt(c.dueAt)}` : ""}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {deal.collateral.length > 0 ? (
              <Section title="Collateral">
                {deal.collateral.map((c) => (
                  <div key={c.id} className="text-[13px] py-1">
                    <p className="text-ink font-medium">{c.address}</p>
                    <p className="text-2xs text-faint">{c.city}, {c.state} · {c.propertyType}</p>
                    <dl className="grid grid-cols-2 gap-x-4 mt-1.5 text-[12.5px] tabular-nums">
                      <div><dt className="label">As-is</dt><dd>{money(c.asIsValueCents)}</dd></div>
                      <div><dt className="label">ARV</dt><dd>{money(c.arvCents)}</dd></div>
                    </dl>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {c.valuationStatus ? <span className="kcode">{c.valuationStatus}</span> : null}
                      {c.titleStatus ? <span className="kcode">{c.titleStatus}</span> : null}
                      {c.insuranceStatus ? <span className="kcode">{c.insuranceStatus}</span> : null}
                    </div>
                  </div>
                ))}
              </Section>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ── DOCS ── */}
      {tab === "docs" ? (
        <Section title={`Document checklist — ${deal.documents.filter((d) => d.status === "ACCEPTED").length} of ${deal.documents.length} accepted`}>
          <table className="w-full text-[13px]">
            <thead>
              <tr>
                <th className="th">Document</th>
                <th className="th">Category</th>
                <th className="th">Status</th>
                <th className="th">Gates</th>
                <th className="th">File</th>
                <th className="th">Review</th>
              </tr>
            </thead>
            <tbody>
              {deal.documents.map((d) => (
                <tr key={d.id}>
                  <td className="td font-medium text-ink">{d.name}<span className="block font-mono text-2xs text-faint font-normal">{d.docCode}</span></td>
                  <td className="td"><span className="kcode">{d.category}</span></td>
                  <td className="td">
                    <StatusPill status={d.status} />
                    {d.rejectedReason ? <span className="block text-2xs text-oxide mt-0.5">{d.rejectedReason}</span> : null}
                    {d.expiresAt ? <span className="block text-2xs text-faint mt-0.5">fresh until {dt(d.expiresAt)}</span> : null}
                  </td>
                  <td className="td">{d.stageGate ? <span className="font-mono text-2xs text-bronze">{d.stageGate} exit</span> : <span className="text-faint">—</span>}</td>
                  <td className="td text-muted">{d.fileName || "—"}</td>
                  <td className="td">
                    {["UPLOADED", "IN_REVIEW"].includes(d.status) ? (
                      <div className="flex gap-1.5">
                        <form action={reviewDoc.bind(null, d.id)}>
                          <input type="hidden" name="decision" value="ACCEPTED" />
                          <button className="btn py-0.5 text-[12px]">Accept</button>
                        </form>
                        <form action={reviewDoc.bind(null, d.id)}>
                          <input type="hidden" name="decision" value="REJECTED" />
                          <button className="btn btn-danger py-0.5 text-[12px]">Reject</button>
                        </form>
                      </div>
                    ) : (
                      <span className="text-2xs text-faint">{d.reviewedBy || "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ) : null}

      {/* ── UNDERWRITING ── */}
      {tab === "underwriting" ? (
        <div className="grid lg:grid-cols-2 gap-4">
          <Section title="Deal economics (auto-recomputes leverage)">
            <form action={updateDealEconomics.bind(null, deal.id)} className="grid grid-cols-2 gap-3">
              <label className="text-[12.5px]"><span className="label block mb-1">Amount ($)</span>
                <input name="amount" type="number" className="input" defaultValue={deal.amountCents / 100 || ""} /></label>
              <label className="text-[12.5px]"><span className="label block mb-1">Rate (%)</span>
                <input name="rate" type="number" step="0.05" className="input" defaultValue={deal.rateBps / 100 || ""} /></label>
              <label className="text-[12.5px]"><span className="label block mb-1">Term (months)</span>
                <input name="termMonths" type="number" className="input" defaultValue={deal.termMonths} /></label>
              <label className="text-[12.5px]"><span className="label block mb-1">FICO mid (lowest guarantor)</span>
                <input name="ficoMid" type="number" className="input" defaultValue={deal.ficoMid ?? ""} /></label>
              {deal.dealType === "HM" ? (
                <>
                  <label className="text-[12.5px]"><span className="label block mb-1">As-is value ($)</span>
                    <input name="asIsValue" type="number" className="input" defaultValue={deal.asIsValueCents / 100 || ""} /></label>
                  <label className="text-[12.5px]"><span className="label block mb-1">ARV ($)</span>
                    <input name="arv" type="number" className="input" defaultValue={deal.arvCents / 100 || ""} /></label>
                  <label className="text-[12.5px]"><span className="label block mb-1">Rehab budget ($)</span>
                    <input name="rehabBudget" type="number" className="input" defaultValue={deal.rehabBudgetCents / 100 || ""} /></label>
                </>
              ) : (
                <>
                  <label className="text-[12.5px]"><span className="label block mb-1">Avg monthly revenue ($)</span>
                    <input name="monthlyRevenue" type="number" className="input" defaultValue={deal.monthlyRevenueCents / 100 || ""} /></label>
                  <label className="text-[12.5px]"><span className="label block mb-1">DSCR (x)</span>
                    <input name="dscr" type="number" step="0.01" className="input" defaultValue={deal.dscrBps ? deal.dscrBps / 10000 : ""} /></label>
                </>
              )}
              <div className="col-span-2"><button className="btn">Save economics</button></div>
            </form>
          </Section>

          <Section
            title="Credit-box pre-screen"
            action={
              <form action={runPrescreen.bind(null, deal.id)}>
                <button className="btn btn-primary py-1">Run pre-screen</button>
              </form>
            }
          >
            {!lastRun ? (
              <Empty text="Not yet run. The pre-screen gates term-sheet issuance — FAIL blocks it entirely." />
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <StatusPill status={lastRun.result} />
                  <span className="text-2xs text-faint">run {ago(lastRun.createdAt)} · immutable snapshot retained for audit</span>
                </div>
                {flags.length === 0 ? (
                  <p className="text-[13px] text-brand">Clean pass — no guardrail exceptions.</p>
                ) : (
                  <ul className="grid gap-1.5">
                    {flags.map((f, i) => (
                      <li key={i} className={`text-[13px] rounded-md px-3 py-2 ${f.severity === "HARD" ? "bg-oxide-tint text-oxide" : "bg-bronze-tint text-bronze"}`}>
                        <span className="font-mono text-2xs mr-2">{f.severity}</span>
                        {describeFlag(f)}
                      </li>
                    ))}
                  </ul>
                )}
                {lastRun.result === "PASS_WITH_EXCEPTIONS" ? (
                  <p className="text-2xs text-faint mt-2">Soft exceptions require PRIN sign-off (max 2 per deal). Hard stops are never exceptionable.</p>
                ) : null}
              </div>
            )}
          </Section>
        </div>
      ) : null}

      {/* ── APPROVALS ── */}
      {tab === "approvals" ? (
        <div className="grid gap-4">
          {deal.approvals.length === 0 ? (
            <Section title="Approvals">
              <Empty text="No approval requests yet — one spawns automatically when the deal enters APPROVED." />
            </Section>
          ) : (
            deal.approvals.map((a) => (
              <Section key={a.id} title={`${a.type.replace(/_/g, " ")} — Tier ${a.tier}`} action={<StatusPill status={a.status} />}>
                <p className="text-2xs text-faint mb-3">
                  Requested {ago(a.createdAt)} by {a.requestedBy} · signoffs collect in parallel; any DECLINED moves the deal to DECLINED with adverse action; RETURNED sends it back to underwriting.
                </p>
                <div className="grid md:grid-cols-3 gap-3">
                  {a.signoffs.map((s) => (
                    <div key={s.id} className="border border-line rounded-md p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="kcode">{s.approverRole}</span>
                        <StatusPill status={s.decision === "PENDING" ? "PENDING" : s.decision} />
                      </div>
                      {s.decision === "PENDING" && (user.role === s.approverRole || user.role === "ADMIN") ? (
                        <form action={signOff.bind(null, s.id)} className="grid gap-2">
                          <input name="note" placeholder="Note / conditions" className="input py-1 text-[12.5px]" />
                          <div className="flex gap-1.5 flex-wrap">
                            <button name="decision" value="APPROVED" className="btn btn-primary py-1 text-[12px]">Approve</button>
                            <button name="decision" value="APPROVED_WITH_CONDITIONS" className="btn py-1 text-[12px]">w/ conditions</button>
                            <button name="decision" value="RETURNED" className="btn py-1 text-[12px]">Return</button>
                            <button name="decision" value="DECLINED" className="btn btn-danger py-1 text-[12px]">Decline</button>
                          </div>
                        </form>
                      ) : (
                        <p className="text-2xs text-muted">
                          {s.approver ? `${s.approver.name} · ` : ""}{s.note || (s.decision === "PENDING" ? `Waiting on ${s.approverRole}` : "")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            ))
          )}
        </div>
      ) : null}

      {/* ── CAPITAL ── */}
      {tab === "capital" ? (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 grid gap-4 content-start">
            <Section title={`Participations — ${money(committedTotal)} of ${money(deal.amountCents)} committed`}>
              {concFlags.length > 0 ? (
                <div className="mb-3 grid gap-1.5">
                  {concFlags.map((f) => (
                    <p key={f.code} className="text-[12.5px] bg-bronze-tint text-bronze rounded-md px-3 py-1.5">
                      <span className="font-mono text-2xs mr-2">{f.code}</span>{f.label}
                    </p>
                  ))}
                </div>
              ) : null}
              {deal.participations.length === 0 ? (
                <Empty text="Balance-sheet deal — no investor capital allocated." />
              ) : (
                <table className="w-full text-[13px]">
                  <thead>
                    <tr><th className="th">Investor</th><th className="th">Committed</th><th className="th">Funded</th><th className="th">Rate</th><th className="th">Status</th><th className="th">Advance</th></tr>
                  </thead>
                  <tbody>
                    {deal.participations.map((p) => {
                      const next: Record<string, string> = {
                        SOFT_COMMIT: "DOCS_OUT", DOCS_OUT: "SIGNED", SIGNED: "WIRED", WIRED: "ACTIVE",
                      };
                      return (
                        <tr key={p.id}>
                          <td className="td font-medium text-ink">{p.investor.name}</td>
                          <td className="td tabular-nums">{money(p.committedCents)}</td>
                          <td className="td tabular-nums">{money(p.fundedCents)}</td>
                          <td className="td tabular-nums">{rate(p.rateBps)}</td>
                          <td className="td"><StatusPill status={p.status} /></td>
                          <td className="td">
                            {next[p.status] ? (
                              <form action={advanceParticipation.bind(null, p.id)}>
                                <input type="hidden" name="toStatus" value={next[p.status]} />
                                <button className="btn py-0.5 text-[12px]">→ {next[p.status]}</button>
                              </form>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Section>

            <Section title="Allocate — preference-matched eligible investors">
              {eligibleInvestors.length === 0 ? (
                <Empty text="No ACTIVE investors match this deal's type/state/size preferences." />
              ) : (
                <form action={commitInvestor.bind(null, deal.id)} className="flex flex-wrap items-end gap-2">
                  <div>
                    <label className="label block mb-1">Investor</label>
                    <select name="investorId" className="input w-64">
                      {eligibleInvestors.map((i) => (
                        <option key={i.id} value={i.id}>{i.name} — {money(i.capitalAvailableCents, { compact: true })} available</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label block mb-1">Commitment ($)</label>
                    <input name="amount" type="number" className="input w-36" />
                  </div>
                  <button className="btn btn-primary">Record soft commit</button>
                  <span className="text-2xs text-faint">Investor rate = deal rate − 200bps servicing strip. FCFS with concentration flags.</span>
                </form>
              )}
            </Section>
          </div>

          <Section title="Money movement">
            {deal.transactions.length === 0 ? (
              <Empty text="No transactions." />
            ) : (
              <ul className="divide-y divide-line3">
                {deal.transactions.map((t) => (
                  <li key={t.id} className="py-2 flex items-center gap-2 text-[13px]">
                    <span className={`font-mono text-2xs ${t.direction === "IN" ? "text-brand" : "text-oxide"}`}>{t.direction}</span>
                    <span className="text-ink">{t.type.replace(/_/g, " ")}</span>
                    <span className="ml-auto tabular-nums">{money(t.amountCents)}</span>
                    <StatusPill status={t.status} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      ) : null}

      {/* ── SERVICING ── */}
      {tab === "servicing" ? (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="grid gap-4 content-start">
            <Section title="Servicing state">
              {deal.fundedAt ? (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13.5px]">
                  <div><dt className="label">Funded</dt><dd>{dt(deal.fundedAt)}</dd></div>
                  <div><dt className="label">Maturity</dt><dd>{dt(deal.maturityDate)}</dd></div>
                  <div><dt className="label">Status</dt><dd><StatusPill status={deal.servicingStatus || "CURRENT"} /></dd></div>
                  <div><dt className="label">Capital source</dt><dd>{deal.capitalSource.replace(/_/g, " ")}</dd></div>
                </dl>
              ) : (
                <Empty text="Not funded yet — servicing activates at FUNDED." />
              )}
            </Section>

            {deal.fundedAt ? (
              <Section title="Record borrower payment">
                <form action={recordPayment.bind(null, deal.id)} className="flex items-end gap-2">
                  <div>
                    <label className="label block mb-1">Amount ($)</label>
                    <input name="amount" type="number" className="input w-40" />
                  </div>
                  <button className="btn btn-primary">Post payment</button>
                  <span className="text-2xs text-faint">Investor splits accrue instantly; distributions settle in the monthly batch (10th).</span>
                </form>
              </Section>
            ) : null}

            {deal.dealType === "WC" && deal.fundedAt && !deal.wcLine ? (
              <Section title="Working-capital line">
                <form action={wcActivateLine.bind(null, deal.id)}>
                  <button className="btn btn-primary">Activate line ($0 drawn)</button>
                  <span className="text-2xs text-faint ml-3">Limit from formula: 0.50 × T6M revenue × tier, floor $25k, cap $250k.</span>
                </form>
              </Section>
            ) : null}

            {deal.wcLine ? (
              <Section title={`WC line — ${money(deal.wcLine.drawnCents)} drawn of ${money(deal.wcLine.limitCents)}`} action={<StatusPill status={deal.wcLine.status} />}>
                <div className="h-2 rounded-full bg-line3 overflow-hidden mb-3">
                  <div className="h-full bg-brand" style={{ width: `${Math.min(100, (deal.wcLine.drawnCents / deal.wcLine.limitCents) * 100)}%` }} />
                </div>
                <p className="text-2xs text-faint mb-3">Tier {deal.wcLine.tier} · {rate(deal.wcLine.rateBps)} · autopay day {deal.wcLine.autopayDay} · renews {dt(deal.wcLine.renewalDate)}</p>
                <form action={wcRequestDraw.bind(null, deal.wcLine.id)} className="flex items-end gap-2 mb-3">
                  <div>
                    <label className="label block mb-1">Draw ($)</label>
                    <input name="amount" type="number" className="input w-36" />
                  </div>
                  <button className="btn">Request draw (runs auto-checks)</button>
                </form>
                {deal.wcLine.draws.length > 0 ? (
                  <ul className="divide-y divide-line3">
                    {deal.wcLine.draws.map((d) => (
                      <li key={d.id} className="py-2 flex items-center gap-3 text-[13px]">
                        <span className="tabular-nums">{money(d.amountCents)}</span>
                        <StatusPill status={d.status} />
                        <span className="text-2xs text-faint">{ago(d.requestedAt)}</span>
                        {d.status === "REVIEW" ? (
                          <form action={wcDecideDraw.bind(null, d.id)} className="ml-auto flex gap-1.5">
                            <button name="decision" value="APPROVED" className="btn py-0.5 text-[12px]">Approve</button>
                            <button name="decision" value="REJECTED" className="btn btn-danger py-0.5 text-[12px]">Reject</button>
                          </form>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Section>
            ) : null}
          </div>

          {deal.dealType === "HM" ? (
            <Section title="Rehab draws — 100% holdback, inspection-gated">
              {deal.fundedAt ? (
                <form action={requestDraw.bind(null, deal.id)} className="flex items-end gap-2 mb-4">
                  <div>
                    <label className="label block mb-1">Draw request ($)</label>
                    <input name="amount" type="number" className="input w-40" />
                  </div>
                  <button className="btn">Request (auto-orders inspection)</button>
                </form>
              ) : (
                <Empty text="Draws open after funding." />
              )}
              {deal.draws.length === 0 ? (
                <Empty text="No draws yet." />
              ) : (
                <ul className="divide-y divide-line3">
                  {deal.draws.map((d) => (
                    <li key={d.id} className="py-2.5">
                      <div className="flex items-center gap-3 text-[13px]">
                        <span className="tabular-nums font-medium">{money(d.amountCents)}</span>
                        <StatusPill status={d.status} />
                        {d.inspectionPct > 0 ? <span className="text-2xs text-faint">inspection supports {d.inspectionPct}%</span> : null}
                        <span className="text-2xs text-faint ml-auto">{ago(d.requestedAt)}</span>
                      </div>
                      <div className="flex gap-1.5 mt-1.5">
                        {d.status === "INSPECTION_ORDERED" ? (
                          <form action={recordInspection.bind(null, d.id)} className="flex items-center gap-1.5">
                            <input name="pct" type="number" max={100} placeholder="% complete" className="input w-28 py-0.5 text-[12px]" />
                            <button className="btn py-0.5 text-[12px]">Record inspection</button>
                          </form>
                        ) : null}
                        {d.status === "INSPECTION_RECEIVED" ? (
                          <form action={decideDraw.bind(null, d.id)} className="flex gap-1.5">
                            <button name="decision" value="APPROVED" className="btn py-0.5 text-[12px]">Approve</button>
                            <button name="decision" value="REJECTED" className="btn btn-danger py-0.5 text-[12px]">Reject</button>
                          </form>
                        ) : null}
                        {d.status === "APPROVED" ? (
                          <form action={decideDraw.bind(null, d.id)}>
                            <button name="decision" value="WIRED" className="btn btn-primary py-0.5 text-[12px]">Release wire (dual control)</button>
                          </form>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-2xs text-faint mt-3">PROC self-approves ≤ $25k fully supported by inspection; UW approves the rest. Request-to-wire SLA: 5 business days.</p>
            </Section>
          ) : null}
        </div>
      ) : null}

      {/* ── TIMELINE ── */}
      {tab === "timeline" ? (
        <div className="grid lg:grid-cols-2 gap-4">
          <Section title="Stage history (immutable)">
            <ul className="divide-y divide-line3">
              {deal.stageEvents.map((e) => (
                <li key={e.id} className="py-2 text-[13px] flex items-center gap-2">
                  <span className="font-mono text-2xs text-faint">{dt(e.createdAt)}</span>
                  <span className="text-muted">{STAGE_LABELS[e.fromStage] ?? e.fromStage}</span>
                  <span className="text-faint">→</span>
                  <span className="text-ink font-medium">{STAGE_LABELS[e.toStage] ?? e.toStage}</span>
                  <span className="kcode ml-auto">{e.actor}</span>
                </li>
              ))}
            </ul>
          </Section>
          <div className="grid gap-4 content-start">
            <Section title="Communications">
              <ul className="divide-y divide-line3">
                {deal.messages.map((m) => (
                  <li key={m.id} className="py-2">
                    <p className="text-2xs text-faint"><span className="kcode mr-1">{m.channel}</span>{m.templateCode} · {ago(m.createdAt)}</p>
                    <p className="text-[12.5px] text-muted mt-0.5">{m.body.slice(0, 120)}</p>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Audit log">
              <ul className="divide-y divide-line3">
                {auditTrail.map((a) => (
                  <li key={a.id} className="py-1.5 text-[12.5px] text-muted">
                    <span className="kcode mr-1.5">{a.actor}</span>
                    {a.action.replace(/_/g, " ").toLowerCase()} {a.detail ? `— ${a.detail.slice(0, 70)}` : ""}
                    <span className="text-faint float-right">{ago(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
