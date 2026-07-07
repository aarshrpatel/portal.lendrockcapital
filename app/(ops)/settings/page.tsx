import { db } from "@/lib/db";
import { Section, StatusPill, PageHeader } from "@/components/ui";
import { WC_SETTINGS } from "@/lib/domain/wc";
import { money, pct } from "@/lib/format";

export default async function SettingsPage() {
  const [rules, licensing, deadReasons, users] = await Promise.all([
    db.creditBoxRule.findMany({ orderBy: [{ dealType: "asc" }, { subType: "asc" }] }),
    db.licensingMatrix.findMany({ orderBy: { state: "asc" } }),
    db.deadReason.findMany(),
    db.user.findMany({ orderBy: { role: "asc" } }),
  ]);

  const fmtValue = (field: string, v: number) =>
    field.endsWith("_bps") ? pct(v) : field.endsWith("_cents") ? money(v, { compact: true }) : String(v);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Configuration"
        sub="Structure is fixed; numbers are config. Credit-box rules, licensing, and reason codes are data — PRIN re-tunes quarterly without code changes."
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <Section title={`Credit-box rules — ${rules.length} (rules-as-data)`}>
          <table className="w-full text-[13px]">
            <thead>
              <tr><th className="th">Type</th><th className="th">Guardrail</th><th className="th">Bound</th><th className="th">Severity</th></tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td className="td"><span className="kcode">{r.dealType}{r.subType ? `·${r.subType.split("_").pop()}` : ""}</span></td>
                  <td className="td">{r.label}</td>
                  <td className="td font-mono text-[12px]">{r.op === "LTE" ? "≤" : "≥"} {fmtValue(r.field, r.value)}</td>
                  <td className="td"><StatusPill status={r.severity === "HARD" ? "FAIL" : "PENDING"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <div className="grid gap-4 content-start">
          <Section title="WC engine settings">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13.5px]">
              <div><dt className="label">Limit factor</dt><dd>{pct(WC_SETTINGS.limitFactorBps)} of T6M avg revenue</dd></div>
              <div><dt className="label">Floor / cap</dt><dd>{money(WC_SETTINGS.floorCents)} / {money(WC_SETTINGS.houseCapCents)}</dd></div>
              <div><dt className="label">Draw auto-approve</dt><dd>≤ min({money(WC_SETTINGS.autoApproveMaxCents)}, 25% of limit)</dd></div>
              <div><dt className="label">Same-day cutoff</dt><dd>{WC_SETTINGS.sameDayCutoffHourEt}:00 ET</dd></div>
              <div><dt className="label">Tier pricing</dt><dd className="font-mono text-[12px]">A 14.5% · B 17.5% · C 21.0%</dd></div>
              <div><dt className="label">Statements haircut</dt><dd>× 0.85 (no bank link)</dd></div>
            </dl>
          </Section>

          <Section title="Team">
            <ul className="divide-y divide-line3">
              {users.map((u) => (
                <li key={u.id} className="py-2 flex items-center gap-3 text-[13.5px]">
                  <span className="kcode">{u.role}</span>
                  <span className="text-ink">{u.name}</span>
                  <span className="text-2xs text-faint ml-auto">{u.email}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title={`Dead-reason taxonomy — ${deadReasons.length} codes`}>
            <div className="flex flex-wrap gap-1.5">
              {deadReasons.map((r) => (
                <span key={r.code} className="kcode kcode-dead" title={r.label}>
                  {r.code}
                </span>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
