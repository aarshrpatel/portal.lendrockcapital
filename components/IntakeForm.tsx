"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { clamp, rCol } from "@/lib/domain";
import { createLead, type NewLead } from "@/app/actions";

type Intake = {
  name: string;
  phone: string;
  lang: string;
  source: string;
  loanType: string;
  borrower: string;
  income: string;
  credit: string;
  timeline: string;
  challenge: string;
  notes: string;
};

const BLANK: Intake = {
  name: "",
  phone: "",
  lang: "",
  source: "",
  loanType: "",
  borrower: "",
  income: "",
  credit: "",
  timeline: "",
  challenge: "",
  notes: "",
};

const SCRIPTS: { en: string; guj: string }[] = [
  {
    en: "Thanks for calling Setu. How can we help with your loan today?",
    guj: "Setu માં કોલ કરવા બદલ આભાર. આજે તમને લોન માટે કેવી મદદ જોઈએ છે?",
  },
  {
    en: "Are you buying, refinancing, or financing a business?",
    guj: "તમે ઘર ખરીદો છો, રિફાઇનાન્સ કરો છો કે વ્યવસાય માટે?",
  },
  {
    en: "What’s your timeline — ready now or still exploring?",
    guj: "તમારી સમયમર્યાદા શું છે — હમણાં તૈયાર કે હજુ વિચારો છો?",
  },
  {
    en: "Do you own a business or file self-employed taxes?",
    guj: "શું તમારો પોતાનો વ્યવસાય છે?",
  },
  {
    en: "Any credit concerns we should plan around?",
    guj: "ક્રેડિટ અંગે કોઈ ચિંતા છે?",
  },
];

const OUTCOMES: { key: string; label: string; sub: string; icon: string }[] = [
  { key: "consult", label: "Book consult", sub: "Promising — schedule strategy call", icon: "○" },
  { key: "docs", label: "Send docs", sub: "Qualified — start document collection", icon: "△" },
  { key: "callback", label: "Call back later", sub: "Not ready — set a nurture callback", icon: "↻" },
  { key: "notfit", label: "Not a fit", sub: "Decline politely, log reason", icon: "✕" },
];

