import Link from "next/link";
import { db } from "@/lib/db";
import { money, daysIn } from "@/lib/format";
import { stagesFor, STAGE_LABELS, STAGE_OWNER, DEAL_TYPES } from "@/lib/enums";
import { TypeBadge, PageHeader } from "@/components/ui";

const TYPE_EDGE: Record<string, string> = {
  HM: "border-t-brand",
  BB: "border-t-[#3E5C7A]",
  WC: "border-t-[#6B5C9E]",
  SBA: "border-t-bronze",
};

export default async function PipelinePage({ searchParams }: { searchParams: { type?: string } }) {
  const type = searchParams.type && DEAL_TYPES.includes(searchParams.type as never) ? searchParams.type : "";
  const deals = await db.deal.findMany({
    where: {
      stage: { notIn: ["PAID_OFF", "DEAD", "DECLINED"] },
      ...(type ? { dealType: type } : {}),
    },
    include: {
      company: { select: { legalName: true } },
      tasks: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } }, select: { id: true } },
    },
    orderBy: { stageEnteredAt: "asc" },
  });

  const stages = type ? stagesFor(type) : stagesFor("HM");
  const columns = stages
    .filter((s) => s !== "PAID_OFF")
    .map((stage) => ({ stage, deals: deals.filter((d) => d.stage === stage) }));
  const unplaced = deals.filter((d) => !stages.includes(d.stage));

  const totalValue = deals.reduce((s, d) => s + d.amountCents, 0);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Pipeline"
        sub={
          type
            ? undefined
            : "Standard rail shown — SBA deals travel their packaging pipeline; filter to SBA for ENGAGED → LENDER_MATCHING → SUBMITTED."
        }
        action={
          <>
            <span className="text-[13px] text-muted tabular-nums mr-1">
              {deals.length} deals · {money(totalValue, { compact: true })}
            </span>
            <div className="flex rounded-md border border-line overflow-hidden">
              <Link
                href="/pipeline"
                className={`px-3 py-1.5 text-[13px] font-medium border-r border-line last:border-r-0 ${!type ? "bg-brand text-white" : "bg-card text-muted hover:text-ink"}`}
              >
                All
              </Link>
              {DEAL_TYPES.map((t) => (
                <Link
                  key={t}
                  href={`/pipeline?type=${t}`}
                  className={`px-3 py-1.5 text-[13px] font-mono font-medium border-r border-line last:border-r-0 ${type === t ? "bg-brand text-white" : "bg-card text-muted hover:text-ink"}`}
                >
                  {t}
                </Link>
              ))}
            </div>
          </>
        }
      />

      <div className="overflow-x-auto rail-scroll pb-2 -mx-1 px-1">
        <div className="flex gap-3 min-w-max items-start">
          {columns.map((col) => {
            const colValue = col.deals.reduce((s, d) => s + d.amountCents, 0);
            return (
              <div key={col.stage} className="w-[248px] shrink-0">
                <div className="flex items-baseline justify-between px-1.5 mb-2">
                  <span className="label">{STAGE_LABELS[col.stage]}</span>
                  <span className="text-2xs text-faint font-mono tabular-nums">
                    {col.deals.length}{colValue > 0 ? ` · ${money(colValue, { compact: true })}` : ""}
                  </span>
                </div>
                <div className="grid gap-2">
                  {col.deals.map((d) => {
                    const age = daysIn(d.stageEnteredAt);
                    return (
                      <Link
                        key={d.id}
                        href={`/deals/${d.id}`}
                        className={`card p-3 block border-t-2 ${TYPE_EDGE[d.dealType] ?? ""} hover:shadow-raised hover:-translate-y-px transition-all`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-faint">{d.dealNumber}</span>
                          <span className="ml-auto"><TypeBadge dealType={d.dealType} /></span>
                        </div>
                        <p className="text-[13.5px] font-medium text-ink mt-1.5 truncate">{d.company.legalName}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="tabular-nums text-[14px] font-serif font-semibold text-ink">
                            {money(d.amountCents, { compact: true })}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-2xs font-mono ${age > 7 ? "text-oxide" : "text-faint"}`}>
                            <span className={`pill-dot ${age > 7 ? "bg-oxide" : age > 3 ? "bg-bronze" : "bg-brand/50"}`} />
                            {age}d
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-line3">
                          {d.prescreenResult ? (
                            <span className={`text-2xs font-mono ${d.prescreenResult === "PASS" ? "text-brand" : d.prescreenResult === "FAIL" ? "text-oxide" : "text-bronze"}`}>
                              {d.prescreenResult === "PASS_WITH_EXCEPTIONS" ? "PASS w/ EXC" : d.prescreenResult}
                            </span>
                          ) : (
                            <span className="text-2xs text-faint">no pre-screen</span>
                          )}
                          {d.tasks.length > 0 ? (
                            <span className="text-2xs text-faint ml-auto">{d.tasks.length} open task{d.tasks.length > 1 ? "s" : ""}</span>
                          ) : null}
                        </div>
                      </Link>
                    );
                  })}
                  {col.deals.length === 0 ? (
                    <div className="border-[1.5px] border-dashed border-line rounded-lg h-[72px] flex items-center justify-center">
                      <span className="text-2xs text-faint">empty</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          {unplaced.length > 0 ? (
            <div className="w-[248px] shrink-0">
              <span className="label px-1.5">Other rail</span>
              <div className="grid gap-2 mt-2">
                {unplaced.map((d) => (
                  <Link key={d.id} href={`/deals/${d.id}`} className={`card p-3 block border-t-2 ${TYPE_EDGE[d.dealType] ?? ""} hover:shadow-raised transition-all`}>
                    <span className="font-mono text-[11px] text-faint">{d.dealNumber}</span>
                    <p className="text-[13.5px] font-medium text-ink mt-1 truncate">{d.company.legalName}</p>
                    <p className="text-2xs text-muted mt-1">{STAGE_LABELS[d.stage] ?? d.stage}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
