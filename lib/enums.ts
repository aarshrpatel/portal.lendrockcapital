// Canonical vocabulary — Module 09 §9.1. Statuses are SCREAMING_SNAKE strings
// in the DB; this file is the single source of truth for what's valid.

export const ROLES = ["LO", "PROC", "UW", "CM", "PRIN", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const DEAL_TYPES = ["HM", "BB", "WC", "SBA"] as const;
export type DealType = (typeof DEAL_TYPES)[number];

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  HM: "Hard Money RE",
  BB: "Bridge & Business",
  WC: "Working Capital LOC",
  SBA: "SBA / Bank-Facilitated",
};

export const SUB_TYPES: Record<DealType, { code: string; label: string }[]> = {
  HM: [
    { code: "HM_FF", label: "Fix & Flip" },
    { code: "HM_BTP", label: "Bridge-to-Perm" },
    { code: "HM_GUC", label: "Ground-Up Construction" },
  ],
  BB: [
    { code: "BB_CRE", label: "CRE Bridge" },
    { code: "BB_BIZ", label: "Business Loan" },
  ],
  WC: [
    { code: "WC_STANDARD", label: "Standard LOC" },
    { code: "WC_BORROWING_BASE", label: "Borrowing-Base LOC" },
  ],
  SBA: [{ code: "SBA_7A", label: "SBA 7(a) Package" }],
};

export function subTypeLabel(code: string): string {
  for (const list of Object.values(SUB_TYPES)) {
    const hit = list.find((s) => s.code === code);
    if (hit) return hit.label;
  }
  return code;
}

// Lead pipeline (pre-conversion, Module 01)
export const LEAD_STAGES = ["NEW_LEAD", "CONTACTED", "QUALIFIED", "CONVERTED", "DEAD"] as const;

// Deal pipeline (post-conversion). SBA replaces TERM_SHEET with its own
// packaging stages per Module 05.
export const DEAL_STAGES_STANDARD = [
  "APPLICATION",
  "TERM_SHEET",
  "UNDERWRITING",
  "APPROVED",
  "DOCS_CLOSING",
  "FUNDED",
  "SERVICING",
  "PAID_OFF",
] as const;

export const DEAL_STAGES_SBA = [
  "ENGAGED",
  "APPLICATION",
  "LENDER_MATCHING",
  "SUBMITTED",
  "UNDERWRITING",
  "APPROVED",
  "DOCS_CLOSING",
  "FUNDED",
] as const;

export const TERMINAL_STAGES = ["DEAD", "DECLINED"] as const;

export function stagesFor(dealType: string): readonly string[] {
  return dealType === "SBA" ? DEAL_STAGES_SBA : DEAL_STAGES_STANDARD;
}

export const STAGE_LABELS: Record<string, string> = {
  NEW_LEAD: "New Lead",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  CONVERTED: "Converted",
  ENGAGED: "Engaged",
  APPLICATION: "Application",
  TERM_SHEET: "Term Sheet",
  LENDER_MATCHING: "Lender Matching",
  SUBMITTED: "Submitted",
  UNDERWRITING: "Underwriting",
  APPROVED: "Approved",
  DOCS_CLOSING: "Docs & Closing",
  FUNDED: "Funded",
  SERVICING: "Servicing",
  PAID_OFF: "Paid Off",
  DEAD: "Dead",
  DECLINED: "Declined",
};

// Stage owner (accountable role for the exit) — Module 02–05 stage tables.
export const STAGE_OWNER: Record<string, Role> = {
  NEW_LEAD: "LO",
  CONTACTED: "LO",
  QUALIFIED: "LO",
  ENGAGED: "LO",
  APPLICATION: "PROC",
  TERM_SHEET: "LO",
  LENDER_MATCHING: "CM",
  SUBMITTED: "CM",
  UNDERWRITING: "UW",
  APPROVED: "UW",
  DOCS_CLOSING: "PROC",
  FUNDED: "CM",
  SERVICING: "PROC",
  PAID_OFF: "PROC",
};

