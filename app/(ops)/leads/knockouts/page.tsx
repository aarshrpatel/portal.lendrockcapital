import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession, can } from "@/lib/auth";
import { money } from "@/lib/format";
import { Section, PageHeader, Empty } from "@/components/ui";
import { KNOCKOUT_FIELDS, KNOCKOUT_OPS } from "@/lib/domain/scoring";
import { createKnockoutRule, updateKnockoutRule, toggleKnockoutRule, deleteKnockoutRule } from "@/app/actions";

// Knockout criteria manager (Module 01 §4.4) — config surface, PRIN/ADMIN
// only. Reached from the Leads page, not the sidebar: it's a tuning panel,
// not a daily destination.

function FieldSelect({ name, defaultValue }: { name: string; defaultValue?: string }) {
  return (
    <select name={name} className="input" defaultValue={defaultValue ?? "amount_cents"}>
      {KNOCKOUT_FIELDS.map((f) => (
        <option key={f.code} value={f.code}>
          {f.label}{f.collected ? "" : " (not on intake yet)"}
        </option>
      ))}
    </select>
  );
}

function OpSelect({ name, defaultValue }: { name: string; defaultValue?: string }) {
  return (
    <select name={name} className="input" defaultValue={defaultValue ?? "LT"}>
      {KNOCKOUT_OPS.map((o) => (
        <option key={o.code} value={o.code}>{o.label}</option>
      ))}
    </select>
  );
}

function displayValue(field: string, op: string, value: string): string {
  const spec = KNOCKOUT_FIELDS.find((f) => f.code === field);
  if (spec?.kind === "money" && (op === "LT" || op === "GT")) {
    const n = Number(value);
    return Number.isFinite(n) ? String(n / 100) : value;
  }
  return value;
}

export default async function KnockoutRulesPage() {
  const user = await getSession();
  if (!user || !can(user, "config.write")) redirect("/leads");

  const [rules, licensedCount] = await Promise.all([
    db.knockoutRule.findMany({ orderBy: { createdAt: "asc" } }),
    db.licensingMatrix.count({ where: { licensed: true } }),
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Lead knockout rules"
        sub="Hard DQ criteria evaluated on every new lead — first active match kills it with the code below. Rules are data: change them here, no deploy."
        action={<Link href="/leads" className="btn">← Back to leads</Link>}
      />

      <Section title="Structural rule — state licensing">
        <p className="text-[13.5px] text-body">
          Leads from states without an active license are auto-DQ&apos;d as{" "}
          <span className="kcode kcode-dead">DQ_EXCLUDED_STATE</span> before any rule below runs.
          That check is driven by the licensing matrix ({licensedCount} licensed states,{" "}
          <Link href="/settings" className="text-brand hover:underline">managed in Configuration</Link>)
          — it&apos;s compliance data, not an editable rule.
        </p>
      </Section>

      <Section title={`Rules — ${rules.length} (first match wins, oldest first)`}>
        {rules.length === 0 ? (
          <Empty text="No knockout rules — every lead passes intake. Add one below." />
        ) : (
          <ul className="divide-y divide-line3">
            {rules.map((r) => (
              <li key={r.id} className="py-3">
                <form action={updateKnockoutRule.bind(null, r.id)} className="grid md:grid-cols-[130px_1fr] gap-3 items-start">
                  <div className="pt-2">
                    <span className={`kcode ${r.active ? "kcode-dead" : ""}`} title={r.active ? "Active" : "Paused"}>{r.code}</span>
                    {!r.active ? <span className="block text-2xs text-faint mt-1">paused</span> : null}
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr_2fr_auto] gap-2 items-center">
                    <FieldSelect name="field" defaultValue={r.field} />
                    <OpSelect name="op" defaultValue={r.op} />
                    <input
                      name="value"
                      defaultValue={displayValue(r.field, r.op, r.value)}
                      placeholder="value · comma list · $ for amounts"
                      className="input font-mono text-[12.5px]"
                    />
                    <input name="label" defaultValue={r.label} required placeholder="Decline reason" className="input" />
                    <div className="flex gap-1.5 col-span-2 lg:col-span-1">
                      <button className="btn py-1">Save</button>
                      <button formAction={toggleKnockoutRule.bind(null, r.id)} className="btn py-1">
                        {r.active ? "Pause" : "Resume"}
                      </button>
                      <button formAction={deleteKnockoutRule.bind(null, r.id)} className="btn btn-danger py-1">
                        Delete
                      </button>
                    </div>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
        <p className="text-2xs text-faint mt-3 leading-relaxed">
          Unknown values never DQ — a rule on a field the lead didn&apos;t provide simply doesn&apos;t fire
          (same principle as the credit box). Fields marked &ldquo;not on intake yet&rdquo; are legal to rule on
          but stay dormant until the intake forms collect them. Deleting a rule doesn&apos;t touch leads it
          already killed; their DQ code is stamped on the lead.
        </p>
      </Section>

      <Section title="Add a rule">
        <form action={createKnockoutRule} className="grid grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr_2fr_1.2fr_auto] gap-2 items-center">
          <FieldSelect name="field" />
          <OpSelect name="op" />
          <input name="value" placeholder="e.g. 25000 · TX,OK · ASAP" className="input font-mono text-[12.5px]" />
          <input name="label" required placeholder="Decline reason (shown in the DQ notice)" className="input" />
          <input name="code" placeholder="Code (optional, DQ_…)" className="input font-mono text-[12.5px] uppercase" />
          <button className="btn btn-primary justify-center py-1.5">Add rule</button>
        </form>
        <p className="text-2xs text-faint mt-3">
          Amounts are entered in dollars. Lists are comma-separated codes (case-insensitive).
          Leave the code blank to derive it from the reason. Every change is audited.
        </p>
      </Section>
    </div>
  );
}
