// Module 06 — the document requirements catalog. Requirements are data;
// this seeds/queries the catalog and materializes a deal's checklist.

export type DocSpec = {
  docCode: string;
  name: string;
  category: string;
  dealTypes: string[]; // pathways where REQUIRED
  conditional?: string;
  freshnessDays?: number;
  stageGate?: string; // stage whose exit needs this ACCEPTED
};

export const DOC_CATALOG: DocSpec[] = [
  // ENTITY
  { docCode: "ENT_ARTICLES", name: "Articles of Organization / Incorporation", category: "ENTITY", dealTypes: ["HM", "BB", "WC", "SBA"], stageGate: "APPLICATION" },
  { docCode: "ENT_OPERATING_AGMT", name: "Operating Agreement / Bylaws", category: "ENTITY", dealTypes: ["HM", "BB", "WC", "SBA"], stageGate: "APPLICATION" },
  { docCode: "ENT_EIN_LETTER", name: "EIN Letter (IRS CP-575)", category: "ENTITY", dealTypes: ["HM", "BB", "WC", "SBA"], stageGate: "APPLICATION" },
  { docCode: "ENT_GOOD_STANDING", name: "Certificate of Good Standing", category: "ENTITY", dealTypes: ["HM", "BB", "WC", "SBA"], freshnessDays: 90, stageGate: "UNDERWRITING" },
  { docCode: "ENT_W9", name: "Form W-9", category: "ENTITY", dealTypes: ["HM", "BB", "WC", "SBA"], stageGate: "APPLICATION" },
  // GUARANTOR
  { docCode: "GOV_ID", name: "Government ID — all guarantors", category: "GUARANTOR", dealTypes: ["HM", "BB", "WC", "SBA"], stageGate: "APPLICATION" },
  { docCode: "CREDIT_AUTH", name: "Signed credit/background authorization", category: "GUARANTOR", dealTypes: ["HM", "BB", "WC", "SBA"], stageGate: "APPLICATION" },
  { docCode: "PFS", name: "Personal Financial Statement", category: "GUARANTOR", dealTypes: ["HM", "BB", "SBA"], freshnessDays: 90, stageGate: "UNDERWRITING" },
  { docCode: "TRACK_RECORD", name: "Track record — completed projects", category: "GUARANTOR", dealTypes: ["HM"], stageGate: "APPLICATION" },
  // FINANCIALS
  { docCode: "BANK_STMT_BIZ", name: "Business bank statements (or bank link)", category: "FINANCIALS", dealTypes: ["HM", "BB", "WC"], freshnessDays: 60, stageGate: "APPLICATION" },
  { docCode: "TAX_RETURN_BIZ", name: "Business tax returns (2–3 years)", category: "FINANCIALS", dealTypes: ["BB", "SBA"], stageGate: "UNDERWRITING" },
  { docCode: "TAX_RETURN_PERS", name: "Personal tax returns (3 years)", category: "FINANCIALS", dealTypes: ["SBA"], stageGate: "APPLICATION" },
  { docCode: "YTD_FINANCIALS", name: "YTD P&L + balance sheet", category: "FINANCIALS", dealTypes: ["BB", "WC", "SBA"], freshnessDays: 120, stageGate: "UNDERWRITING" },
  { docCode: "DEBT_SCHEDULE", name: "Business debt schedule", category: "FINANCIALS", dealTypes: ["BB", "WC", "SBA"], stageGate: "UNDERWRITING" },
  { docCode: "AR_AGING", name: "AR aging report", category: "FINANCIALS", dealTypes: [], conditional: "WC borrowing-base structure; BB/SBA on request", stageGate: "UNDERWRITING" },
  // COLLATERAL
  { docCode: "PURCHASE_CONTRACT", name: "Purchase contract (or settlement statement)", category: "COLLATERAL", dealTypes: ["HM"], stageGate: "APPLICATION" },
  { docCode: "REHAB_BUDGET", name: "Rehab budget (Lendrock template)", category: "COLLATERAL", dealTypes: [], conditional: "HM_FF / HM_GUC", stageGate: "APPLICATION" },
  { docCode: "PLANS_PERMITS", name: "Plans + permits", category: "COLLATERAL", dealTypes: [], conditional: "HM_GUC", stageGate: "UNDERWRITING" },
  { docCode: "APPRAISAL", name: "Valuation report (per size matrix)", category: "COLLATERAL", dealTypes: ["HM"], freshnessDays: 120, stageGate: "UNDERWRITING" },
  { docCode: "TITLE_COMMITMENT", name: "Title commitment", category: "COLLATERAL", dealTypes: ["HM"], stageGate: "DOCS_CLOSING" },
  { docCode: "LEASES_RENT_ROLL", name: "Leases / rent roll", category: "COLLATERAL", dealTypes: [], conditional: "HM_BTP tenanted; BB_CRE", stageGate: "UNDERWRITING" },
  { docCode: "PAYOFF_DEMAND", name: "Existing lien payoff demand", category: "COLLATERAL", dealTypes: [], conditional: "Refinance only", stageGate: "DOCS_CLOSING" },
  // INSURANCE
  { docCode: "INS_PROPERTY", name: "Property/hazard insurance binder + paid receipt", category: "INSURANCE", dealTypes: ["HM"], stageGate: "DOCS_CLOSING" },
  { docCode: "FLOOD_CERT", name: "Flood certification", category: "INSURANCE", dealTypes: ["HM"], stageGate: "DOCS_CLOSING" },
  // SBA
  { docCode: "SBA_1919", name: "SBA Form 1919 — Borrower Information", category: "SBA", dealTypes: ["SBA"], stageGate: "APPLICATION" },
  { docCode: "SBA_413", name: "SBA Form 413 — Personal Financial Statement", category: "SBA", dealTypes: ["SBA"], freshnessDays: 90, stageGate: "APPLICATION" },
  { docCode: "SBA_912", name: "SBA Form 912 — Statement of Personal History", category: "SBA", dealTypes: [], conditional: "If required by responses on 1919", stageGate: "APPLICATION" },
  { docCode: "BUSINESS_PLAN", name: "Business plan + projections", category: "SBA", dealTypes: [], conditional: "Startups / acquisitions", stageGate: "APPLICATION" },
  { docCode: "FORM_159", name: "SBA Form 159 — Fee Disclosure (signed)", category: "SBA", dealTypes: ["SBA"], stageGate: "ENGAGED" },
  // CLOSING
  { docCode: "BUSINESS_PURPOSE_CERT", name: "Business-purpose certification", category: "CLOSING", dealTypes: ["HM", "BB", "WC"], stageGate: "DOCS_CLOSING" },
  { docCode: "BANKING_ACH", name: "ACH authorization + banking details", category: "CLOSING", dealTypes: ["HM", "BB", "WC"], stageGate: "DOCS_CLOSING" },
];

export function docsForDeal(dealType: string, subType: string): DocSpec[] {
  return DOC_CATALOG.filter((d) => {
    if (d.dealTypes.includes(dealType)) return true;
    if (!d.conditional) return false;
    // conditional docs keyed off sub-type
    if (d.docCode === "REHAB_BUDGET") return subType === "HM_FF" || subType === "HM_GUC";
    if (d.docCode === "PLANS_PERMITS") return subType === "HM_GUC";
    if (d.docCode === "LEASES_RENT_ROLL") return subType === "HM_BTP" || subType === "BB_CRE";
    if (d.docCode === "AR_AGING") return subType === "WC_BORROWING_BASE";
    return false;
  });
}
