import Link from "next/link";
import { db } from "@/lib/db";
import { money, ago } from "@/lib/format";
import { Section, StatusPill, TypeBadge, Empty, PageHeader } from "@/components/ui";

export default async function ApprovalsPage() {
  const [pending, recent] = await Promise.all([
    db.approval.findMany({
      where: { status: "PENDING" },
      include: {
        deal: { include: { company: { select: { legalName: true } } } },
        signoffs: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    db.approval.findMany({
      where: { status: { not: "PENDING" } },
      include: { deal: { include: { company: { select: { legalName: true } } } } },
      orderBy: { decidedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Approvals"
        sub="Tiered matrix: T1 UW solo · T2 UW + PRIN · T3 deal committee. Signoffs collect in parallel; any DECLINED terminates the deal with adverse action."
      />

      <Section title={`Pending — ${pending.length}`}>
        {pending.length === 0 ? (
          <Empty text="Nothing awaiting decision." />
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr>
                <th className="th">Deal</th><th className="th">Borrower</th><th className="th">Type</th>
                <th className="th">Amount</th><th className="th">Tier</th><th className="th">Signoffs</th><th className="th">Age</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((a) => (
                <tr key={a.id}>
                  <td className="td">
                    <Link href={`/deals/${a.deal.id}?tab=approvals`} className="text-brand font-mono text-[12px] hover:underline">
                      {a.deal.dealNumber}
                    </Link>
                  </td>
                  <td className="td font-medium text-ink">{a.deal.company.legalName}</td>
                  <td className="td"><TypeBadge dealType={a.deal.dealType} /> <span className="text-2xs text-faint">{a.type}</span></td>
                  <td className="td tabular-nums">{money(a.deal.amountCents)}</td>
                  <td className="td"><span className="pill bg-bronze-tint text-bronze font-mono">T{a.tier}</span></td>
                  <td className="td">
                    <div className="flex gap-1">
                      {a.signoffs.map((s) => (
                        <span key={s.id} className={`kcode ${s.decision === "PENDING" ? "" : s.decision.startsWith("APPROVED") ? "" : "kcode-dead"}`}
                          title={`${s.approverRole}: ${s.decision}`}>
                          {s.approverRole}{s.decision === "PENDING" ? "·⏳" : s.decision.startsWith("APPROVED") ? "·✓" : "·✕"}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="td text-muted">{ago(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Recently decided">
        {recent.length === 0 ? (
          <Empty text="No decisions yet." />
        ) : (
          <ul className="divide-y divide-line3">
            {recent.map((a) => (
              <li key={a.id} className="py-2 flex items-center gap-3 text-[13px]">
                <Link href={`/deals/${a.deal.id}?tab=approvals`} className="font-mono text-[12px] text-brand hover:underline">
                  {a.deal.dealNumber}
                </Link>
                <span className="text-ink">{a.deal.company.legalName}</span>
                <span className="tabular-nums text-muted">{money(a.deal.amountCents)}</span>
                <StatusPill status={a.status} />
                <span className="text-2xs text-faint ml-auto">{ago(a.decidedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
