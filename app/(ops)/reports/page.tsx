import { db } from "@/lib/db";
import { money, rate } from "@/lib/format";
import { Section, Stat, Empty, PageHeader } from "@/components/ui";
import { DEAL_TYPES, STAGE_LABELS } from "@/lib/enums";

export default async function ReportsPage() {
  const [leads, deals, stageEvents, transactions] = await Promise.all([
    db.lead.findMany({ select: { stage: true, source: true, dealType: true } }),
    db.deal.findMany({
      select: {
        dealType: true, stage: true, amountCents: true, rateBps: true, fundedAt: true,
        maturityDate: true, servicingStatus: true, state: true, createdAt: true,
      },
    }),
    db.stageEvent.findMany({ select: { dealId: true, toStage: true, fromStage: true, createdAt: true }, orderBy: { createdAt: "asc" } }),
    db.transaction.findMany({ select: { type: true, direction: true, amountCents: true, status: true } }),
  ]);

  // ── funnel ──
  const totalLeads = leads.length;
  const converted = leads.filter((l) => l.stage === "CONVERTED").length;
  const dead = leads.filter((l) => l.stage === "DEAD").length;
  const funded = deals.filter((d) => d.fundedAt).length;

  // ── portfolio ──
  const active = deals.filter((d) => ["FUNDED", "SERVICING"].includes(d.stage));
  const outstanding = active.reduce((s, d) => s + d.amountCents, 0);
  const weightedYield =
    outstanding > 0 ? Math.round(active.reduce((s, d) => s + d.rateBps * d.amountCents, 0) / outstanding) : 0;

  // ── cycle time per stage (avg days between consecutive stage events) ──
  const byDeal = new Map<string, { toStage: string; at: Date }[]>();
  for (const e of stageEvents) {
    if (!e.dealId) continue;
    const list = byDeal.get(e.dealId) ?? [];
    list.push({ toStage: e.toStage, at: e.createdAt });
    byDeal.set(e.dealId, list);
  }
  const stageDurations = new Map<string, number[]>();
  byDeal.forEach((events) => {
    for (let i = 0; i < events.length - 1; i++) {
      const days = (events[i + 1].at.getTime() - events[i].at.getTime()) / 86400000;
      const list = stageDurations.get(events[i].toStage) ?? [];
      list.push(days);
      stageDurations.set(events[i].toStage, list);
    }
  });
  const cycle = Array.from(stageDurations.entries())
    .map(([stage, arr]) => ({ stage, avg: arr.reduce((a, b) => a + b, 0) / arr.length, n: arr.length }))
    .sort((a, b) => b.avg - a.avg);

  // ── revenue ──
  const feeIncome = transactions.filter((t) => t.type === "FEE" && t.direction === "IN").reduce((s, t) => s + t.amountCents, 0);
  const paymentsIn = transactions.filter((t) => t.type === "PAYMENT").reduce((s, t) => s + t.amountCents, 0);
  const distributionsOut = transactions.filter((t) => t.type === "DISTRIBUTION").reduce((s, t) => s + t.amountCents, 0);

  // ── concentration by type & state ──
  const byType = DEAL_TYPES.map((t) => ({
    type: t,
    count: active.filter((d) => d.dealType === t).length,
    amount: active.filter((d) => d.dealType === t).reduce((s, d) => s + d.amountCents, 0),
  }));
  const byState = Object.entries(
    active.reduce<Record<string, number>>((acc, d) => {
      if (d.state) acc[d.state] = (acc[d.state] ?? 0) + d.amountCents;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const maxType = Math.max(1, ...byType.map((t) => t.amount));

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Reports"
        sub="Everything derives from the immutable stage-event log and the transaction ledger — no hand-built spreadsheets."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Outstanding principal" value={money(outstanding, { compact: true })} sub={`${active.length} serviced loans`} />
        <Stat label="Weighted avg yield" value={rate(weightedYield)} sub="active book" />
        <Stat label="Lead → deal conversion" value={`${totalLeads ? Math.round((converted / totalLeads) * 100) : 0}%`} sub={`${converted} of ${totalLeads} leads`} />
        <Stat label="Interest collected" value={money(paymentsIn, { compact: true })} sub={`${money(distributionsOut, { compact: true })} to investors`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Pipeline funnel">
          <table className="w-full text-[13px]">
            <tbody>
              {[
                ["Leads captured", totalLeads],
                ["Converted to deals", converted],
                ["Funded", funded],
                ["Dead / disqualified", dead],
              ].map(([label, n]) => (
                <tr key={String(label)}>
                  <td className="td">{label}</td>
                  <td className="td tabular-nums text-right font-medium text-ink">{n}</td>
                  <td className="td w-1/2">
                    <div className="h-2 rounded-full bg-line3 overflow-hidden">
                      <div className="h-full bg-brand" style={{ width: `${totalLeads ? Math.round((Number(n) / totalLeads) * 100) : 0}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-2xs text-faint mt-2">Sources: {Object.entries(leads.reduce<Record<string, number>>((a, l) => { a[l.source] = (a[l.source] ?? 0) + 1; return a; }, {})).map(([s, n]) => `${s} ${n}`).join(" · ")}</p>
        </Section>

        <Section title="Cycle time — avg days in stage (find the bottleneck)">
          {cycle.length === 0 ? (
            <Empty text="Not enough stage history yet." />
          ) : (
            <table className="w-full text-[13px]">
              <tbody>
                {cycle.slice(0, 8).map((c) => (
                  <tr key={c.stage}>
                    <td className="td">{STAGE_LABELS[c.stage] ?? c.stage}</td>
                    <td className="td tabular-nums text-right">{c.avg.toFixed(1)}d</td>
                    <td className="td w-1/2">
                      <div className="h-2 rounded-full bg-line3 overflow-hidden">
                        <div className={`h-full ${c.avg > 7 ? "bg-bronze" : "bg-brand"}`} style={{ width: `${Math.min(100, (c.avg / Math.max(...cycle.map((x) => x.avg))) * 100)}%` }} />
                      </div>
                    </td>
                    <td className="td text-2xs text-faint">n={c.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Book by pathway">
          <table className="w-full text-[13px]">
            <tbody>
              {byType.map((t) => (
                <tr key={t.type}>
                  <td className="td"><span className="kcode">{t.type}</span></td>
                  <td className="td tabular-nums">{t.count} loans</td>
                  <td className="td tabular-nums text-right">{money(t.amount, { compact: true })}</td>
                  <td className="td w-1/2">
                    <div className="h-2 rounded-full bg-line3 overflow-hidden">
                      <div className="h-full bg-brand" style={{ width: `${(t.amount / maxType) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Geographic concentration (40% single-state limit)">
          {byState.length === 0 ? (
            <Empty text="No funded book yet." />
          ) : (
            <table className="w-full text-[13px]">
              <tbody>
                {byState.map(([state, amt]) => {
                  const share = outstanding > 0 ? (amt / outstanding) * 100 : 0;
                  return (
                    <tr key={state}>
                      <td className="td font-mono">{state}</td>
                      <td className="td tabular-nums text-right">{money(amt, { compact: true })}</td>
                      <td className="td tabular-nums">{share.toFixed(0)}%</td>
                      <td className="td w-1/2">
                        <div className="h-2 rounded-full bg-line3 overflow-hidden">
                          <div className={`h-full ${share > 40 ? "bg-oxide" : "bg-brand"}`} style={{ width: `${share}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Section>
      </div>
    </div>
  );
}
