import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { money, ago, dt } from "@/lib/format";
import { completeTask } from "@/app/actions";
import { Section, Stat, StatusPill, TypeBadge, Empty } from "@/components/ui";
import { IconClock, IconAlert } from "@/components/Icons";

const PRIORITY_STRIPE: Record<string, string> = {
  HIGH: "border-l-oxide",
  MED: "border-l-bronze/60",
  LOW: "border-l-line",
};

export default async function MyDay() {
  const user = await getSession();
  if (!user) redirect("/login");

  const [myTasks, activeDeals, hotLeads, pendingApprovals, recentAudit, fundedThisMonth] = await Promise.all([
    db.task.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] }, ownerRole: user.role === "ADMIN" ? undefined : user.role },
      include: { deal: { select: { id: true, dealNumber: true, dealType: true } } },
      orderBy: [{ priority: "asc" }, { dueAt: "asc" }],
      take: 12,
    }),
    db.deal.findMany({
      where: { stage: { notIn: ["PAID_OFF", "DEAD", "DECLINED"] } },
      select: { amountCents: true },
    }),
    db.lead.findMany({
      where: { band: "HOT", stage: { in: ["NEW_LEAD", "CONTACTED"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.approvalSignoff.findMany({
      where: { decision: "PENDING", approverRole: user.role === "ADMIN" ? undefined : user.role },
      include: { approval: { include: { deal: { select: { id: true, dealNumber: true, dealType: true, amountCents: true } } } } },
      take: 6,
    }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    db.deal.aggregate({
      where: { fundedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      _sum: { amountCents: true },
      _count: true,
    }),
  ]);

  const now = Date.now();
  const overdue = myTasks.filter((t) => t.dueAt && t.dueAt.getTime() < now).length;
  const pipelineValue = activeDeals.reduce((s, d) => s + d.amountCents, 0);
  const firstName = user.name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="grid gap-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="label">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="h-serif text-[28px] font-semibold mt-0.5">
            {greeting}, {firstName}.
          </h1>
        </div>
        <p className="text-[13px] text-muted">
          {myTasks.length} task{myTasks.length === 1 ? "" : "s"} in your <span className="kcode">{user.role}</span> queue
          {overdue > 0 ? <span className="text-oxide font-medium"> · {overdue} past SLA</span> : null}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Active pipeline" value={money(pipelineValue, { compact: true })} sub={`${activeDeals.length} open deals`} />
        <Stat label="My open tasks" value={myTasks.length} sub={overdue > 0 ? `${overdue} past SLA` : "all within SLA"} tone={overdue > 0 ? "bad" : undefined} />
        <Stat label="Funded this month" value={money(fundedThisMonth._sum.amountCents ?? 0, { compact: true })} sub={`${fundedThisMonth._count} deal${fundedThisMonth._count === 1 ? "" : "s"}`} />
        <Stat label="Pending signoffs" value={pendingApprovals.length} sub="awaiting your decision" tone={pendingApprovals.length > 0 ? "warn" : undefined} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid gap-4 content-start">
          <Section title={`Task queue — ${user.role}`} pad={false}>
            {myTasks.length === 0 ? (
              <Empty text="Queue is clear. The machine is chasing everything else." />
            ) : (
              <ul>
                {myTasks.map((t) => {
                  const late = t.dueAt && t.dueAt.getTime() < now;
                  return (
                    <li
                      key={t.id}
                      className={`flex items-center gap-3 px-4 py-2.5 border-b border-line3 last:border-b-0 border-l-[3px] ${PRIORITY_STRIPE[t.priority] ?? "border-l-line"} hover:bg-brand-tint/20 transition-colors`}
                    >
                      <form action={completeTask.bind(null, t.id)}>
                        <button className="check-btn" title="Mark done" aria-label="Mark done" />
                      </form>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] text-ink truncate">{t.title}</p>
                        <p className="text-2xs text-faint mt-px">
                          {t.deal ? (
                            <>
                              <Link className="text-brand hover:underline font-mono" href={`/deals/${t.deal.id}`}>
                                {t.deal.dealNumber}
                              </Link>
                              {" · "}
                            </>
                          ) : null}
                          {t.type.replace(/_/g, " ").toLowerCase()}
                          {t.dueAt ? ` · due ${dt(t.dueAt)}` : ""}
                        </p>
                      </div>
                      {t.deal ? <TypeBadge dealType={t.deal.dealType} /> : null}
                      {late ? (
                        <span className="pill bg-oxide-tint text-oxide font-mono">
                          <IconClock size={11} /> SLA
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title="Awaiting my signoff" pad={false}>
            {pendingApprovals.length === 0 ? (
              <Empty text="No approvals waiting on you." />
            ) : (
              <ul>
                {pendingApprovals.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-line3 last:border-b-0 hover:bg-brand-tint/20 transition-colors">
                    <TypeBadge dealType={s.approval.deal.dealType} />
                    <Link href={`/deals/${s.approval.deal.id}?tab=approvals`} className="text-[13.5px] font-mono text-brand hover:underline">
                      {s.approval.deal.dealNumber}
                    </Link>
                    <span className="text-[13px] text-muted tabular-nums">{money(s.approval.deal.amountCents)}</span>
                    <span className="ml-auto pill bg-bronze-tint text-bronze font-mono">TIER {s.approval.tier}</span>
                    <Link href={`/deals/${s.approval.deal.id}?tab=approvals`} className="btn py-1 text-[12px]">
                      Review →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="grid gap-4 content-start">
          <Section title="Hot leads — speed to lead" pad={false}>
            {hotLeads.length === 0 ? (
              <Empty text="No untouched hot leads." />
            ) : (
              <ul>
                {hotLeads.map((l) => (
                  <li key={l.id} className="px-4 py-2.5 border-b border-line3 last:border-b-0 hover:bg-brand-tint/20 transition-colors">
                    <div className="flex items-center gap-2">
                      <Link href={`/leads/${l.id}`} className="text-[13.5px] font-medium text-brand hover:underline truncate">
                        {l.firstName} {l.lastName}
                      </Link>
                      {!l.firstTouchAt ? (
                        <span className="pill bg-oxide-tint text-oxide font-mono ml-auto">
                          <IconAlert size={11} /> UNTOUCHED
                        </span>
                      ) : (
                        <StatusPill status={l.band} />
                      )}
                    </div>
                    <p className="text-2xs text-faint mt-0.5">
                      {l.dealType || "unclassified"} · {money(l.amountCents, { compact: true })} · {ago(l.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Activity" pad={false}>
            <ul>
              {recentAudit.map((a) => (
                <li key={a.id} className="px-4 py-2 border-b border-line3 last:border-b-0">
                  <p className="text-[12.5px] text-body leading-snug">
                    <span className="kcode mr-1.5">{a.actor}</span>
                    {a.action.replace(/_/g, " ").toLowerCase()}
                    {a.detail ? <span className="text-faint"> — {a.detail.slice(0, 56)}</span> : null}
                  </p>
                  <p className="text-2xs text-faint mt-0.5">{ago(a.createdAt)}</p>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
