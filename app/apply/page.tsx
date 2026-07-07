"use client";

// The public two-step application (Module 01 §2.2) — the form the marketing
// site's "Apply now" CTA embeds. Step 1 (< 60 seconds) creates the lead
// immediately; step 2 deepens qualification. Abandoning step 2 still leaves
// a workable lead with a chase sequence.

import { useState } from "react";

const USE_OF_FUNDS = [
  ["FIX_FLIP", "Fix & flip", "Buy and renovate to sell"],
  ["RENTAL_BRIDGE", "Rental / investment", "Buy or refi an investment property"],
  ["GROUND_UP", "New construction", "Ground-up build"],
  ["BRIDGE_CRE", "CRE bridge", "Short-term commercial RE need"],
  ["EQUIPMENT", "Equipment", "Purchase machinery or vehicles"],
  ["WORKING_CAPITAL", "Working capital", "Cash-flow cushion or line of credit"],
  ["ACQUISITION", "Buy a business", "Acquisition financing"],
  ["EXPANSION_LONG", "Long-term expansion", "Lowest rate, longer runway"],
] as const;

const TIMELINES = [
  ["ASAP", "As fast as possible"],
  ["UNDER_30D", "Within 30 days"],
  ["D30_90", "30–90 days"],
  ["OVER_90D", "90+ days"],
  ["EXPLORING", "Just exploring"],
];

const CREDIT = [
  ["EXCELLENT", "Excellent (720+)"],
  ["GOOD", "Good (680–719)"],
  ["FAIR", "Fair (620–679)"],
  ["POOR", "Below 620"],
  ["UNKNOWN", "Not sure"],
];

export default function ApplyPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", companyName: "",
    state: "", useOfFunds: "", amount: "", fundingTimeline: "", creditStated: "", smsConsent: false,
  });

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(finalStep: boolean) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount) || 0, formVariant: finalStep ? "apply_full" : "apply_step1" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong — try again.");
      }
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-page">
      <div className="portal-hero text-white">
        <div className="max-w-xl mx-auto px-5 pt-8 pb-16 text-center">
          <p className="font-serif text-[22px] font-semibold tracking-tight">Lendrock Capital</p>
          <h1 className="font-serif text-[30px] font-semibold tracking-tight mt-5 text-balance leading-tight">
            Tell us what you&apos;re financing.
          </h1>
          <p className="text-[14px] text-white/60 mt-2">Options in minutes, not days. No hard credit pull — ever.</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pb-12 -mt-9">
        <div className="card shadow-raised p-6">
          {step !== 3 ? (
            <div className="flex items-center gap-2 mb-5">
              {[1, 2].map((s) => (
                <span key={s} className={`h-1.5 rounded-full transition-all ${step === s ? "w-8 bg-brand" : "w-4 bg-line"}`} />
              ))}
              <span className="text-2xs text-faint ml-2">Step {step} of 2{step === 1 ? " · ~60 seconds" : ""}</span>
            </div>
          ) : null}

          {step === 1 ? (
            <form onSubmit={(e) => { e.preventDefault(); if (form.useOfFunds) setStep(2); }} className="grid gap-3">
              <div>
                <p className="label mb-2">What are the funds for?</p>
                <div className="grid grid-cols-2 gap-2">
                  {USE_OF_FUNDS.map(([code, title, desc]) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => set("useOfFunds", code)}
                      className={`text-left rounded-lg border px-3 py-2.5 transition-all ${
                        form.useOfFunds === code
                          ? "border-brand bg-brand-tint/60 shadow-card"
                          : "border-line bg-white hover:border-brand/50"
                      }`}
                    >
                      <span className={`block text-[13px] font-semibold ${form.useOfFunds === code ? "text-brand" : "text-ink"}`}>{title}</span>
                      <span className="block text-2xs text-faint mt-0.5 leading-snug">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <input required placeholder="First name" className="input py-2" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
                <input required placeholder="Last name" className="input py-2" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
              </div>
              <input required type="email" placeholder="Email" className="input py-2" value={form.email} onChange={(e) => set("email", e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Mobile phone" className="input py-2" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                <input type="number" placeholder="Amount needed ($)" className="input py-2" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
              </div>
              <select required className="input py-2" value={form.fundingTimeline} onChange={(e) => set("fundingTimeline", e.target.value)}>
                <option value="" disabled>How fast do you need it?</option>
                {TIMELINES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {/* honeypot */}
              <input name="website" className="hidden" tabIndex={-1} autoComplete="off" />
              <button className="btn btn-primary justify-center py-2.5 text-[14px] mt-1" disabled={busy || !form.useOfFunds}>
                See my options →
              </button>
              <p className="text-2xs text-faint text-center">Business-purpose financing only.</p>
            </form>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <p className="label">Sharpen the picture</p>
                <button className="text-2xs text-faint underline hover:text-muted" onClick={() => submit(false)} disabled={busy}>
                  skip for now
                </button>
              </div>
              <input placeholder="Company / entity name" className="input py-2" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="State (e.g. TX)" maxLength={2} className="input py-2 font-mono uppercase" value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} />
                <select className="input py-2" value={form.creditStated} onChange={(e) => set("creditStated", e.target.value)}>
                  <option value="" disabled>Credit (estimate is fine)</option>
                  {CREDIT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-body cursor-pointer">
                <input type="checkbox" checked={form.smsConsent} onChange={(e) => set("smsConsent", e.target.checked)} />
                Text me updates about my request
              </label>
              {error ? <p className="text-[13px] text-oxide bg-oxide-tint rounded-md px-3 py-2">{error}</p> : null}
              <button className="btn btn-primary justify-center py-2.5 text-[14px]" onClick={() => submit(true)} disabled={busy}>
                {busy ? "Submitting…" : "Submit — get matched"}
              </button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="text-center py-8">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-tint text-brand text-[20px] mb-4">✓</span>
              <p className="font-serif text-[22px] font-semibold text-ink">Request received.</p>
              <p className="text-[13.5px] text-body mt-2 max-w-sm mx-auto leading-relaxed">
                A loan officer will reach out within minutes during business hours. Watch for a text or
                email from Lendrock — we move fast.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
