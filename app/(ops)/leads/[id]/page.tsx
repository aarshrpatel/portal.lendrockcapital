import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { money, ago, dt } from "@/lib/format";
import { touchLead, qualifyLead, convertLead, killLead } from "@/app/actions";
import { Section, StatusPill, TypeBadge, Empty } from "@/components/ui";
import { DEAL_TYPES, DEAL_TYPE_LABELS, SUB_TYPES } from "@/lib/enums";

export default async function LeadDetail({ params }: { params: { id: string } }) {
  const lead = await db.lead.findUnique({
    where: { id: params.id },
    include: { broker: true, deal: { select: { id: true, dealNumber: true } } },
  });
  if (!lead) notFound();

  const messages = await db.messageLog.findMany({
    where: { leadId: lead.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const deadReasons = await db.deadReason.findMany({ where: { active: true } });

  const open = lead.stage !== "DEAD" && lead.stage !== "CONVERTED";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="h-serif text-[26px] font-semibold">
          {lead.firstName} {lead.lastName}
        </h1>
        {lead.dealType ? <TypeBadge dealType={lead.dealType} /> : null}
        <StatusPill status={lead.stage} />
        <StatusPill status={lead.band} />
        <span className="font-mono text-[12px] text-muted">score {lead.score}/100</span>
        {lead.deal ? (
          <a href={`/deals/${lead.deal.id}`} className="btn ml-auto">
            Open deal {lead.deal.dealNumber} →
          </a>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid gap-4 content-start">
          <Section title="Qualification">
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-[13.5px]">
              <div><dt className="label">Amount</dt><dd className="text-ink tabular-nums">{money(lead.amountCents)}</dd></div>
              <div><dt className="label">Use of funds</dt><dd className="text-ink">{lead.useOfFunds || "—"}</dd></div>
              <div><dt className="label">Timeline</dt><dd className="text-ink">{lead.fundingTimeline || "—"}</dd></div>
              <div><dt className="label">Stated credit</dt><dd className="text-ink">{lead.creditStated || "—"}</dd></div>
              <div><dt className="label">State</dt><dd className="font-mono">{lead.state || "—"}</dd></div>
              <div><dt className="label">Source</dt><dd>{lead.source}{lead.utmSource ? ` · ${lead.utmSource}` : ""}</dd></div>
              <div><dt className="label">Email</dt><dd>{lead.email || "—"}</dd></div>
              <div><dt className="label">Phone</dt><dd>{lead.phone || "—"}</dd></div>
              <div><dt className="label">Company</dt><dd>{lead.companyName || "—"}</dd></div>
            </dl>
            {lead.broker ? (
              <p className="mt-3 text-[13px] text-bronze bg-bronze-tint rounded-md px-3 py-2">
                Broker-sourced: {lead.broker.name} ({lead.broker.company}).{" "}
                {lead.broker.directContactOk
                  ? "Direct borrower contact permitted."
                  : "Do not contact borrower directly until broker consents — channel enforced."}
              </p>
            ) : null}
            {lead.dqCode ? (
              <p className="mt-3 text-[13px] text-oxide bg-oxide-tint rounded-md px-3 py-2">
                Hard knockout <span className="font-mono">{lead.dqCode}</span> — polite decline sent with ECOA notice language.
              </p>
            ) : null}
          </Section>

          {open ? (
            <Section title="Advance">
              <div className="grid gap-4">
                {!lead.firstTouchAt ? (
                  <form action={touchLead.bind(null, lead.id)}>
                    <button className="btn btn-primary">Log first touch (stops SLA clock)</button>
                    <span className="text-2xs text-faint ml-3">Human touch within 5 business minutes — auto-responses don&apos;t count.</span>
                  </form>
                ) : null}

                {lead.stage !== "QUALIFIED" ? (
                  <form action={qualifyLead.bind(null, lead.id)} className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="label block mb-1">Pathway</label>
                      <select name="dealType" className="input w-44" defaultValue={lead.dealType || ""} required>
                        <option value="" disabled>Select…</option>
                        {DEAL_TYPES.map((t) => (
                          <option key={t} value={t}>{t} — {DEAL_TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label block mb-1">Confirmed amount ($)</label>
                      <input name="amount" type="number" className="input w-36" defaultValue={lead.amountCents / 100 || ""} />
                    </div>
                    <div>
                      <label className="label block mb-1">State</label>
                      <input name="state" maxLength={2} className="input w-20 font-mono uppercase" defaultValue={lead.state} />
                    </div>
                    <div className="flex-1 min-w-40">
                      <label className="label block mb-1">Discovery notes</label>
                      <input name="notes" className="input" defaultValue={lead.notes} placeholder="Business purpose confirmed, entity borrower…" />
                    </div>
                    <button className="btn">Mark qualified</button>
                  </form>
                ) : null}

                {lead.stage === "QUALIFIED" && lead.dealType ? (
                  <form action={convertLead.bind(null, lead.id)} className="flex flex-wrap items-end gap-2 border-t border-line2 pt-4">
                    <div>
                      <label className="label block mb-1">Product</label>
                      <select name="subType" className="input w-56" required defaultValue="">
                        <option value="" disabled>Select product…</option>
                        {SUB_TYPES[lead.dealType as keyof typeof SUB_TYPES]?.map((s) => (
                          <option key={s.code} value={s.code}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <button className="btn btn-primary">Convert to deal →</button>
                    <span className="text-2xs text-faint">Enter-once: everything above lands on the deal. Checklist, playbook, and compliance checks materialize automatically.</span>
                  </form>
                ) : null}

                <form action={killLead.bind(null, lead.id)} className="flex items-end gap-2 border-t border-line2 pt-4">
                  <div>
                    <label className="label block mb-1">Kill with reason</label>
                    <select name="reason" className="input w-64">
                      {deadReasons.map((r) => (
                        <option key={r.code} value={r.code}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn btn-danger">Mark DEAD</button>
                </form>
              </div>
            </Section>
          ) : null}
        </div>

        <Section title="Timeline">
          {messages.length === 0 ? (
            <Empty text="No messages yet." />
          ) : (
            <ul className="divide-y divide-line3">
              {messages.map((m) => (
                <li key={m.id} className="py-2.5">
                  <p className="text-2xs text-faint">
                    <span className="kcode mr-1">{m.channel}</span>
                    {m.templateCode || m.direction} · {ago(m.createdAt)}
                  </p>
                  {m.subject ? <p className="text-[13px] font-medium text-ink mt-1">{m.subject}</p> : null}
                  <p className="text-[12.5px] text-muted mt-0.5">{m.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
