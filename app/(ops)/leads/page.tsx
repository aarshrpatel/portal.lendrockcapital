import Link from "next/link";
import { db } from "@/lib/db";
import { getSession, can } from "@/lib/auth";
import { money, ago } from "@/lib/format";
import { quickAddLead } from "@/app/actions";
import { Section, StatusPill, TypeBadge, PageHeader } from "@/components/ui";
import { USE_OF_FUNDS_OPTIONS, TIMELINE_OPTIONS, CREDIT_OPTIONS, INDUSTRY_OPTIONS } from "@/lib/enums";

export default async function LeadsPage({ searchParams }: { searchParams: { stage?: string } }) {
  const stageFilter = searchParams.stage;
  const user = await getSession();
  const leads = await db.lead.findMany({
    where: stageFilter ? { stage: stageFilter } : {},
    orderBy: [{ createdAt: "desc" }],
    take: 100,
  });

  const counts = await db.lead.groupBy({ by: ["stage"], _count: true });
  const countOf = (s: string) => counts.find((c) => c.stage === s)?._count ?? 0;

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Leads"
        sub="Capture-first: every submission scores, classifies, and routes itself. Your job is the human touch inside the SLA."
        action={
          <div className="flex items-center gap-2">
            {user && can(user, "config.write") ? (
              <Link href="/leads/knockouts" className="btn whitespace-nowrap" title="Manage auto-DQ criteria">
                Knockout rules
              </Link>
            ) : null}
            <div className="flex rounded-md border border-line overflow-hidden">
            {["", "NEW_LEAD", "CONTACTED", "QUALIFIED", "CONVERTED", "DEAD"].map((s) => (
              <Link
                key={s || "all"}
                href={s ? `/leads?stage=${s}` : "/leads"}
                className={`px-2.5 py-1.5 text-[12.5px] font-medium border-r border-line last:border-r-0 whitespace-nowrap ${
                  (stageFilter ?? "") === s ? "bg-brand text-white" : "bg-card text-muted hover:text-ink"
                }`}
              >
                {s ? s.replace(/_/g, " ") : "All"}
                {s ? <span className="font-mono text-2xs ml-1 opacity-70">{countOf(s)}</span> : null}
              </Link>
            ))}
            </div>
          </div>
        }
      />

      <Section title="30-second quick add (phone / broker / event)">
        <form action={quickAddLead} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <input name="firstName" required placeholder="First name" className="input" />
          <input name="lastName" required placeholder="Last name" className="input" />
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="Phone"
            pattern="[0-9()+._ -]{10,20}"
            title="Enter a valid 10-digit phone number"
            className="input"
          />
          <input name="email" type="email" placeholder="Email" title="Enter a valid email address" className="input" />
          <input name="companyName" placeholder="Company" className="input" />
          <input name="state" placeholder="State (e.g. TX)" maxLength={2} className="input font-mono uppercase" />
          <select name="useOfFunds" className="input" defaultValue="">
            <option value="" disabled>
              Use of funds…
            </option>
            {USE_OF_FUNDS_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
          <input name="amount" type="number" placeholder="Amount ($)" className="input" />
          <select name="fundingTimeline" className="input" defaultValue="UNDER_30D">
            {TIMELINE_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
          <select name="creditStated" className="input" defaultValue="UNKNOWN">
            {CREDIT_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
          <select name="industry" className="input" defaultValue="">
            <option value="">Industry…</option>
            {INDUSTRY_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
          <select name="purpose" className="input" defaultValue="BUSINESS" title="Consumer-purpose requests auto-DQ — business-purpose lending only">
            <option value="BUSINESS">Business purpose</option>
            <option value="CONSUMER">Consumer purpose</option>
          </select>
          <select name="source" className="input" defaultValue="QUICK_ADD">
            <option value="QUICK_ADD">Phone</option>
            <option value="BROKER">Broker</option>
            <option value="REFERRAL">Referral</option>
            <option value="EVENT">Event</option>
          </select>
          <button className="btn btn-primary justify-center">Add lead</button>
        </form>
      </Section>

      <div className="card overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr>
              <th className="th">Lead</th>
              <th className="th">Pathway</th>
              <th className="th">Amount</th>
              <th className="th">Stage</th>
              <th className="th">Source</th>
              <th className="th">State</th>
              <th className="th">Age</th>
              <th className="th">First touch</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-brand-tint/20">
                <td className="td">
                  <Link href={`/leads/${l.id}`} className="font-medium text-brand hover:underline">
                    {l.firstName} {l.lastName}
                  </Link>
                  {l.companyName ? <span className="text-faint"> · {l.companyName}</span> : null}
                </td>
                <td className="td">{l.dealType ? <TypeBadge dealType={l.dealType} /> : <span className="text-faint">—</span>}</td>
                <td className="td tabular-nums">{money(l.amountCents, { compact: true })}</td>
                <td className="td">
                  <StatusPill status={l.stage === "DEAD" && l.dqCode ? "FAIL" : l.stage} />
                  {l.dqCode ? <span className="kcode kcode-dead ml-1">{l.dqCode}</span> : null}
                </td>
                <td className="td text-muted">{l.source}</td>
                <td className="td font-mono text-[12px]">{l.state || "—"}</td>
                <td className="td text-muted">{ago(l.createdAt)}</td>
                <td className="td">
                  {l.firstTouchAt ? (
                    <span className="text-muted">{ago(l.firstTouchAt)}</span>
                  ) : l.stage === "NEW_LEAD" ? (
                    <span className="pill bg-oxide-tint text-oxide font-mono">SLA CLOCK</span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