const OUTCOME_RESULT: Record<string, { title: string; desc: string; cta: string; href: string }> = {
  consult: {
    title: "Consult booked",
    desc: "A strategy consult task was created and a confirmation SMS queued to the borrower.",
    cta: "View in pipeline",
    href: "/pipeline",
  },
  docs: {
    title: "Document request sent",
    desc: "A checklist was generated and a secure upload link texted. Reminders auto-fire at 48h, 5d, 10d.",
    cta: "Open document center",
    href: "/documents",
  },
  callback: {
    title: "Callback scheduled",
    desc: "Moved to nurture with a callback task. They’ll resurface on your dashboard.",
    cta: "Back to dashboard",
    href: "/dashboard",
  },
  notfit: {
    title: "Marked not a fit",
    desc: "Logged the reason. No further automated follow-up will run.",
    cta: "Back to dashboard",
    href: "/dashboard",
  },
};

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[9px] px-[13px] py-[7px] text-[12.5px] font-medium transition ${
        active
          ? "border border-brand bg-brand text-white"
          : "border border-[#d4d8db] bg-white text-body"
      }`}
    >
      {label}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-[7px] block text-[12px] font-semibold text-[#5b6470]">
      {children}
    </label>
  );
}

export function IntakeForm() {
  const router = useRouter();
  const [v, setV] = useState<Intake>(BLANK);
  const [bilingual, setBilingual] = useState(true);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const set = (f: keyof Intake, val: string) => setV((s) => ({ ...s, [f]: val }));
  const group = (field: keyof Intake, opts: string[]) =>
    opts.map((o) => (
      <Chip key={o} label={o} active={v[field] === o} onClick={() => set(field, o)} />
    ));

  const pct = useMemo(() => {
    const filled = (["name", "phone", "loanType", "borrower", "timeline"] as (keyof Intake)[]).filter(
      (f) => v[f]
    ).length;
    return Math.round((filled / 5) * 100);
  }, [v]);

  const est = useMemo(
    () =>
      clamp(
        (v.timeline === "ASAP — ready now" ? 28 : v.timeline ? 14 : 0) +
          (v.credit.includes("740") ? 26 : v.credit.includes("680") ? 18 : v.credit.includes("620") ? 9 : 0) +
          (v.loanType ? 16 : 0) +
          (v.borrower ? 12 : 0) +
          (v.income ? 10 : 0) +
          (v.source.includes("Referral") ? 8 : v.source ? 4 : 0)
      ),
    [v]
  );
  const ec = rCol(est);

  const result = outcome ? OUTCOME_RESULT[outcome] : null;

  function handleCta() {
    if (!outcome) return;
    const lead: NewLead = { ...v, outcome };
    const href = OUTCOME_RESULT[outcome].href;
    startTransition(async () => {
      await createLead(lead);
      router.push(href);
    });
  }

  return (
    <div>
      <div className="mb-[6px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 font-serif text-[27px] font-semibold -tracking-[0.015em]">
            Live intake
          </h1>
          <p className="mt-[5px] text-[13px] text-[#6b747c]">
            Capture the call as you talk. Tap quick answers — aim for 3–5 minutes.
          </p>
        </div>
        <button
          onClick={() => {
            setV(BLANK);
            setOutcome(null);
          }}
          className="rounded-lg border border-[#d4d8db] bg-white px-[14px] py-2 text-[12.5px] font-semibold text-[#6b747c]"
        >
          Reset
        </button>
      </div>

      <div className="my-[18px] mt-4 flex items-center gap-3">
        <div className="h-[7px] flex-1 overflow-hidden rounded" style={{ background: "#eef0f1" }}>
          <div
            className="h-full rounded bg-brand transition-[width] duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="whitespace-nowrap text-[12px] font-semibold text-brand">
          {pct}% complete
        </span>
      </div>

      <div className="grid grid-cols-[1.55fr_1fr] items-start gap-[18px]">
        {/* left: form */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-line bg-white p-[18px_20px]">
            <h3 className="mb-[14px] mt-0 text-[12px] font-bold uppercase tracking-[0.05em] text-[#8a929a]">
              Contact
            </h3>
            <div className="mb-[15px] grid grid-cols-2 gap-[13px]">
              <div>
                <Label>Full name</Label>
                <input
                  value={v.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Rakesh Patel"
                  className="w-full rounded-lg border border-[#d4d8db] px-3 py-[9px] text-[13.5px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <input
                  value={v.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="(408) 555-0000"
                  className="w-full rounded-lg border border-[#d4d8db] px-3 py-[9px] text-[13.5px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
            <Label>Preferred language</Label>
            <div className="mb-[15px] flex flex-wrap gap-2">
              {group("lang", ["English", "Gujarati", "Hindi"])}
            </div>
            <Label>Referral source</Label>
            <div className="flex flex-wrap gap-2">
              {group("source", ["Referral", "Repeat client", "Social", "Web form", "Walk-in"])}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-[18px_20px]">
            <h3 className="mb-[14px] mt-0 text-[12px] font-bold uppercase tracking-[0.05em] text-[#8a929a]">
              Loan need
            </h3>
            <Label>Loan type</Label>
            <div className="mb-[15px] flex flex-wrap gap-2">
              {group("loanType", ["SBA / Business", "Home purchase", "Refinance", "Investment"])}
            </div>
            <Label>Borrower type</Label>
            <div className="mb-[15px] flex flex-wrap gap-2">
              {group("borrower", ["W-2 employee", "Self-employed", "Business owner", "Investor"])}
            </div>
            <Label>Income / revenue range</Label>
            <div className="flex flex-wrap gap-2">
              {group("income", ["Under $75K", "$75–150K", "$150–300K", "$300K+"])}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-[18px_20px]">
            <h3 className="mb-[14px] mt-0 text-[12px] font-bold uppercase tracking-[0.05em] text-[#8a929a]">
              Qualification
            </h3>
            <Label>Credit estimate</Label>
            <div className="mb-[15px] flex flex-wrap gap-2">
              {group("credit", ["Excellent 740+", "Good 680–739", "Fair 620–679", "Below 620 / unsure"])}
            </div>
            <Label>Timeline</Label>
            <div className="mb-[15px] flex flex-wrap gap-2">
              {group("timeline", ["ASAP — ready now", "1–3 months", "3–6 months", "Just exploring"])}
            </div>
            <Label>Existing challenges</Label>
            <div className="mb-[15px] flex flex-wrap gap-2">
              {group("challenge", ["None", "Credit", "Down payment", "Income docs", "Time in business"])}
            </div>
            <Label>Notes from the call</Label>
            <textarea
              value={v.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Anything the borrower mentioned…"
              className="min-h-[70px] w-full resize-y rounded-lg border border-[#d4d8db] px-3 py-[10px] text-[13px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        {/* right: sticky rail */}
        <div className="sticky top-[78px] flex flex-col gap-4">
          <div className="rounded-xl border border-line bg-white p-[17px_19px]">
            <div className="flex items-center justify-between">
              <h3 className="m-0 text-[13px] font-semibold">Live readiness estimate</h3>
              <span className="text-[10.5px] text-faint">internal</span>
            </div>
            <div className="my-[8px] mt-[9px] flex items-baseline gap-[7px]">
              <span
                className="font-serif text-[38px] font-semibold leading-none"
                style={{ color: ec.fg }}
              >
                {est}
              </span>
              <span className="text-[13px] text-faint">/ 100</span>
            </div>
            <div className="h-[7px] overflow-hidden rounded" style={{ background: "#eef0f1" }}>
              <div
                className="h-full rounded transition-[width] duration-200"
                style={{ background: ec.fg, width: `${est}%` }}
              />
            </div>
            <p className="mb-0 mt-[11px] text-[11.5px] leading-[1.5] text-faint">
              Updates as you capture answers. Helps you prioritize before you hang up.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-white p-[17px_19px]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="m-0 text-[13px] font-semibold">Call script</h3>
              <button
                onClick={() => setBilingual((b) => !b)}
                className="rounded-full border border-[#d4d8db] bg-white px-[10px] py-1 font-guj text-[11px] font-semibold text-brand"
              >
                ગુજરાતી
              </button>
            </div>
            {SCRIPTS.map((s, i) => (
              <div key={i} className="border-b border-line3 py-[9px] last:border-0">
                <div className="text-[12.5px] leading-[1.45] text-body">{s.en}</div>
                {bilingual && (
                  <div className="mt-[3px] font-guj text-[12.5px] leading-[1.6] text-brand">
                    {s.guj}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-line bg-white p-[17px_19px]">
            <h3 className="mb-3 mt-0 text-[13px] font-semibold">Call outcome</h3>
            <div className="grid grid-cols-2 gap-[9px]">
              {OUTCOMES.map((o) => {
                const active = outcome === o.key;
                return (
                  <button
                    key={o.key}
                    onClick={() => setOutcome(o.key)}
                    className={`flex flex-col gap-[3px] rounded-[10px] p-[11px_13px] text-left transition ${
                      active ? "border border-brand bg-brand" : "border border-[#d4d8db] bg-white"
                    }`}
                  >
                    <span
                      className="text-[13px] font-bold"
                      style={{ color: active ? "#fff" : "#1a1f24" }}
                    >
                      {o.icon} {o.label}
                    </span>
                    <span
                      className="text-[10.5px] leading-[1.35]"
                      style={{ color: active ? "rgba(255,255,255,.8)" : "#9aa1a8" }}
                    >
                      {o.sub}
                    </span>
                  </button>
                );
              })}
            </div>
            {result && (
              <div className="mt-[13px] rounded-[10px] border border-brand-tintBorder bg-brand-tint p-[13px_15px]">
                <div className="text-[13px] font-bold text-brand-hover">✓ {result.title}</div>
                <div className="mt-1 text-[12px] leading-[1.5] text-brand">{result.desc}</div>
                <button
                  onClick={handleCta}
                  className="mt-[10px] rounded-[7px] bg-brand px-[13px] py-[7px] text-[12px] font-semibold text-white"
                >
                  {result.cta} →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
