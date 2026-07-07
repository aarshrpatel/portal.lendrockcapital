import Link from "next/link";
import { db } from "@/lib/db";
import { money, rate, dt } from "@/lib/format";
import { addInvestor, runDistributionBatch } from "@/app/actions";
import { Section, Stat, StatusPill, Empty, PageHeader } from "@/components/ui";
import { capitalRow } from "@/lib/domain/capital";

export default async function InvestorsPage() {
  const [investors, participations, pendingDistributions] = await Promise.all([
    db.investor.findMany({ orderBy: { name: "asc" } }),
    db.participation.findMany(),
    db.transaction.findMany({ where: { type: "DISTRIBUTION", status: "INITIATED" } }),
  ]);

  const rows = investors.map((inv) => capitalRow(inv, participations));
  const totalAvailable = rows.reduce((s, r) => s + r.investor.capitalAvailableCents, 0);
  const totalDeployed = rows.reduce((s, r) => s + r.deployedCents, 0);
  const totalCommittedNotWired = rows.reduce((s, r) => s + r.committedNotWiredCents, 0);
  const dryPowder = rows.reduce((s, r) => s + r.headroomCents, 0);
  const pendingTotal = pendingDistributions.reduce((s, t) => s + t.amountCents, 0);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Capital"
        sub="Investor lifecycle, allocation, and the utilization model: headroom = stated capital − committed-not-wired; deployed tracked separately."
        action={
          pendingDistributions.length > 0 ? (
            <form action={runDistributionBatch}>
              <button className="btn btn-primary">
                Run distribution batch — {pendingDistributions.length} payouts · {money(pendingTotal)}
              </button>
            </form>
          ) : (
            <span className="text-2xs text-faint">Distribution batch: monthly on the 10th · none pending</span>
          )
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Dry powder" value={money(dryPowder, { compact: true })} sub="available − committed-not-wired" />
        <Stat label="Deployed" value={money(totalDeployed, { compact: true })} sub="wired into active deals" />
        <Stat label="Committed, not wired" value={money(totalCommittedNotWired, { compact: true })} sub="soft commit → signed" />
        <Stat label="Stated capital" value={money(totalAvailable, { compact: true })} sub={`${investors.filter((i) => i.status === "ACTIVE").length} active investors`} />
      </div>

      <Section title="Capital utilization — per investor (Module 07 §5 canonical model)">
        {rows.length === 0 ? (
          <Empty text="No investors yet." />
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr>
                <th className="th">Investor</th><th className="th">Status</th><th className="th">Available</th>
                <th className="th">Committed (not wired)</th><th className="th">Deployed</th>
                <th className="th">Headroom</th><th className="th">Blended yield</th><th className="th">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const utilization = r.investor.capitalAvailableCents > 0
                  ? Math.min(100, Math.round((r.deployedCents / (r.deployedCents + r.investor.capitalAvailableCents)) * 100))
                  : 0;
                return (
                  <tr key={r.investor.id}>
                    <td className="td">
                      <Link href={`/investors/${r.investor.id}`} className="font-medium text-brand hover:underline">{r.investor.name}</Link>
                      <span className="block text-2xs text-faint">{r.investor.type} · prefers {r.investor.prefDealTypes}</span>
                    </td>
                    <td className="td"><StatusPill status={r.investor.status} /></td>
                    <td className="td tabular-nums">{money(r.investor.capitalAvailableCents, { compact: true })}</td>
                    <td className="td tabular-nums">{money(r.committedNotWiredCents, { compact: true })}</td>
                    <td className="td tabular-nums">{money(r.deployedCents, { compact: true })}</td>
                    <td className="td tabular-nums font-medium text-ink">{money(r.headroomCents, { compact: true })}</td>
                    <td className="td tabular-nums">{r.blendedYieldBps ? rate(r.blendedYieldBps) : "—"}</td>
                    <td className="td w-40">
                      <div className="h-2 rounded-full bg-line3 overflow-hidden">
                        <div className="h-full bg-brand" style={{ width: `${utilization}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Add investor (onboarding: PROSPECT → ONBOARDING → ACTIVE)">
        <form action={addInvestor} className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <input name="name" required placeholder="Name / entity" className="input md:col-span-2" />
          <input name="email" placeholder="Email" className="input" />
          <select name="type" className="input">
            <option value="INDIVIDUAL">Individual</option>
            <option value="ENTITY">Entity</option>
          </select>
          <input name="capital" type="number" placeholder="Capital available ($)" className="input" />
          <input name="prefDealTypes" placeholder="Prefers (HM,BB)" defaultValue="HM,BB" className="input font-mono" />
          <div className="md:col-span-6">
            <button className="btn btn-primary">Create — sends onboarding invite</button>
            <span className="text-2xs text-faint ml-3">
              506(b) posture: self-certified accreditation with annual refresh; deals visible only to logged-in ACTIVE investors.
            </span>
          </div>
        </form>
      </Section>
    </div>
  );
}
