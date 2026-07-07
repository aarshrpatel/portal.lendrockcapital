import Link from "next/link";
import { db } from "@/lib/db";
import { dt, ago } from "@/lib/format";
import { Section, StatusPill, Empty, PageHeader } from "@/components/ui";

export default async function CompliancePage() {
  const [openChecks, licensing, screens] = await Promise.all([
    db.complianceCheck.findMany({
      where: { status: { in: ["PENDING", "FAIL", "BLOCKED"] } },
      include: { deal: { include: { company: { select: { legalName: true } } } } },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    }),
    db.licensingMatrix.findMany({ orderBy: { state: "asc" } }),
    db.ofacScreen.findMany({ orderBy: { screenedAt: "desc" }, take: 12 }),
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Compliance ops"
        sub="Compliance is code, not a binder: license checks gate the credit box, OFAC re-scans block the wire button, and adverse-action timers enforce Reg B deadlines."
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid gap-4 content-start">
          <Section title={`Open checks — ${openChecks.length}`}>
            {openChecks.length === 0 ? (
              <Empty text="No open compliance items." />
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr><th className="th">Check</th><th className="th">Deal</th><th className="th">Status</th><th className="th">Detail</th><th className="th">Due</th></tr>
                </thead>
                <tbody>
                  {openChecks.map((c) => (
                    <tr key={c.id}>
                      <td className="td font-mono text-[11.5px]">{c.checkType}</td>
                      <td className="td">
                        <Link href={`/deals/${c.deal.id}`} className="text-brand hover:underline">{c.deal.dealNumber}</Link>
                        <span className="block text-2xs text-faint">{c.deal.company.legalName}</span>
                      </td>
                      <td className="td"><StatusPill status={c.status} /></td>
                      <td className="td text-muted max-w-md">{c.detail}</td>
                      <td className="td">{c.dueAt ? <span className={c.dueAt < new Date() ? "text-oxide font-medium" : ""}>{dt(c.dueAt)}</span> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="Recent OFAC screens">
            <ul className="divide-y divide-line3">
              {screens.map((s) => (
                <li key={s.id} className="py-2 flex items-center gap-3 text-[13px]">
                  <span className="kcode">{s.partyType}</span>
                  <span className="text-ink">{s.partyName}</span>
                  <span className="text-2xs text-faint">{s.context}</span>
                  <StatusPill status={s.result === "CLEAR" ? "PASS" : "FAIL"} />
                  <span className="text-2xs text-faint ml-auto">{ago(s.screenedAt)}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <Section title="Licensing matrix">
          <p className="text-2xs text-faint mb-2">A state with no row (or licensed = no) cannot pass the credit box — blocked by design.</p>
          <table className="w-full text-[13px]">
            <thead>
              <tr><th className="th">State</th><th className="th">Licensed</th><th className="th">CFDL</th></tr>
            </thead>
            <tbody>
              {licensing.map((l) => (
                <tr key={l.state}>
                  <td className="td font-mono">{l.state}</td>
                  <td className="td">
                    <StatusPill status={l.licensed ? "PASS" : "FAIL"} />
                    <span className="block text-2xs text-faint">{l.licenseType || l.notes}</span>
                  </td>
                  <td className="td">{l.cfdlRequired ? <span className="kcode kcode-warn">DISCLOSURE</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
    </div>
  );
}
