import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { money, rate, dt, ago } from "@/lib/format";
import { activateInvestor } from "@/app/actions";
import { Section, Stat, StatusPill, TypeBadge, Empty, Avatar } from "@/components/ui";
import { capitalRow } from "@/lib/domain/capital";

export default async function InvestorDetail({ params }: { params: { id: string } }) {
  const investor = await db.investor.findUnique({
    where: { id: params.id },
    include: {
      participations: { include: { deal: { include: { company: { select: { legalName: true } } } } }, orderBy: { committedAt: "desc" } },
      transactions: { orderBy: { date: "desc" }, take: 15 },
    },
  });
  if (!investor) notFound();

  const row = capitalRow(investor, investor.participations);

  return (
    <div className="grid gap-4">
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
          <Avatar name={investor.name} size={44} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="kcode">{investor.type}</span>
              <StatusPill status={investor.status} />
              <span className="text-2xs text-muted">
                accreditation{" "}
                <span className={`font-mono ${investor.accreditationStatus === "NONE" || investor.accreditationStatus === "EXPIRED" ? "text-bronze" : "text-brand"}`}>
                  {investor.accreditationStatus.replace(/_/g, " ").toLowerCase()}
                </span>
              </span>
            </div>
            <h1 className="h-serif text-[25px] font-semibold leading-tight mt-0.5 truncate">{investor.name}</h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {investor.status !== "ACTIVE" ? (
              <form action={activateInvestor.bind(null, investor.id)}>
                <button className="btn btn-primary">Activate — accreditation + OFAC + master agreement</button>
              </form>
            ) : (
              <>
                <span className="text-2xs text-faint text-right leading-relaxed">
                  refresh due {dt(investor.accreditationExpires)}
                  <br />
                  {investor.email || "no email on file"}
                </span>
                <Link href={`/i/${investor.portalToken}`} className="btn">
                  Investor portal ↗
                </Link>
              </>
            )}
          </div>
        </div>
        {investor.status !== "ACTIVE" ? (
          <p className="px-5 py-2.5 border-t border-line2 bg-bronze-tint/60 text-[12.5px] text-bronze font-medium">
            Onboarding incomplete — this investor can&apos;t be matched to deals until ACTIVE.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Available" value={money(investor.capitalAvailableCents, { compact: true })} />
        <Stat label="Committed, not wired" value={money(row.committedNotWiredCents, { compact: true })} />
        <Stat label="Deployed" value={money(row.deployedCents, { compact: true })} sub={row.blendedYieldBps ? `blended ${rate(row.blendedYieldBps)}` : undefined} />
        <Stat label="Headroom" value={money(row.headroomCents, { compact: true })} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid gap-4 content-start">
          <Section title="Participations">
            {investor.participations.length === 0 ? (
              <Empty text="No deal participations yet." />
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr><th className="th">Deal</th><th className="th">Borrower</th><th className="th">Committed</th><th className="th">Funded</th><th className="th">Rate</th><th className="th">Status</th></tr>
                </thead>
                <tbody>
                  {investor.participations.map((p) => (
                    <tr key={p.id}>
                      <td className="td">
                        <Link href={`/deals/${p.deal.id}?tab=capital`} className="font-mono text-[12px] text-brand hover:underline">{p.deal.dealNumber}</Link>{" "}
                        <TypeBadge dealType={p.deal.dealType} />
                      </td>
                      <td className="td text-ink">{p.deal.company.legalName}</td>
                      <td className="td tabular-nums">{money(p.committedCents)}</td>
                      <td className="td tabular-nums">{money(p.fundedCents)}</td>
                      <td className="td tabular-nums">{rate(p.rateBps)}</td>
                      <td className="td"><StatusPill status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="Transactions">
            {investor.transactions.length === 0 ? (
              <Empty text="No money movement yet." />
            ) : (
              <ul className="divide-y divide-line3">
                {investor.transactions.map((t) => (
                  <li key={t.id} className="py-2 flex items-center gap-3 text-[13px]">
                    <span className={`font-mono text-2xs ${t.direction === "IN" ? "text-brand" : "text-oxide"}`}>{t.direction}</span>
                    <span>{t.type.replace(/_/g, " ")}</span>
                    <span className="text-2xs text-faint">{t.memo}</span>
                    <span className="ml-auto tabular-nums">{money(t.amountCents)}</span>
                    <StatusPill status={t.status} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <Section title="Preferences (drive deal matching)">
          <dl className="grid gap-y-3 text-[13.5px]">
            <div><dt className="label">Deal types</dt><dd className="font-mono text-[12.5px]">{investor.prefDealTypes}</dd></div>
            <div><dt className="label">States</dt><dd className="font-mono text-[12.5px]">{investor.prefStates || "any"}</dd></div>
            <div><dt className="label">Check size</dt><dd>{money(investor.prefMinCents, { compact: true })} – {money(investor.prefMaxCents, { compact: true })}</dd></div>
            <div><dt className="label">Target yield</dt><dd>{rate(investor.prefTargetYieldBps)}</dd></div>
            <div><dt className="label">Max LTV</dt><dd>{(investor.prefMaxLtvBps / 100).toFixed(0)}%</dd></div>
            <div><dt className="label">OFAC</dt><dd><StatusPill status={investor.ofacStatus === "CLEAR" ? "PASS" : "PENDING"} /></dd></div>
            <div><dt className="label">Contact</dt><dd className="text-muted">{investor.email || "—"}</dd></div>
          </dl>
        </Section>
      </div>
    </div>
  );
}
