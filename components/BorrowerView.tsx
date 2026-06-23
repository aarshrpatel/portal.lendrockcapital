"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { isDocHave } from "@/lib/domain";
import { borrowerUpload } from "@/app/actions";
import type { CaseRow } from "@/lib/data";

export function BorrowerView({ c }: { c: CaseRow }) {
  const router = useRouter();
  const [items, setItems] = useState(c.docItems);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(c.docItems);
  }, [c.docItems]);

  const first = c.name.split(" ")[0];
  const done = items.filter((d) => isDocHave(d.status)).length;
  const total = items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  function onUpload(docItemId: string) {
    setItems((prev) =>
      prev.map((d) => (d.id === docItemId ? { ...d, status: "received" } : d))
    );
    startTransition(async () => {
      await borrowerUpload(docItemId);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-[14px] rounded-[11px] border border-[#fde68a] bg-[#fff8ec] px-[18px] py-[13px]">
        <div className="text-[12.5px] text-[#92400e]">
          <b>Borrower view</b> — this is the mobile page {first} opens from the SMS link.
          Tap a document to simulate an upload.
        </div>
        <button
          onClick={() => router.push("/documents")}
          className="whitespace-nowrap rounded-lg border border-[#e7c98a] bg-white px-[13px] py-[7px] text-[12px] font-semibold text-[#92400e]"
        >
          ← Back to staff view
        </button>
      </div>

      <div className="flex justify-center rounded-2xl bg-[#eceeef] px-4 pb-10 pt-6">
        <div
          className="w-[392px] overflow-hidden rounded-[30px] border border-line bg-white"
          style={{ boxShadow: "0 18px 50px rgba(16,24,40,.18)" }}
        >
          <div className="bg-brand px-[22px] pb-5 pt-[26px] text-white">
            <div className="flex items-center gap-[9px]">
              <div
                className="flex h-[30px] w-[30px] items-center justify-center rounded-lg font-guj text-[15px] font-bold"
                style={{ background: "rgba(255,255,255,.16)" }}
              >
                સે
              </div>
              <div className="font-serif text-[19px] font-semibold">Setu</div>
            </div>
            <div className="mt-[18px] font-serif text-[21px] font-semibold">Hi {first} 👋</div>
            <div className="mt-1 text-[13px] leading-[1.5] opacity-85">
              A few documents to move your {c.loan} forward. No login needed — just tap and
              upload.
            </div>
            <div className="mt-4 flex items-center gap-[10px]">
              <div
                className="h-[7px] flex-1 overflow-hidden rounded"
                style={{ background: "rgba(255,255,255,.22)" }}
              >
                <div
                  className="h-full rounded bg-white transition-[width] duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="whitespace-nowrap text-[12px] font-semibold">
                {done}/{total} done
              </span>
            </div>
          </div>

          <div className="bg-[#f7f8f9] px-[18px] pb-[10px] pt-4">
            {items.map((d) => {
              const received = isDocHave(d.status);
              return (
                <div
                  key={d.id}
                  className="mb-[10px] flex items-center gap-3 rounded-xl border border-line bg-white px-[15px] py-[13px]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold text-ink">{d.name}</div>
                    <div className="mt-px text-[11.5px] text-faint">{d.hint}</div>
                  </div>
                  {received ? (
                    <span className="inline-flex items-center gap-[5px] text-[12px] font-semibold text-[#16a34a]">
                      <span className="flex h-[19px] w-[19px] items-center justify-center rounded-full bg-[#16a34a] text-[12px] text-white">
                        ✓
                      </span>
                      Received
                    </span>
                  ) : (
                    <button
                      onClick={() => onUpload(d.id)}
                      className="whitespace-nowrap rounded-[9px] bg-brand px-[15px] py-2 text-[12.5px] font-semibold text-white"
                    >
                      Upload
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-line2 bg-[#f7f8f9] px-[18px] pb-[22px] pt-[14px]">
            <div className="mb-[11px] text-center text-[12px] text-muted">
              Questions? Your advisor {c.rep} is one tap away.
            </div>
            <div className="flex gap-[9px]">
              <button className="flex-1 rounded-[11px] border border-brand bg-white py-[11px] text-[13px] font-semibold text-brand">
                ☏ Call office
              </button>
              <button className="flex-1 rounded-[11px] border border-[#d4d8db] bg-white py-[11px] text-[13px] font-semibold text-body">
                ✉ Text us
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