// Target SLA in business hours by stage (portal-wide defaults; pathway
// specifics live in the spec's stage tables).
export const STAGE_SLA_HOURS: Record<string, number> = {
  NEW_LEAD: 8,
  CONTACTED: 16,
  QUALIFIED: 8,
  ENGAGED: 24,
  APPLICATION: 24,
  TERM_SHEET: 8,
  LENDER_MATCHING: 40,
  SUBMITTED: 80,
  UNDERWRITING: 40,
  APPROVED: 8,
  DOCS_CLOSING: 32,
  FUNDED: 16,
};

export const USE_OF_FUNDS_OPTIONS: { code: string; label: string; dealType: DealType }[] = [
  { code: "FIX_FLIP", label: "Buy & renovate a property to sell", dealType: "HM" },
  { code: "RENTAL_BRIDGE", label: "Buy or refi a rental / investment property", dealType: "HM" },
  { code: "GROUND_UP", label: "New construction project", dealType: "HM" },
  { code: "BRIDGE_CRE", label: "Short-term commercial real estate need", dealType: "BB" },
  { code: "EQUIPMENT", label: "Purchase equipment", dealType: "BB" },
  { code: "WORKING_CAPITAL", label: "Working capital / cash-flow cushion", dealType: "WC" },
  { code: "ACQUISITION", label: "Buy a business", dealType: "SBA" },
  { code: "EXPANSION_LONG", label: "Long-term expansion, lowest rate", dealType: "SBA" },
];

export const TIMELINE_OPTIONS = [
  { code: "ASAP", label: "As fast as possible" },
  { code: "UNDER_30D", label: "Within 30 days" },
  { code: "D30_90", label: "30–90 days" },
  { code: "OVER_90D", label: "90+ days" },
  { code: "EXPLORING", label: "Just exploring" },
];

export const CREDIT_OPTIONS = [
  { code: "EXCELLENT", label: "Excellent (720+)" },
  { code: "GOOD", label: "Good (680–719)" },
  { code: "FAIR", label: "Fair (620–679)" },
  { code: "POOR", label: "Below 620" },
  { code: "UNKNOWN", label: "Not sure" },
];

// Industry taxonomy for knockout screening (Module 01 §4.4). Codes are what
// KnockoutRule IN/NOT_IN lists match against — keep them stable.
export const INDUSTRY_OPTIONS = [
  { code: "REAL_ESTATE", label: "Real estate investment" },
  { code: "CONSTRUCTION", label: "Construction / trades" },
  { code: "RESTAURANT", label: "Restaurant / food service" },
  { code: "RETAIL", label: "Retail" },
  { code: "ECOMMERCE", label: "E-commerce" },
  { code: "TRUCKING", label: "Trucking / logistics" },
  { code: "HEALTHCARE", label: "Healthcare / medical" },
  { code: "PROFESSIONAL_SERVICES", label: "Professional services" },
  { code: "MANUFACTURING", label: "Manufacturing" },
  { code: "HOSPITALITY", label: "Hospitality / lodging" },
  { code: "AUTO_SERVICES", label: "Auto sales / services" },
  { code: "ADULT", label: "Adult entertainment" },
  { code: "CANNABIS", label: "Cannabis" },
  { code: "GAMBLING", label: "Gambling / gaming" },
  { code: "FIREARMS_DEALER", label: "Firearms dealer" },
  { code: "CRYPTO_MINING", label: "Crypto mining" },
  { code: "OTHER", label: "Other" },
];

export const DOC_CATEGORIES = [
  "ENTITY",
  "GUARANTOR",
  "FINANCIALS",
  "COLLATERAL",
  "INSURANCE",
  "SBA",
  "CLOSING",
] as const;

export const TASK_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "BLOCKED",
  "WAITING_EXTERNAL",
  "DONE",
  "CANCELLED",
  "WAIVED",
] as const;

export const PARTICIPATION_STATUSES = [
  "SOFT_COMMIT",
  "DOCS_OUT",
  "SIGNED",
  "WIRED",
  "ACTIVE",
  "REPAID",
  "CANCELLED",
] as const;
