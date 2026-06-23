"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { PIPE_ORDER, STAGE, money, rCol, type StageKey } from "@/lib/domain";
import { Badge } from "@/components/ui";
import { moveStage } from "@/app/actions";
import type { CaseRow } from "@/lib/data";

const REPS: [string, string][] = [
  ["all", "All reps"],
  ["Hitesh", "Hitesh"],
  ["Anjali", "Anjali"],
];

export function PipelineBoard({ cases }: { cases: CaseRow[] }) {
  const router = useRouter();
  const [rep, setRep] = useState("all");
  const [items, setItems] = useState(cases);
  const [dragId, setDragId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // re-sync local board whenever fresh server data arrives
  useEffect(() => {
    setItems(cases);
  }, [cases]);

  const visible = items.filter(
    (c) => PIPE_ORDER.includes(c.stage as StageKey) && (rep === "all" || c.rep === rep)
  );
  const total = visible.length;

  function onDrop(stage: StageKey) {
    if (!dragId) return;
    const id = dragId;
    setDragId(null);
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, stage } : c)));
    startTransition(async () => {
      await moveStage(id, stage);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 font-serif text-[27px] font-semibold -tracking-[0.015em]">
            Pipeline
          </h1>
          <p className="mt-[5px] text-[13px] text-[#6b747c]">
            Drag a card to move its file forward. Click to open the full case.
          </p>
        </div>
        <Link
          href="/intake"
          className="rounded-lg bg-brand px-[17px] py-[9px] text-[13px] font-semibold text-white hover:bg-brand-hover"
          style={{ boxShadow: "0 1px 2px rgba(14,91,84,.3)" }}
        >
          + New lead
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {REPS.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setRep(k)}
            className={`rounded-full px-[13px] py-[6px] text-[12.5px] font-semibold transition ${
              rep === k
                ? "border border-brand bg-brand text-white"
                : "border border-[#d4d8db] bg-white text-[#5b6470]"
            }`}
          >
            {l}
          </button>
        ))}
        <span className="ml-2 text-[12px] text-faint">{total} active files</span>
      </div>

      <div className="overflow-x-auto pb-[14px]">
        <div className="flex min-w-max items-start gap-[13px]">
          {PIPE_ORDER.map((k) => {
            const cards = visible.filter((c) => c.stage === k);
            return (
              <div
                key={k}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  onDrop(k);
                }}
                className="w-[252px] flex-[0_0_252px] rounded-xl bg-line2 p-2"
              >
                <div className="flex items-center justify-between px-2 pb-[9px] pt-[6px]">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: STAGE[k].fg }}
                    />
                    <span className="text-[12.5px] font-semibold text-body">
                      {STAGE[k].label}
                    </span>
                  </div>
                  <span className="rounded-full bg-white px-2 py-px text-[11px] font-semibold text-[#8a929a]">
                    {cards.length}
                  </span>
                </div>
                <div className="flex min-h-[24px] flex-col gap-2">
                  {cards.map((c) => {
                    const rc = rCol(c.readiness);
                    let tag: string;
                    let tagBg: string, tagFg: string, tagBd: string;
                    if (c.stage === "new") {
                      tag = c.last;
                      [tagBg, tagFg, tagBd] = ["#fffbeb", "#b45309", "#fde68a"];
                    } else if (c.docMissing > 0) {
                      tag = `${c.docMissing} docs out`;
                      [tagBg, tagFg, tagBd] = ["#fef2f2", "#b91c1c", "#fecaca"];
                    } else {
                      tag = c.last;
                      [tagBg, tagFg, tagBd] = ["#f3f4f6", "#6b7280", "#e5e7eb"];
                    }
                    return (
                      <Link
                        key={c.id}
                        href={`/clients/${c.id}`}
                        draggable
                        onDragStart={() => setDragId(c.id)}
                        className="block cursor-pointer rounded-[10px] border border-line bg-white p-[11px_12px] transition hover:border-brand"
                        style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04)" }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[13px] font-semibold text-ink">{c.name}</div>
                          <span
                            className="rounded-full px-[7px] py-px font-serif text-[11px] font-bold"
                            style={{ color: rc.fg, background: rc.bg }}
                          >
                            {c.readiness || "–"}
                          </span>
                        </div>
                        <div className="mt-[3px] text-[11.5px] text-muted">{c.loan}</div>
                        <div className="mt-[9px] flex items-center justify-between">
                          <span className="font-serif text-[12px] font-semibold text-brand">
                            {money(c.amount)}
                          </span>
                          <Badge bg={tagBg} fg={tagFg} bd={tagBd}>
                            {tag}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
