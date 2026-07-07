import { db } from "@/lib/db";
import { Section, StatusPill, PageHeader } from "@/components/ui";

const CATEGORY_LABELS: Record<string, string> = {
  APPLICATION: "A · Application & intake",
  TERM_SHEET: "B · Term sheets & credit letters",
  LEGAL: "C · Legal instruments",
  SERVICING: "D · Servicing & post-close",
  CAPITAL: "E · Capital markets",
  PARTNER: "F · Partner & broker",
  SEQUENCE: "G · Email/SMS sequences",
};

export default async function TemplatesPage() {
  const templates = await db.template.findMany({ orderBy: [{ category: "asc" }, { code: "asc" }] });
  const grouped = Object.keys(CATEGORY_LABELS).map((cat) => ({
    cat,
    items: templates.filter((t) => t.category === cat),
  }));

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Template library"
        sub="Every document renders from the shared merge-variable dictionary — templates never drift from deal data. Versioned; deals pin what they rendered; ⚖️ items carry attorney review."
      />

      {grouped.map((g) => (
        <Section key={g.cat} title={`${CATEGORY_LABELS[g.cat]} — ${g.items.length}`}>
          <table className="w-full text-[13px]">
            <thead>
              <tr>
                <th className="th">Code</th><th className="th">Template</th><th className="th">Deal types</th>
                <th className="th">Delivery</th><th className="th">Version</th><th className="th">Review</th>
              </tr>
            </thead>
            <tbody>
              {g.items.map((t) => (
                <tr key={t.id}>
                  <td className="td font-mono text-[11.5px]">{t.code}</td>
                  <td className="td font-medium text-ink">{t.name}</td>
                  <td className="td"><span className="kcode">{t.dealTypes}</span></td>
                  <td className="td text-muted">{t.delivery}</td>
                  <td className="td font-mono text-[11.5px]">v{t.version}</td>
                  <td className="td">{t.attorneyReview ? <span className="kcode kcode-warn">⚖️ ATTORNEY</span> : <StatusPill status={t.active ? "ACTIVE" : "INACTIVE"} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ))}
    </div>
  );
}
