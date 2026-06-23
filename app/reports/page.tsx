import { Card } from "@/components/ui";

const KPIS = [
  { label: "Leads this month", value: "38", note: "+9 vs last month", noteColor: "#16a34a" },
  { label: "Qualified rate", value: "61%", note: "23 of 38", noteColor: "#9aa1a8" },
  { label: "Avg days to submit", value: "18", note: "−3 days vs Q2", noteColor: "#16a34a" },
  { label: "Funded YTD", value: "$14.8M", note: "31 files", noteColor: "#9aa1a8" },
  { label: "Commission MTD", value: "$48.6K", note: "4 funded", noteColor: "#9aa1a8" },
];

const FUNNEL_RAW: [string, number, string][] = [
  ["Inquiries", 38, "#4f46e5"],
  ["Screened", 31, "#2563eb"],
  ["Qualified", 23, "#0e5b54"],
  ["Consults", 17, "#7c3aed"],
  ["Submitted", 11, "#0891b2"],
  ["Approved", 8, "#16a34a"],
  ["Funded", 6, "#15803d"],
];

const SOURCES: [string, number, string][] = [
  ["Referrals", 16, "#0e5b54"],
  ["Repeat clients", 7, "#2563eb"],
  ["Web form", 8, "#7c3aed"],
  ["Social", 4, "#d97706"],
  ["Walk-in", 3, "#6b7280"],
];

const STAGES: [string, number][] = [
  ["Screening", 2.1],
  ["Doc collection", 6.4],
  ["Review", 2.8],
  ["Submission", 3.2],
  ["Lender decision", 9.1],
];

const LOST: [string, number, string][] = [
  ["Rate / pricing", 5, "#dc2626"],
  ["Went elsewhere", 4, "#d97706"],
  ["Not qualified", 3, "#6b7280"],
  ["Went quiet", 6, "#0891b2"],
];

const QUAL: [string, string][] = [
  ["Referrals", "82%"],
  ["Repeat clients", "78%"],
  ["Web form", "44%"],
  ["Social", "38%"],
  ["Walk-in", "55%"],
];

function MiniBar({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="mb-[10px]">
      <div className="mb-1 flex justify-between text-[12px]">
        <span className="text-[#5b6470]">{label}</span>
        <span className="font-semibold text-ink">{value}</span>
      </div>
      <div className="h-[7px] overflow-hidden rounded" style={{ background: "#f1f3f4" }}>
        <div style={{ height: "100%", borderRadius: 5, background: color, width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const sMax = Math.max(...SOURCES.map((s) => s[1]));
  const stMax = Math.max(...STAGES.map((s) => s[1]));
  const lMax = Math.max(...LOST.map((l) => l[1]));

  return (
    <div>
      <div className="mb-[18px]">
        <h1 className="m-0 font-serif text-[27px] font-semibold -tracking-[0.015em]">Reports</h1>
        <p className="mt-[5px] text-[13px] text-[#6b747c]">
          Where deals come from, where they stall, and where they close.
        </p>
      </div>

      <div className="mb-[18px] grid grid-cols-5 gap-3">
        {KPIS.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-line bg-white px-4 py-[14px]"
            style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04)" }}
          >
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.045em] text-[#8a929a]">
              {k.label}
            </div>
            <div className="mt-[7px] font-serif text-[25px] font-semibold leading-none">
              {k.value}
            </div>
            <div className="mt-[6px] text-[11px]" style={{ color: k.noteColor }}>
              {k.note}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1.3fr_1fr] items-start gap-[18px]">
        <Card className="p-[18px_20px]">
          <h3 className="mb-4 mt-0 text-[13px] font-semibold">Conversion funnel — this month</h3>
          {FUNNEL_RAW.map((f, i) => (
            <div key={f[0]} className="mb-[11px] flex items-center gap-3">
              <div className="w-[78px] flex-[0_0_78px] text-right text-[12px] text-[#5b6470]">
                {f[0]}
              </div>
              <div
                className="h-6 flex-1 overflow-hidden rounded-md"
                style={{ background: "#f1f3f4" }}
              >
                <div
                  className="flex h-full items-center rounded-md pl-[9px] text-[12px] font-bold text-white"
                  style={{ background: f[2], width: `${Math.round((f[1] / 38) * 100)}%` }}
                >
                  {f[1]}
                </div>
              </div>
              <div className="w-[42px] flex-[0_0_42px] text-[11.5px] text-faint">
                {i > 0 ? Math.round((f[1] / FUNNEL_RAW[i - 1][1]) * 100) + "%" : "—"}
              </div>
            </div>
          ))}
        </Card>

        <Card className="p-[18px_20px]">
          <h3 className="mb-[14px] mt-0 text-[13px] font-semibold">Leads by source</h3>
          {SOURCES.map((s) => (
            <MiniBar
              key={s[0]}
              label={s[0]}
              value={String(s[1])}
              pct={Math.round((s[1] / sMax) * 100)}
              color={s[2]}
            />
          ))}
        </Card>
      </div>

      <div className="mt-[18px] grid grid-cols-3 items-start gap-[18px]">
        <Card className="p-[18px_20px]">
          <h3 className="mb-[14px] mt-0 text-[13px] font-semibold">Avg days in stage</h3>
          {STAGES.map((s) => (
            <MiniBar
              key={s[0]}
              label={s[0]}
              value={s[1] + "d"}
              pct={Math.round((s[1] / stMax) * 100)}
              color="#0e5b54"
            />
          ))}
        </Card>

        <Card className="p-[18px_20px]">
          <h3 className="mb-[14px] mt-0 text-[13px] font-semibold">Lost reasons (90d)</h3>
          {LOST.map((l) => (
            <MiniBar
              key={l[0]}
              label={l[0]}
              value={String(l[1])}
              pct={Math.round((l[1] / lMax) * 100)}
              color={l[2]}
            />
          ))}
        </Card>

        <Card className="p-[18px_20px]">
          <h3 className="mb-[14px] mt-0 text-[13px] font-semibold">Qualified rate by source</h3>
          {QUAL.map((q) => (
            <div
              key={q[0]}
              className="flex items-center justify-between border-b border-line3 py-[9px] last:border-0"
            >
              <span className="text-[12.5px] text-[#5b6470]">{q[0]}</span>
              <span className="font-serif text-[13px] font-bold text-brand">{q[1]}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
