import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { money, dt } from "@/lib/format";
import { STAGE_LABELS, stagesFor } from "@/lib/enums";
import { borrowerUpload, requestDraw, wcRequestDraw } from "@/app/actions";

// Borrower surface — passwordless magic link (Module 06 §3.2). No account,
// no password: the token IS the session. Production adds SMS OTP step-up
// before viewing stored documents.

export default async function BorrowerPortal({ params }: { params: { token: string } }) {
  const deal = await db.deal.findUnique({
    where: { borrowerToken: params.token },
    include: {
      company: true,
      documents: { orderBy: [{ status: "asc" }, { category: "asc" }] },
      draws: { orderBy: { requestedAt: "desc" } },
      wcLine: true,
      messages: { where: { channel: "EMAIL", direction: "OUT" }, orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!deal) notFound();

  const rail = stagesFor(deal.dealType);
  const currentIdx = rail.indexOf(deal.stage);
  const accepted = deal.documents.filter((d) => d.status === "ACCEPTED").length;
  const needed = deal.documents.filter((d) => ["REQUESTED", "REJECTED", "EXPIRED"].includes(d.status));
  const progress = deal.documents.length > 0 ? Math.round((accepted / deal.documents.length) * 100) : 0;
  const isTerminal = deal.stage === "DEAD" || deal.stage === "DECLINED";

  return (
    <div className="min-h-screen bg-page">
      <header className="portal-hero text-white">
        <div className="max-w-3xl mx-auto px-5 pt-5 pb-12">
          <div className="flex items-center gap-2">
            <span className="font-serif text-[17px] font-semibold tracking-tight">Lendrock Capital</span>
            <span className="font-mono text-[9.5px] text-white/45 uppercase tracking-[0.2em] ml-2 mt-0.5">Borrower Portal</span>
          </div>
          <p className="font-serif text-[24px] font-semibold tracking-tight mt-6">
            {deal.company.legalName}
          </p>
          <p className="text-[13px] text-white/60 mt-1 font-mono">
            {deal.dealNumber} · {money(deal.amountCents)} requested
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 pb-8 grid gap-4 animate-fadeUp -mt-6">
        <div className="card shadow-raised p-5">

          <p className="label mb-3">Where things stand</p>
          {!isTerminal ? (
            <>
              <div className="flex items-center gap-1 overflow-x-auto pb-1 rail-scroll">
                {rail.map((s, i) => (
                  <div key={s} className="flex items-center gap-1 shrink-0">
                    {i > 0 ? <span className="w-3 h-px bg-line" /> : null}
                    <span className={`text-2xs px-2 py-1 rounded font-medium ${
                      s === deal.stage ? "bg-brand text-white" : i < currentIdx ? "bg-brand-tint text-brand" : "bg-line3 text-faint"
                    }`}>
                      {STAGE_LABELS[s]}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[13px] text-body mt-3">
                Your file is in <strong>{STAGE_LABELS[deal.stage]}</strong>. We&apos;ll email you the moment anything
                changes — no need to call for status.
              </p>
            </>
          ) : (
            <p className="text-[13px] text-oxide mt-3">This file is closed. Reach out to your loan officer with any questions.</p>
          )}
        </div>

        {needed.length > 0 ? (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="label">Documents we still need — {needed.length}</h2>
              <span className="text-2xs text-faint font-mono">{progress}% complete</span>
            </div>
            <div className="h-2 rounded-full bg-line3 overflow-hidden mb-4">
              <div className="h-full bg-brand" style={{ width: `${progress}%` }} />
            </div>
            <ul className="divide-y divide-line3">
              {needed.map((d) => (
                <li key={d.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex-1 min-w-48">
                      <p className="text-[14px] font-medium text-ink">{d.name}</p>
                      {d.status === "REJECTED" ? (
                        <p className="text-[12.5px] text-oxide mt-0.5">Needs another look: {d.rejectedReason}</p>
                      ) : d.status === "EXPIRED" ? (
                        <p className="text-[12.5px] text-bronze mt-0.5">Expired — please upload a fresh copy (≤ {d.freshnessDays} days old).</p>
                      ) : null}
                    </div>
                    <form action={borrowerUpload.bind(null, d.id)} className="flex gap-1.5">
                      <input name="fileName" placeholder="file name (simulates upload)" className="input w-52 py-1 text-[12.5px]" defaultValue={`${d.docCode.toLowerCase()}.pdf`} />
                      <button className="btn btn-primary py-1">Upload</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-2xs text-faint mt-3">Drag-and-drop or snap a photo — we&apos;ll sort it into the right slot automatically.</p>
          </div>
        ) : deal.documents.length > 0 ? (
          <div className="card p-5">
            <p className="text-[14px] text-brand font-medium">✓ All documents received — nothing needed from you right now.</p>
          </div>
        ) : null}

        {deal.dealType === "HM" && deal.fundedAt && !isTerminal ? (
          <div className="card p-5">
            <h2 className="label mb-3">Request a rehab draw</h2>
            <form action={requestDraw.bind(null, deal.id)} className="flex items-end gap-2">
              <div>
                <label className="text-2xs text-muted block mb-1">Amount ($)</label>
                <input name="amount" type="number" className="input w-40" />
              </div>
              <button className="btn btn-primary">Request draw</button>
            </form>
            <p className="text-2xs text-faint mt-2">
              An inspection is ordered automatically. Typical request-to-wire: 5 business days.
            </p>
            {deal.draws.length > 0 ? (
              <ul className="divide-y divide-line3 mt-3">
                {deal.draws.slice(0, 5).map((d) => (
                  <li key={d.id} className="py-2 flex items-center gap-3 text-[13px]">
                    <span className="tabular-nums">{money(d.amountCents)}</span>
                    <span className="text-2xs text-muted">{d.status.replace(/_/g, " ").toLowerCase()}</span>
                    <span className="text-2xs text-faint ml-auto">{dt(d.requestedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {deal.wcLine && !isTerminal ? (
          <div className="card p-5">
            <h2 className="label mb-1">Your credit line</h2>
            <p className="text-[15px] text-ink tabular-nums">
              {money(deal.wcLine.limitCents - deal.wcLine.drawnCents)} available of {money(deal.wcLine.limitCents)}
            </p>
            <div className="h-2 rounded-full bg-line3 overflow-hidden my-3">
              <div className="h-full bg-brand" style={{ width: `${Math.min(100, (deal.wcLine.drawnCents / deal.wcLine.limitCents) * 100)}%` }} />
            </div>
            {deal.wcLine.status === "ACTIVE" ? (
              <form action={wcRequestDraw.bind(null, deal.wcLine.id)} className="flex items-end gap-2">
                <div>
                  <label className="text-2xs text-muted block mb-1">Draw amount ($)</label>
                  <input name="amount" type="number" className="input w-40" />
                </div>
                <button className="btn btn-primary">Draw funds</button>
                <span className="text-2xs text-faint">Approved draws before 2 PM ET arrive same day.</span>
              </form>
            ) : (
              <p className="text-[13px] text-bronze">
                Draws are paused ({deal.wcLine.status.replace(/_/g, " ").toLowerCase()}). Billing continues as normal — contact us with questions.
              </p>
            )}
          </div>
        ) : null}

        <div className="card p-5">
          <h2 className="label mb-3">Recent updates</h2>
          <ul className="divide-y divide-line3">
            {deal.messages.map((m) => (
              <li key={m.id} className="py-2.5">
                <p className="text-[13.5px] text-ink">{m.subject}</p>
                <p className="text-[12.5px] text-muted mt-0.5">{m.body}</p>
                <p className="text-2xs text-faint mt-1">{dt(m.createdAt)}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-2xs text-faint text-center py-4">
          Secure link — don&apos;t forward it. Questions? Reply to any email from your loan officer.
        </p>
      </main>
    </div>
  );
}
