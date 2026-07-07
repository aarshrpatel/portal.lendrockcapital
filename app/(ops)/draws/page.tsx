import Link from "next/link";
import { db } from "@/lib/db";
import { money, ago } from "@/lib/format";
import { Section, StatusPill, Empty, PageHeader } from "@/components/ui";

export default async function DrawsPage() {
  const [hmDraws, wcDraws] = await Promise.all([
    db.drawRequest.findMany({
      where: { status: { in: ["REQUESTED", "INSPECTION_ORDERED", "INSPECTION_RECEIVED", "APPROVED"] } },
      include: { deal: { include: { company: { select: { legalName: true } } } } },
      orderBy: { requestedAt: "asc" },
    }),
    db.wcDraw.findMany({
      where: { status: { in: ["REQUESTED", "REVIEW"] } },
      include: { line: { include: { deal: { include: { company: { select: { legalName: true } } } } } } },
      orderBy: { requestedAt: "asc" },
    }),
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Draw queues"
        sub="HM rehab draws fund on inspected percent-complete (≤ 5bd request-to-wire). WC draws auto-approve under the cap; only flagged requests land here."
      />

      <Section title={`HM rehab draws in flight — ${hmDraws.length}`}>
        {hmDraws.length === 0 ? (
          <Empty text="No draws in the pipeline." />
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr><th className="th">Deal</th><th className="th">Borrower</th><th className="th">Amount</th><th className="th">Inspection</th><th className="th">Status</th><th className="th">Age</th></tr>
            </thead>
            <tbody>
              {hmDraws.map((d) => (
                <tr key={d.id}>
                  <td className="td">
                    <Link href={`/deals/${d.deal.id}?tab=servicing`} className="font-mono text-[12px] text-brand hover:underline">{d.deal.dealNumber}</Link>
                  </td>
                  <td className="td font-medium text-ink">{d.deal.company.legalName}</td>
                  <td className="td tabular-nums">{money(d.amountCents)}</td>
                  <td className="td">{d.inspectionPct > 0 ? `${d.inspectionPct}% supported` : "—"}</td>
                  <td className="td"><StatusPill status={d.status} /></td>
                  <td className="td text-muted">{ago(d.requestedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={`WC draws needing review — ${wcDraws.length}`}>
        {wcDraws.length === 0 ? (
          <Empty text="All WC draws auto-approved under the cap." />
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr><th className="th">Deal</th><th className="th">Borrower</th><th className="th">Amount</th><th className="th">Status</th><th className="th">Age</th></tr>
            </thead>
            <tbody>
              {wcDraws.map((d) => (
                <tr key={d.id}>
                  <td className="td">
                    <Link href={`/deals/${d.line.deal.id}?tab=servicing`} className="font-mono text-[12px] text-brand hover:underline">{d.line.deal.dealNumber}</Link>
                  </td>
                  <td className="td font-medium text-ink">{d.line.deal.company.legalName}</td>
                  <td className="td tabular-nums">{money(d.amountCents)}</td>
                  <td className="td"><StatusPill status={d.status} /></td>
                  <td className="td text-muted">{ago(d.requestedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
