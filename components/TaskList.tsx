"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { badge } from "@/lib/domain";
import { Avatar } from "@/components/ui";
import { toggleTask } from "@/app/actions";
import type { TaskRow } from "@/lib/data";

const PRI_STYLE: Record<string, [string, string, string]> = {
  high: ["#fef2f2", "#b91c1c", "#fecaca"],
  med: ["#fff7ed", "#c2410c", "#fed7aa"],
  low: ["#f3f4f6", "#6b7280", "#e5e7eb"],
};
const PRI_LABEL: Record<string, string> = { high: "High", med: "Med", low: "Low" };
const DUE_STYLE: Record<string, [string, string, string]> = {
  overdue: ["#fef2f2", "#b91c1c", "#fecaca"],
  today: ["#fffbeb", "#b45309", "#fde68a"],
  soon: ["#eff6ff", "#2563eb", "#dbeafe"],
  future: ["#f3f4f6", "#6b7280", "#e5e7eb"],
};
const TYPE_META: Record<string, [string, string]> = {
  first: ["First contact", "#4f46e5"],
  consult: ["Consult", "#7c3aed"],
  docs: ["Documents", "#d97706"],
  submission: ["Submission", "#0891b2"],
  nurture: ["Nurture", "#6b7280"],
};

const TABS: [string, string][] = [
  ["today", "Today"],
  ["overdue", "Overdue"],
  ["docs", "Doc chases"],
  ["consults", "Calls & consults"],
  ["nurture", "Nurture"],
  ["all", "All open"],
  ["done", "Completed"],
];

export function TaskList({ tasks }: { tasks: TaskRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("today");
  const [items, setItems] = useState(tasks);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  const match = (t: TaskRow) => {
    if (filter === "done") return t.done;
    if (t.done) return false;
    if (filter === "all") return true;
    if (filter === "today") return t.dueK === "today" || t.dueK === "overdue";
    if (filter === "overdue") return t.dueK === "overdue";
    if (filter === "docs") return t.type === "docs";
    if (filter === "consults") return t.type === "consult" || t.type === "first";
    if (filter === "nurture") return t.type === "nurture";
    return true;
  };

  const open = items.filter((t) => !t.done);
  const counts: Record<string, number> = {
    today: open.filter((t) => t.dueK === "today" || t.dueK === "overdue").length,
    overdue: open.filter((t) => t.dueK === "overdue").length,
    docs: open.filter((t) => t.type === "docs").length,
    consults: open.filter((t) => t.type === "consult" || t.type === "first").length,
    nurture: open.filter((t) => t.type === "nurture").length,
    all: open.length,
    done: items.filter((t) => t.done).length,
  };

  function onToggle(id: string) {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    startTransition(async () => {
      await toggleTask(id);
      router.refresh();
    });
  }

  const list = items.filter(match);

  return (
    <div>
      <div className="mb-4">
        <h1 className="m-0 font-serif text-[27px] font-semibold -tracking-[0.015em]">
          Task center
        </h1>
        <p className="mt-[5px] text-[13px] text-[#6b747c]">
          Auto-generated from SLAs, doc chases, consults, and stalled files. {counts.today}{" "}
          due today.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(([k, l]) => {
          const active = filter === k;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`inline-flex items-center gap-[7px] rounded-[9px] px-[13px] py-[6px] text-[12.5px] font-semibold transition ${
                active
                  ? "border border-brand bg-brand text-white"
                  : "border border-[#d4d8db] bg-white text-[#5b6470]"
              }`}
            >
              {l}
              <span
                className="min-w-[17px] rounded-full px-[6px] text-center text-[10.5px] font-bold"
                style={
                  active
                    ? { background: "rgba(255,255,255,.22)", color: "#fff" }
                    : { background: "#eef0f1", color: "#8a929a" }
                }
              >
                {counts[k]}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="overflow-hidden rounded-xl border border-line bg-white"
        style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04)" }}
      >
        {list.length === 0 && (
          <div className="px-5 py-10 text-center text-[13px] text-faint">
            Nothing here. You’re all caught up.
          </div>
        )}
        {list.map((t) => {
          const [pb, pf, pd] = PRI_STYLE[t.pri];
          const [db, df, dd] = DUE_STYLE[t.dueK];
          const [typeLabel, typeColor] = TYPE_META[t.type];
          return (
            <div
              key={t.id}
              className="flex items-center gap-[13px] border-b border-line3 px-5 py-[14px] last:border-0"
            >
              <button
                onClick={() => onToggle(t.id)}
                className="flex h-5 w-5 flex-[0_0_20px] items-center justify-center rounded-md text-[12px] text-white"
                style={{
                  border: `1.5px solid ${t.done ? "#0e5b54" : "#c9ced2"}`,
                  background: t.done ? "#0e5b54" : "#fff",
                }}
              >
                {t.done ? "✓" : ""}
              </button>
              <button
                onClick={() => router.push(`/clients/${t.caseId}`)}
                className="min-w-0 flex-1 cursor-pointer text-left"
              >
                <div
                  className="text-[13.5px] font-medium"
                  style={{
                    color: t.done ? "#a9b0b6" : "#1a1f24",
                    textDecoration: t.done ? "line-through" : "none",
                  }}
                >
                  {t.title}
                </div>
                <div className="mt-[2px] text-[11.5px] text-faint">{t.reason}</div>
              </button>
              <span
                className="inline-flex items-center gap-[6px] text-[11px] font-semibold"
                style={{ color: typeColor }}
              >
                <span
                  className="h-[6px] w-[6px] rounded-full"
                  style={{ background: typeColor }}
                />
                {typeLabel}
              </span>
              <span style={badge(pb, pf, pd)}>{PRI_LABEL[t.pri]}</span>
              <span style={{ ...badge(db, df, dd), width: 78, justifyContent: "center" }}>
                {t.due}
              </span>
              <Avatar initials={t.initials} bg={t.avBg} fg={t.avFg} size={32} fontSize={11} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
