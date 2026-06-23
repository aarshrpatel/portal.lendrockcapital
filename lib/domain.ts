// Shared domain constants + pure helpers, ported 1:1 from the Setu prototype.
// Used by both server (seed, data queries) and client components.

import type { CSSProperties } from "react";

export type StageKey =
  | "new"
  | "screening"
  | "qualified"
  | "docs"
  | "consult"
  | "review"
  | "submitted"
  | "lender"
  | "approved"
  | "funded"
  | "nurture"
  | "lost";

export const STAGE: Record<StageKey, { label: string; bg: string; fg: string }> = {
  new: { label: "New inquiry", bg: "#eef2ff", fg: "#4f46e5" },
  screening: { label: "Screening", bg: "#eff6ff", fg: "#2563eb" },
  qualified: { label: "Qualified", bg: "#e6f2f0", fg: "#0e5b54" },
  docs: { label: "Needs documents", bg: "#fffbeb", fg: "#d97706" },
  consult: { label: "Consult scheduled", bg: "#f5f3ff", fg: "#7c3aed" },
  review: { label: "In review", bg: "#ecfeff", fg: "#0891b2" },
  submitted: { label: "Submitted", bg: "#eff6ff", fg: "#2563eb" },
  lender: { label: "Waiting on lender", bg: "#fffbeb", fg: "#d97706" },
  approved: { label: "Approved", bg: "#f0fdf4", fg: "#16a34a" },
  funded: { label: "Closed funded", bg: "#dcfce7", fg: "#15803d" },
  nurture: { label: "Nurture", bg: "#f3f4f6", fg: "#6b7280" },
  lost: { label: "Lost", bg: "#fef2f2", fg: "#b91c1c" },
};

// Stages shown as Kanban columns (in order).
export const PIPE_ORDER: StageKey[] = [
  "new",
  "screening",
  "qualified",
  "docs",
  "consult",
  "review",
  "submitted",
  "lender",
  "approved",
];

// Avatar color palette (bg, fg) cycled by index.
export const AV: [string, string][] = [
  ["#e6f2f0", "#0e5b54"],
  ["#eef2ff", "#4338ca"],
  ["#fef3c7", "#b45309"],
  ["#fce7f3", "#be185d"],
  ["#dcfce7", "#166534"],
  ["#ede9fe", "#6d28d9"],
  ["#e0f2fe", "#0369a1"],
  ["#ffedd5", "#c2410c"],
];

// Document checklist templates by scenario.
export const TPL: Record<string, [string, string][]> = {
  sba: [
    ["Government-issued ID", "Driver’s license or passport"],
    ["Business tax returns — 3 yrs", "2022, 2023, 2024 with schedules"],
    ["Personal tax returns — 3 yrs", "All pages"],
    ["Business bank statements — 6 mo", "Operating accounts"],
    ["Profit & loss statement", "YTD, signed"],
    ["Balance sheet", "Most recent"],
    ["Business debt schedule", "All current obligations"],
    ["Formation documents", "Articles + EIN letter"],
  ],
  "home-w2": [
    ["Government-issued ID", "Driver’s license"],
    ["Pay stubs — 30 days", "Most recent 2"],
    ["W-2s — 2 years", "2023 + 2024"],
    ["Bank statements — 2 mo", "All pages, all accounts"],
    ["Tax returns — 2 yrs", "If extra income"],
  ],
  "home-self": [
    ["Government-issued ID", "Driver’s license"],
    ["Personal tax returns — 2 yrs", "All schedules"],
    ["Business tax returns — 2 yrs", "All schedules"],
    ["Bank statements — 3 mo", "Personal + business"],
    ["YTD profit & loss", "Signed"],
    ["Business license", "If applicable"],
  ],
  investor: [
    ["Government-issued ID", "Driver’s license"],
    ["Rent roll", "Current, all units"],
    ["Operating statements — 2 yrs", "Trailing 12 + prior"],
    ["Personal financial statement", "Signed"],
    ["Bank statements — 3 mo", "Reserves"],
    ["Executed purchase contract", "All addenda"],
  ],
  refi: [
    ["Government-issued ID", "Driver’s license"],
    ["Current mortgage statement", "Existing loan"],
    ["Pay stubs — 30 days", "Most recent 2"],
    ["Bank statements — 2 mo", "All pages"],
    ["Homeowners insurance", "Declarations page"],
  ],
};

export const DOC_TEMPLATES: [string, string][] = [
  ["sba", "SBA / business"],
  ["home-w2", "Home · W-2"],
  ["home-self", "Home · self-employed"],
  ["investor", "Investor"],
  ["refi", "Refinance"],
];

// ---- pure helpers ----

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

export function avatarOf(index: number): { bg: string; fg: string } {
  const [bg, fg] = AV[index % AV.length];
  return { bg, fg };
}

export function money(n: number): string {
  if (!n) return "$0";
  return n >= 1000000
    ? "$" + (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + "M"
    : "$" + Math.round(n / 1000) + "K";
}

export function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Readiness color band.
export function rCol(r: number): { fg: string; bg: string } {
  if (r >= 85) return { fg: "#16a34a", bg: "#f0fdf4" };
  if (r >= 70) return { fg: "#0e5b54", bg: "#e6f2f0" };
  if (r >= 50) return { fg: "#d97706", bg: "#fffbeb" };
  if (r > 0) return { fg: "#dc2626", bg: "#fef2f2" };
  return { fg: "#9aa1a8", bg: "#f3f4f6" };
}

// Which checklist template applies to a case by default.
export function tplKey(cat: string, borrower: string): string {
  if (cat === "sba") return "sba";
  if (cat === "investor") return "investor";
  if (cat === "refi") return "refi";
  return borrower === "self" ? "home-self" : "home-w2";
}

// Inline-style string for a rounded pill badge.
export function badge(bg: string, fg: string, bd?: string): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 9px",
    borderRadius: 20,
    background: bg,
    color: fg,
    border: "1px solid " + (bd || bg),
    whiteSpace: "nowrap",
  };
}

// Deterministic pseudo-random seed (for readiness factor jitter).
export function seed(id: string, salt: number): number {
  let h = salt % 97;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 97;
  return h;
}

export const DOC_STATUS_META: Record<string, [string, string, string, string]> = {
  requested: ["Requested", "#fffbeb", "#b45309", "#fde68a"],
  received: ["Received", "#eff6ff", "#2563eb", "#dbeafe"],
  approved: ["Approved", "#f0fdf4", "#16a34a", "#bbf7d0"],
  rejected: ["Rejected", "#fef2f2", "#b91c1c", "#fecaca"],
};

export const DOC_NEXT_LABEL: Record<string, string> = {
  requested: "Mark received",
  received: "Approve",
  approved: "Reset",
  rejected: "Re-request",
};

export const DOC_CYCLE_NEXT: Record<string, string> = {
  requested: "received",
  received: "approved",
  approved: "requested",
  rejected: "requested",
};

export function isDocHave(status: string): boolean {
  return status === "received" || status === "approved";
}
