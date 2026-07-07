import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { money, rate, dt } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/enums";
import { capitalRow } from "@/lib/domain/capital";

// Investor surface — 506(b)-gated: deals are visible only to onboarded
// investors with a pre-existing relationship; nothing here is public.

export default async function InvestorPortal({ params }: { params: { token: string } }) {
  const investor = await db.investor.findUnique({
    where: { portalToken: params.token },
    include: {
      participations: {
        include: { deal: { include: { company: { select: { legalName: true } } } } },
        orderBy: { committedAt: "desc" },
      },
      transactions: { where: { type: "DISTRIBUTION" }, orderBy: { date: "desc" }, take: 12 },
    },
  });
  if (!investor) notFound();

  const row = capitalRow(investor, investor.participations);
  const activeParts = investor.participations.filter((p) => ["WIRED", "ACTIVE"].includes(p.status));
  const upcomingMaturities = activeParts
    .filter((p) => p.deal.maturityDate)
    .sort((a, b) => (a.deal.maturityDate!.getTime() - b.deal.maturityDate!.getTime()));

  return (
    <div className="min-h-screen bg-page">
      <header className="portal-hero text-white">
        <div className="max-w-4xl mx-auto px-5 pt-5 pb-12">
          <div className="flex items-center gap-2">
            <span className="font-serif text-[17px] font-semibold tracking-tight">Lendrock Capital</span>
            <span className="font-mono text-[9.5px] text-white/45 uppercase tracking-[0.2em] ml-2 mt-0.5">Investor Portal</span>
          </div>
          <p className="font-serif text-[24px] font-semibold tracking-tight mt-6">{investor.name}</p>
          <p className="text-[13px] text-white/60 mt-1">
            Your capital, position by position — statements and 1099-INT land here every January.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 pb-8 grid gap-4 animate-fadeUp -mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["Deployed", money(row.deployedCents, { compact: true })],
            ["Committed", money(row.committedNotWiredCents, { compact: true })],
            ["Blended yield", row.blendedYieldBps ? rate(row.blendedYieldBps) : "—"],
            ["Active deals", String(activeParts.length)],
          ].map(([l, v]) => (
            <div key={l} className="card shadow-raised px-4 py-3.5">
              <div className="label">{l}</div>
              <div className="font-serif text-[23px] text-ink tabular-nums leading-tight mt-1">{v}</div>
            </div>
          ))}
        </div>

        <div className="card p-5">
          <h2 className="label mb-3">Your positions</h2>
          {investor.participations.length === 0 ? (
            <p className="text-[13px] text-faint">No positions yet — you&apos;ll see deal invitations here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr>
                    <th className="th">Deal</th><th className="th">Status</th><th className="th">Your commitment</th>
                    <th className="th">Funded</th><th className="th">Your rate</th><th className="th">Deal stage</th><th className="th">Maturity</th>
                  </tr>
                </thead>
                <tbody>
                  {investor.participations.map((p) => (
                    <tr key={p.id}>
                      <td className="td">
                        <span className="font-medium text-ink">{p.deal.company.legalName}</span>
                        <span className="block font-mono text-2xs text-faint">{p.deal.dealNumber} · {p.deal.dealType}</span>
                      </td>
                      <td className="td"><span className="kcode">{p.status}</span></td>
                      <td className="td tabular-nums">{money(p.committedCents)}</td>
                      <td className="td tabular-nums">{money(p.fundedCents)}</td>
                      <td className="td tabular-nums">{rate(p.rateBps)}</td>
                      <td className="td text-muted">{STAGE_LABELS[p.deal.stage] ?? p.deal.stage}</td>
                      <td className="td">{dt(p.deal.maturityDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-5">
            <h2 className="label mb-3">Distributions</h2>
            {investor.transactions.length === 0 ? (
              <p className="text-[13px] text-faint">Distributions appear here after your first funded deal pays interest. Batches settle on the 10th.</p>
            ) : (
              <ul className="divide-y divide-line3">
                {investor.transactions.map((t) => (
                  <li key={t.id} className="py-2 flex items-center gap-2 text-[13px]">
                    <span className="tabular-nums font-medium text-ink">{money(t.amountCents)}</span>
                    <span className="text-2xs text-muted">{t.status === "SETTLED" ? "paid" : "accrued — pays on the 10th"}</span>
                    <span className="text-2xs text-faint ml-auto">{dt(t.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card p-5">
            <h2 className="label mb-3">Upcoming maturities</h2>
            {upcomingMaturities.length === 0 ? (
              <p className="text-[13px] text-faint">No active positions with maturity dates.</p>
            ) : (
              <ul className="divide-y divide-line3">
                {upcomingMaturities.map((p) => (
                  <li key={p.id} className="py-2 flex items-center gap-2 text-[13px]">
                    <span className="text-ink">{p.deal.company.legalName}</span>
                    <span className="tabular-nums text-2xs text-muted">{money(p.fundedCents, { compact: true })}</span>
                    <span className="ml-auto font-mono text-2xs">{dt(p.deal.maturityDate)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <p className="text-2xs text-faint text-center py-4">
          Accreditation on file{investor.accreditationExpires ? ` · annual refresh due ${dt(investor.accreditationExpires)}` : ""}. Statements and 1099-INT are delivered here each January.
        </p>
      </main>
    </div>
  );
}
