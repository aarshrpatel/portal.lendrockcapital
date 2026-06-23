"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  DOC_NEXT_LABEL,
  DOC_STATUS_META,
  DOC_TEMPLATES,
  badge,
  tplKey,
} from "@/lib/domain";
import { Avatar } from "@/components/ui";
import { cycleDoc, setTemplate } from "@/app/actions";
import type { CaseRow } from "@/lib/data";

export function DocumentCenter({ cases }: { cases: CaseRow[] }) {
  const router = useRouter();
  const [list, setList] = useState(cases);
  const [selId, setSelId] = useState(cases[0]?.id ?? "");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setList(cases);
  }, [cases]);

  const sel = list.find((c) => c.id === selId) ?? list[0];
  if (!sel) {
    return <div className="text-[13px] text-faint">No files are collecting documents.</div>;
  }
  const curTpl = sel.tpl || tplKey(sel.cat, sel.borrower);

  function onCycle(docItemId: string, status: string) {
    const next =
      { requested: "received", received: "approved", approved: "requested", rejected: "requested" }[
        status
      ] ?? "requested";
    setList((prev) =>
      prev.map((c) =>
        c.id !== sel!.id
          ? c
          : {
              ...c,
              docItems: c.docItems.map((d) => (d.id === docItemId ? { ...d, status: next } : d)),
            }
      )
    );
    startTransition(async () => {
      await cycleDoc(docItemId);
      router.refresh();
    });
  }

  function onTemplate(key: string) {
    startTransition(async () => {
      await setTemplate(sel!.id, key);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="m-0 font-serif text-[27px] font-semibold -tracking-[0.015em]">
          Document center
        </h1>
        <p className="mt-[5px] text-[13px] text-[#6b747c]">
          Checklists generate from loan type + borrower profile. Reminders fire automatically.
        </p>
      </div>

      <div className="grid grid-cols-[248px_1fr] items-start gap-[18px]">
        {/* sidebar */}
        <div
          className="rounded-xl border border-line bg-white p-2"
          style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04)" }}
        >
          <div className="px-[11px] pb-[7px] pt-[9px] text-[11px] font-bold uppercase tracking-[0.05em] text-[#8a929a]">
            Files collecting docs
          </div>
          {list.map((c) => {
            const active = c.id === sel.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelId(c.id)}
                className={`flex w-full items-center gap-[9px] rounded-[9px] px-[11px] py-2 text-left transition ${
                  active ? "bg-brand-tint" : "bg-transparent hover:bg-page"
                }`}
              >
                <Avatar initials={c.initials} bg={c.avBg} fg={c.avFg} size={30} fontSize={11} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink">{c.name}</div>
                  <div className="text-[11px] text-faint">
                    {c.docMissing > 0 ? `${c.docMissing} outstanding` : "complete"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* detail */}
        <div
          className="overflow-hidden rounded-xl border border-line bg-white"
          style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04)" }}
        >
          <div className="flex flex-wrap items-center gap-[14px] border-b border-line2 px-[22px] py-[18px]">
            <Avatar initials={sel.initials} bg={sel.avBg} fg={sel.avFg} size={42} fontSize={14} />
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-semibold">{sel.name}</div>
              <div className="text-[12px] text-muted">
                {sel.loan} · {sel.borrowerLabel} · {sel.lang}
              </div>
            </div>
            <button
              onClick={() => router.push(`/borrower/${sel.id}`)}
              className="rounded-lg bg-brand px-[15px] py-[9px] text-[12.5px] font-semibold text-white hover:bg-brand-hover"
            >
              Send upload link →
            </button>
          </div>

          <div className="border-b border-line2 bg-[#fafbfb] px-[22px] py-4">
            <div className="flex flex-wrap items-center justify-between gap-[14px]">
              <div className="flex items-center gap-[13px]">
                <div className="font-serif text-[24px] font-semibold text-brand">
                  {sel.docHave}
                  <span className="text-[15px] text-faint">/{sel.docTotal}</span>
                </div>
                <div className="text-[12px] leading-[1.4] text-muted">
                  received
                  <br />
                  {sel.docApproved} approved · {sel.docMissing} outstanding
                </div>
              </div>
              <div className="flex items-center gap-[9px]">
                <span className="text-[11px] text-faint">Reminders</span>
                {["48h", "5d", "10d"].map((r) => (
                  <span
                    key={r}
                    className="rounded-full border border-[#fde68a] bg-[#fffbeb] px-[9px] py-px text-[11px] font-semibold text-[#b45309]"
                  >
                    {r}
                  </span>
                ))}
                <button className="rounded-[7px] border border-[#d4d8db] bg-white px-[11px] py-[5px] text-[11.5px] font-semibold text-brand">
                  Send reminder now
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-[9px]">
              <span className="mr-[2px] text-[11px] text-faint">Template</span>
              {DOC_TEMPLATES.map(([k, l]) => {
                const active = curTpl === k;
                return (
                  <button
                    key={k}
                    onClick={() => onTemplate(k)}
                    className={`rounded-lg px-[11px] py-[6px] text-[12px] font-medium transition ${
                      active
                        ? "border border-brand bg-brand text-white"
                        : "border border-[#d4d8db] bg-white text-[#5b6470]"
                    }`}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-[22px] pb-[10px] pt-[6px]">
            {sel.docItems.map((d) => {
              const [label, b, f, bd] = DOC_STATUS_META[d.status];
              return (
                <div
                  key={d.id}
                  className="flex items-center gap-[13px] border-b border-line3 py-[13px] last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium">{d.name}</div>
                    <div className="mt-px text-[11.5px] text-faint">{d.hint}</div>
                  </div>
                  <span style={badge(b, f, bd)}>{label}</span>
                  <button
                    onClick={() => onCycle(d.id, d.status)}
                    className="whitespace-nowrap rounded-[7px] border border-[#d4d8db] bg-white px-[11px] py-[5px] text-[11.5px] font-semibold text-body hover:bg-page"
                  >
                    {DOC_NEXT_LABEL[d.status]}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
