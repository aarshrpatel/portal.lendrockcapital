// Seed: a realistic book of business — team, config, and deals across all
// four pathways at every pipeline stage. Run: npm run db:seed

import { PrismaClient } from "@prisma/client";
import { docsForDeal } from "../lib/domain/docs";
import { playbookFor } from "../lib/domain/playbooks";
import { stagesFor } from "../lib/enums";

const db = new PrismaClient();

const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);
const daysAhead = (n: number) => new Date(Date.now() + n * 86400_000);
const $ = (dollars: number) => Math.round(dollars * 100);

async function main() {
  // wipe (order matters for FKs)
  await db.$transaction([
    db.approvalSignoff.deleteMany(), db.approval.deleteMany(), db.creditBoxRun.deleteMany(),
    db.wcDraw.deleteMany(), db.wcLine.deleteMany(), db.drawRequest.deleteMany(),
    db.transaction.deleteMany(), db.participation.deleteMany(), db.sbaSubmission.deleteMany(),
    db.form159Record.deleteMany(), db.complianceCheck.deleteMany(), db.messageLog.deleteMany(),
    db.documentRequest.deleteMany(), db.task.deleteMany(), db.stageEvent.deleteMany(),
    db.collateral.deleteMany(), db.dealContact.deleteMany(), db.deal.deleteMany(),
    db.lead.deleteMany(), db.investor.deleteMany(), db.contact.deleteMany(), db.company.deleteMany(),
    db.broker.deleteMany(), db.partnerLender.deleteMany(), db.template.deleteMany(),
    db.creditBoxRule.deleteMany(), db.licensingMatrix.deleteMany(), db.deadReason.deleteMany(),
    db.docRequirement.deleteMany(), db.ofacScreen.deleteMany(), db.auditLog.deleteMany(), db.user.deleteMany(),
  ]);

  // ── team ──
  const [maya, dani, rob, priya, aarsh] = await Promise.all([
    db.user.create({ data: { name: "Maya Chen", email: "maya@lendrockcapital.com", role: "LO" } }),
    db.user.create({ data: { name: "Danielle Ortiz", email: "danielle@lendrockcapital.com", role: "PROC" } }),
    db.user.create({ data: { name: "Rob Feldman", email: "rob@lendrockcapital.com", role: "UW" } }),
    db.user.create({ data: { name: "Priya Nair", email: "priya@lendrockcapital.com", role: "CM" } }),
    db.user.create({ data: { name: "Aarsh Patel", email: "aarsh@lendrockcapital.com", role: "PRIN" } }),
  ]);

  // ── licensing matrix (B1: unmapped states are blocked by design) ──
  await db.licensingMatrix.createMany({
    data: [
      { state: "TX", licensed: true, licenseType: "No license required (business-purpose)", cfdlRequired: false },
      { state: "FL", licensed: true, licenseType: "Exempt — business-purpose, entity borrower", cfdlRequired: true, notes: "FL CFDL for BB/WC ≥ threshold" },
      { state: "GA", licensed: true, licenseType: "No license required (commercial)", cfdlRequired: true },
      { state: "TN", licensed: true, licenseType: "No license required (commercial)", cfdlRequired: false },
      { state: "CO", licensed: true, licenseType: "No license required (commercial)", cfdlRequired: false },
      { state: "NC", licensed: true, licenseType: "No license required (commercial)", cfdlRequired: false },
      { state: "OH", licensed: true, licenseType: "No license required (commercial)", cfdlRequired: false },
      { state: "CA", licensed: true, licenseType: "CFL license #60DBO-XXXX", cfdlRequired: true, notes: "SB 1235 disclosures at term sheet" },
      { state: "NY", licensed: false, licenseType: "", cfdlRequired: true, notes: "NY CFDL + usury exposure — footprint decision pending" },
      { state: "AZ", licensed: false, licenseType: "", cfdlRequired: false, notes: "In-state office requirement — not filed" },
      { state: "NV", licensed: false, licenseType: "", cfdlRequired: false, notes: "License required — not filed" },
    ],
  });

  // ── credit-box rules (rules-as-data; Module 02/03/04 guardrails) ──
  await db.creditBoxRule.createMany({
    data: [
      // HM hard stops (never exceptionable)
      { dealType: "HM", subType: "", field: "fico_mid", op: "GTE", value: 620, severity: "HARD", label: "FICO hard floor 620" },
      { dealType: "HM", subType: "", field: "ltarv_bps", op: "LTE", value: 7500, severity: "HARD", label: "LTARV hard ceiling 75%" },
      // HM_FF
      { dealType: "HM", subType: "HM_FF", field: "ltv_bps", op: "LTE", value: 8000, severity: "SOFT", label: "Max LTV (as-is) 80%" },
      { dealType: "HM", subType: "HM_FF", field: "ltarv_bps", op: "LTE", value: 7000, severity: "SOFT", label: "Max LTARV 70%" },
      { dealType: "HM", subType: "HM_FF", field: "ltc_bps", op: "LTE", value: 8500, severity: "SOFT", label: "Max LTC 85%" },
      { dealType: "HM", subType: "HM_FF", field: "fico_mid", op: "GTE", value: 660, severity: "SOFT", label: "Min FICO 660" },
      // HM_BTP
      { dealType: "HM", subType: "HM_BTP", field: "ltv_bps", op: "LTE", value: 7000, severity: "SOFT", label: "Max LTV 70%" },
      { dealType: "HM", subType: "HM_BTP", field: "fico_mid", op: "GTE", value: 680, severity: "SOFT", label: "Min FICO 680" },
      // HM_GUC
      { dealType: "HM", subType: "HM_GUC", field: "ltv_bps", op: "LTE", value: 6000, severity: "SOFT", label: "Max LTV (entitled land) 60%" },
      { dealType: "HM", subType: "HM_GUC", field: "ltarv_bps", op: "LTE", value: 6500, severity: "SOFT", label: "Max LTARV 65%" },
      { dealType: "HM", subType: "HM_GUC", field: "fico_mid", op: "GTE", value: 680, severity: "SOFT", label: "Min FICO 680" },
      // BB
      { dealType: "BB", subType: "", field: "fico_mid", op: "GTE", value: 580, severity: "HARD", label: "FICO hard floor 580" },
      { dealType: "BB", subType: "BB_BIZ", field: "monthly_revenue_cents", op: "GTE", value: $(30_000), severity: "SOFT", label: "Min monthly revenue $30k" },
      { dealType: "BB", subType: "BB_BIZ", field: "fico_mid", op: "GTE", value: 640, severity: "SOFT", label: "Min FICO 640" },
      { dealType: "BB", subType: "BB_BIZ", field: "dscr_bps", op: "GTE", value: 12000, severity: "SOFT", label: "Business DSCR ≥ 1.20" },
      { dealType: "BB", subType: "BB_CRE", field: "ltv_bps", op: "LTE", value: 7000, severity: "SOFT", label: "Max as-is LTV 70%" },
      { dealType: "BB", subType: "BB_CRE", field: "fico_mid", op: "GTE", value: 600, severity: "SOFT", label: "Min FICO 600" },
      // WC
      { dealType: "WC", subType: "", field: "monthly_revenue_cents", op: "GTE", value: $(15_000), severity: "SOFT", label: "Min monthly revenue $15k" },
      { dealType: "WC", subType: "", field: "fico_mid", op: "GTE", value: 600, severity: "SOFT", label: "Min FICO 600" },
      { dealType: "WC", subType: "", field: "amount_cents", op: "LTE", value: $(250_000), severity: "SOFT", label: "House cap $250k (PRIN exception to $500k)" },
    ],
  });

  // ── dead-reason taxonomy ──
  await db.deadReason.createMany({
    data: [
      { code: "DEAD_UNRESPONSIVE", coreCode: "UNRESPONSIVE", label: "Went dark — no response to cadence" },
      { code: "DEAD_RATE_SHOPPED", coreCode: "LOST_COMPETITOR", label: "Rate-shopped to a cheaper lender" },
      { code: "DEAD_LOST_TO_COMPETITOR", coreCode: "LOST_COMPETITOR", label: "Lost to competitor (speed/terms)" },
      { code: "DEAD_TIMELINE_MISMATCH", coreCode: "TIMING", label: "Timeline mismatch — not ready" },
      { code: "DEAD_DEAL_TYPE_MISMATCH", coreCode: "FIT", label: "Wrong pathway — rerouted or referred out" },
      { code: "DEAD_WITHDREW", coreCode: "WITHDREW", label: "Borrower withdrew request" },
      { code: "DEAD_PROPERTY_FELL_THROUGH", coreCode: "FIT", pathwayScope: "HM", label: "Property/contract fell through" },
      { code: "DEAD_INSUFFICIENT_DOCS", coreCode: "STALLED", label: "Stalled — never completed documents" },
      { code: "DEAD_BROKER_PULLED", coreCode: "WITHDREW", label: "Broker pulled the deal" },
      { code: "DEAD_DUPLICATE", coreCode: "DUPLICATE", label: "Duplicate record (merged)" },
      { code: "DQ_EXCLUDED_STATE", coreCode: "KNOCKOUT", label: "Unlicensed state (auto-DQ)" },
      { code: "DQ_CONSUMER_PURPOSE", coreCode: "KNOCKOUT", label: "Consumer purpose (auto-DQ)" },
      { code: "DQ_PROHIBITED_INDUSTRY", coreCode: "KNOCKOUT", label: "Prohibited industry (auto-DQ)" },
      { code: "DQ_BELOW_MINIMUM", coreCode: "KNOCKOUT", label: "Below $25k minimum (auto-DQ)" },
    ],
  });

  // ── doc requirement catalog (mirror of lib/domain/docs.ts, persisted) ──
  for (const spec of (await import("../lib/domain/docs")).DOC_CATALOG) {
    await db.docRequirement.create({
      data: {
        docCode: spec.docCode, name: spec.name, category: spec.category,
        dealTypes: spec.dealTypes.join(","), conditional: spec.conditional ?? "",
        freshnessDays: spec.freshnessDays ?? 0, stageGate: spec.stageGate ?? "",
      },
    });
  }

  // ── templates ──
  const T = (code: string, name: string, category: string, dealTypes: string, delivery: string, attorneyReview = false) =>
    ({ code, name, category, dealTypes, delivery, attorneyReview, body: `{{borrower_legal_name}} · {{loan_amount}} · {{interest_rate}} — ${name}` });
  await db.template.createMany({
    data: [
      T("APP_UNIVERSAL", "Universal Loan Application", "APPLICATION", "ALL", "WEB_FORM"),
      T("SUPP_HM", "HM Supplement — Property & Rehab Budget", "APPLICATION", "HM", "WEB_FORM"),
      T("SUPP_BB", "BB Supplement — Use of Funds", "APPLICATION", "BB", "WEB_FORM"),
      T("SUPP_WC", "WC Supplement — Banking", "APPLICATION", "WC", "WEB_FORM"),
      T("SUPP_SBA", "SBA Supplement — Package Intake", "APPLICATION", "SBA", "WEB_FORM"),
      T("PFS_FORM", "Personal Financial Statement", "APPLICATION", "ALL", "WEB_FORM"),
      T("DEBT_SCHEDULE", "Business Debt Schedule", "APPLICATION", "BB,WC,SBA", "WEB_FORM"),
      T("TS_HM", "Term Sheet — Hard Money", "TERM_SHEET", "HM", "ESIGN"),
      T("TS_BB", "Term Sheet — Bridge/Business", "TERM_SHEET", "BB", "ESIGN"),
      T("TS_WC", "LOC Indicative Offer", "TERM_SHEET", "WC", "ESIGN"),
      T("SBA_PROPOSAL", "SBA Proposal Letter", "TERM_SHEET", "SBA", "PDF"),
      T("COMMITMENT_LTR", "Commitment Letter", "TERM_SHEET", "ALL", "ESIGN"),
      T("DECLINE_LTR", "Adverse-Action Notice (ECOA/FCRA combined)", "TERM_SHEET", "ALL", "PDF", true),
      T("NOTE", "Promissory Note", "LEGAL", "HM,BB", "ESIGN", true),
      T("MTG_DOT", "Mortgage / Deed of Trust (state variants)", "LEGAL", "HM", "ESIGN", true),
      T("GUARANTY", "Personal Guaranty (unlimited, J&S)", "LEGAL", "ALL", "ESIGN", true),
      T("SEC_AGMT_UCC", "Security Agreement + UCC-1", "LEGAL", "BB,WC", "ESIGN", true),
      T("LOC_AGMT", "Revolving LOC Agreement", "LEGAL", "WC", "ESIGN", true),
      T("PART_AGMT", "Master Loan Participation Agreement", "LEGAL", "ALL", "ESIGN", true),
      T("BPC", "Business-Purpose Certification", "LEGAL", "HM,BB,WC", "ESIGN"),
      T("DRAW_REQ", "Draw Request Form", "SERVICING", "HM,WC", "WEB_FORM"),
      T("INSPECTION_RPT", "Draw Inspection Report", "SERVICING", "HM", "PDF"),
      T("EXT_AGMT", "Extension Agreement (3-mo, 1.0%/1.5%)", "SERVICING", "HM,BB", "ESIGN", true),
      T("PAYOFF_DEMAND", "Payoff Statement (per-diem)", "SERVICING", "ALL", "PDF"),
      T("INVESTOR_TEASER", "Deal Teaser / Offering Summary", "CAPITAL", "ALL", "EMAIL"),
      T("INVESTOR_COMMIT_LTR", "Investor Commitment Letter", "CAPITAL", "ALL", "ESIGN"),
      T("MONTHLY_STMT", "Investor Monthly Statement", "CAPITAL", "ALL", "PDF"),
      T("BROKER_FEE_AGMT", "Broker Fee Agreement (HM/BB/WC only)", "PARTNER", "HM,BB,WC", "ESIGN"),
      T("SBA_REFERRAL_AGMT", "SBA Partner Referral Agreement", "PARTNER", "SBA", "ESIGN", true),
      T("SBA_COVER_MEMO", "SBA Package Cover Memo", "PARTNER", "SBA", "PDF"),
      T("SEQ_LEAD_RESPONSE", "Speed-to-lead auto-response", "SEQUENCE", "ALL", "SMS"),
      T("SEQ_DOC_CHASE", "Document chase cadence (d1/3/5/7)", "SEQUENCE", "ALL", "EMAIL"),
      T("SEQ_STAGE_UPDATES", "Stage-change borrower updates", "SEQUENCE", "ALL", "EMAIL"),
      T("SEQ_DEAD_NURTURE", "Dead-lead nurture & resurrection", "SEQUENCE", "ALL", "EMAIL"),
      T("SEQ_DUNNING", "Late-payment dunning ladder", "SEQUENCE", "ALL", "EMAIL"),
      T("SEQ_SBA_WEEKLY", "SBA weekly status cadence", "SEQUENCE", "SBA", "EMAIL"),
    ],
  });

  // ── partner lenders & brokers ──
  const [fcb, summit, heritage, lakeline] = await Promise.all([
    db.partnerLender.create({ data: { name: "First Coastal Bank", programs: "SBA_7A", minAmountCents: $(250_000), maxAmountCents: $(5_000_000), turnaroundDays: 45, contactName: "J. Whitfield", contactEmail: "jwhitfield@firstcoastal.example" } }),
    db.partnerLender.create({ data: { name: "Summit Community Bank", programs: "SBA_7A,SBA_504", minAmountCents: $(500_000), maxAmountCents: $(10_000_000), turnaroundDays: 35, noShoppedDeals: true, contactName: "R. Alvarez", contactEmail: "ralvarez@summitcb.example" } }),
    db.partnerLender.create({ data: { name: "Heritage National", programs: "SBA_7A,CONVENTIONAL", minAmountCents: $(100_000), maxAmountCents: $(3_000_000), turnaroundDays: 30, contactName: "T. Okafor", contactEmail: "tokafor@heritagenat.example" } }),
    db.partnerLender.create({ data: { name: "Lakeline SBLC", programs: "SBA_7A", minAmountCents: $(150_000), maxAmountCents: $(2_000_000), turnaroundDays: 25, contactName: "S. Kim", contactEmail: "skim@lakeline.example" } }),
  ]);

  const [brokerRay] = await Promise.all([
    db.broker.create({ data: { name: "Ray Donovan", company: "Lonestar Capital Advisors", email: "ray@lonestarcap.example", phone: "512-555-0161", directContactOk: false } }),
    db.broker.create({ data: { name: "Elena Vasquez", company: "Gulf Commercial Finance", email: "elena@gulfcf.example", phone: "813-555-0142", directContactOk: true } }),
  ]);

  // ── investors ──
  const inv = async (name: string, opts: Partial<Parameters<typeof db.investor.create>[0]["data"]> = {}) =>
    db.investor.create({
      data: {
        name, type: "INDIVIDUAL", status: "ACTIVE", accreditationStatus: "SELF_CERTIFIED",
        accreditationExpires: daysAhead(280), ofacStatus: "CLEAR",
        email: `${name.split(" ")[0].toLowerCase()}@investor.example`,
        capitalAvailableCents: $(500_000), ...opts,
      },
    });
  const invHarlan = await inv("Harlan Voss", { capitalAvailableCents: $(1_500_000), prefDealTypes: "HM", prefTargetYieldBps: 1050, prefMaxCents: $(750_000) });
  const invMeridian = await inv("Meridian Family Office", { type: "ENTITY", capitalAvailableCents: $(4_000_000), prefDealTypes: "HM,BB", prefMinCents: $(100_000), prefMaxCents: $(2_000_000), prefTargetYieldBps: 950 });
  const invSilva = await inv("Dr. Anita Silva", { capitalAvailableCents: $(600_000), prefDealTypes: "HM,BB", prefStates: "TX,FL,GA" });
  const invBluebonnet = await inv("Bluebonnet Capital LLC", { type: "ENTITY", capitalAvailableCents: $(2_500_000), prefDealTypes: "HM,BB,WC", prefTargetYieldBps: 900 });
  const invGrove = await inv("Grove Street Partners", { type: "ENTITY", capitalAvailableCents: $(1_200_000), prefDealTypes: "BB", prefMinCents: $(50_000) });
  await inv("Walt Emerson", { capitalAvailableCents: $(350_000), prefDealTypes: "HM", prefStates: "TX" });
  await inv("Nadia Osei", { status: "ONBOARDING", accreditationStatus: "NONE", capitalAvailableCents: $(250_000), ofacStatus: "PENDING" });
  await inv("Caldera Trust", { type: "ENTITY", status: "PROSPECT", accreditationStatus: "NONE", capitalAvailableCents: $(1_000_000), ofacStatus: "PENDING" });

  // ── standalone leads (pre-conversion pipeline) ──
  const mkLead = (data: Parameters<typeof db.lead.create>[0]["data"]) => db.lead.create({ data });
  await mkLead({ source: "WEB", formVariant: "apply_full", firstName: "Jordan", lastName: "Reyes", email: "jordan@reyesbuilds.example", phone: "214-555-0187", companyName: "Reyes Builds LLC", state: "TX", dealType: "HM", useOfFunds: "FIX_FLIP", amountCents: $(485_000), fundingTimeline: "ASAP", creditStated: "GOOD", score: 84, band: "HOT", stage: "NEW_LEAD", createdAt: new Date(Date.now() - 22 * 60_000), smsConsent: true, utmSource: "google", utmCampaign: "fixflip-tx" });
  await mkLead({ source: "WEB", formVariant: "match_engine", firstName: "Whitney", lastName: "Cole", email: "wcole@colemfg.example", companyName: "Cole Manufacturing", state: "OH", dealType: "SBA", useOfFunds: "ACQUISITION", amountCents: $(1_800_000), fundingTimeline: "OVER_90D", creditStated: "EXCELLENT", score: 72, band: "HOT", stage: "NEW_LEAD", createdAt: new Date(Date.now() - 3 * 3600_000) });
  await mkLead({ source: "BROKER", brokerId: brokerRay.id, firstName: "Marcus", lastName: "Webb", email: "mwebb@webbholdings.example", phone: "512-555-0122", companyName: "Webb Holdings", state: "TX", dealType: "HM", useOfFunds: "RENTAL_BRIDGE", amountCents: $(725_000), fundingTimeline: "UNDER_30D", creditStated: "GOOD", score: 78, band: "HOT", stage: "CONTACTED", firstTouchAt: daysAgo(1), stageEnteredAt: daysAgo(1), createdAt: daysAgo(1) });
  await mkLead({ source: "WEB", firstName: "Priyanka", lastName: "Shah", email: "pshah@shahlogistics.example", companyName: "Shah Logistics", state: "GA", dealType: "WC", useOfFunds: "WORKING_CAPITAL", amountCents: $(120_000), fundingTimeline: "UNDER_30D", creditStated: "GOOD", score: 61, band: "WARM", stage: "QUALIFIED", firstTouchAt: daysAgo(3), stageEnteredAt: daysAgo(2), createdAt: daysAgo(4), notes: "12-person freight brokerage, seasonal AR swings. Entity borrower confirmed." });
  await mkLead({ source: "REFERRAL", firstName: "Tom", lastName: "Garrity", email: "tom@garrityhvac.example", companyName: "Garrity HVAC", state: "FL", dealType: "BB", useOfFunds: "EQUIPMENT", amountCents: $(210_000), fundingTimeline: "D30_90", creditStated: "FAIR", score: 58, band: "WARM", stage: "CONTACTED", firstTouchAt: daysAgo(5), stageEnteredAt: daysAgo(5), createdAt: daysAgo(6) });
  await mkLead({ source: "WEB", firstName: "Dana", lastName: "Kirby", email: "dana@kirbyprops.example", state: "NV", dealType: "HM", useOfFunds: "FIX_FLIP", amountCents: $(300_000), fundingTimeline: "ASAP", creditStated: "GOOD", score: 0, band: "COOL", stage: "DEAD", dqCode: "DQ_EXCLUDED_STATE", deadReason: "DQ_EXCLUDED_STATE", createdAt: daysAgo(2) });
  await mkLead({ source: "WEB", firstName: "Blake", lastName: "Munson", email: "blake@example.com", state: "TX", useOfFunds: "WORKING_CAPITAL", dealType: "WC", amountCents: $(45_000), fundingTimeline: "EXPLORING", creditStated: "POOR", score: 28, band: "COOL", stage: "DEAD", deadReason: "DEAD_UNRESPONSIVE", stageEnteredAt: daysAgo(9), createdAt: daysAgo(30) });
  await mkLead({ source: "CSV_IMPORT", nurtureOnly: true, firstName: "Renee", lastName: "Alcott", email: "renee@alcottgroup.example", companyName: "Alcott Group", state: "NC", dealType: "BB", useOfFunds: "BRIDGE_CRE", amountCents: $(950_000), fundingTimeline: "OVER_90D", creditStated: "UNKNOWN", score: 44, band: "WARM", stage: "NEW_LEAD", createdAt: daysAgo(12) });

  // ═══════════ deal factory ═══════════
  let dealSeq = 0;
  type DealSpec = {
    legalName: string; first: string; last: string; email: string; phone: string;
    dealType: "HM" | "BB" | "WC" | "SBA"; subType: string; stage: string;
    amount: number; rate: number; term: number; state: string; fico: number;
    startedDaysAgo: number; useOfProceeds: string;
    asIs?: number; arv?: number; rehab?: number; monthlyRevenue?: number; dscr?: number;
    collateralAddr?: string; city?: string; propertyType?: string;
    prescreen?: "PASS" | "PASS_WITH_EXCEPTIONS" | "FAIL";
    capitalSource?: "BALANCE_SHEET" | "SYNDICATED";
    terminal?: { kind: "DEAD" | "DECLINED"; reason: string };
  };

  async function makeDeal(s: DealSpec) {
    dealSeq += 1;
    const company = await db.company.create({
      data: { legalName: s.legalName, state: s.state, entityType: "LLC", timeInBusinessMonths: 48, kybStatus: "VERIFIED", goodStandingAsOf: daysAgo(20) },
    });
    const contact = await db.contact.create({
      data: { firstName: s.first, lastName: s.last, email: s.email, phone: s.phone, ficoMid: s.fico, kycStatus: "VERIFIED", ofacStatus: "CLEAR" },
    });
    const lead = await db.lead.create({
      data: {
        source: "WEB", firstName: s.first, lastName: s.last, email: s.email, phone: s.phone,
        companyName: s.legalName, state: s.state, dealType: s.dealType, amountCents: $(s.amount),
        useOfFunds: s.useOfProceeds, fundingTimeline: "UNDER_30D", creditStated: "GOOD",
        score: 75, band: "HOT", stage: "CONVERTED", firstTouchAt: daysAgo(s.startedDaysAgo),
        createdAt: daysAgo(s.startedDaysAgo + 2),
      },
    });

    const rail = stagesFor(s.dealType);
    const targetIdx = s.terminal ? rail.length - 1 : rail.indexOf(s.stage);
    const reachedIdx = s.terminal ? Math.min(targetIdx, rail.indexOf("UNDERWRITING")) : targetIdx;

    const funded = !s.terminal && ["FUNDED", "SERVICING", "PAID_OFF"].includes(s.stage);
    const deal = await db.deal.create({
      data: {
        dealNumber: `LR-2026-${String(dealSeq).padStart(4, "0")}`,
        dealType: s.dealType, subType: s.subType,
        stage: s.terminal ? s.terminal.kind : s.stage,
        stageEnteredAt: daysAgo(Math.max(0, Math.floor(s.startedDaysAgo / (reachedIdx + 2)))),
        leadId: lead.id, companyId: company.id,
        amountCents: $(s.amount), rateBps: Math.round(s.rate * 100), termMonths: s.term,
        state: s.state, ficoMid: s.fico, useOfProceeds: s.useOfProceeds,
        asIsValueCents: $(s.asIs ?? 0), arvCents: $(s.arv ?? 0), rehabBudgetCents: $(s.rehab ?? 0),
        monthlyRevenueCents: $(s.monthlyRevenue ?? 0), dscrBps: Math.round((s.dscr ?? 0) * 10000),
        prescreenResult: s.prescreen ?? "",
        capitalSource: s.capitalSource ?? "BALANCE_SHEET",
        ...(funded ? { fundedAt: daysAgo(Math.floor(s.startedDaysAgo / 3)), maturityDate: daysAhead(30 * s.term - s.startedDaysAgo), servicingStatus: "CURRENT" } : {}),
        ...(s.terminal?.kind === "DEAD" ? { deadReason: s.terminal.reason } : {}),
        ...(s.terminal?.kind === "DECLINED" ? { declineReasons: s.terminal.reason } : {}),
      },
    });
    await db.dealContact.create({ data: { dealId: deal.id, contactId: contact.id, role: "GUARANTOR", ownershipPct: 100 } });

    if (s.collateralAddr) {
      await db.collateral.create({
        data: {
          dealId: deal.id, address: s.collateralAddr, city: s.city ?? "", state: s.state,
          propertyType: s.propertyType ?? "SFR", asIsValueCents: $(s.asIs ?? 0), arvCents: $(s.arv ?? 0),
          valuationProduct: s.amount > 750_000 ? "HYBRID" : "EXT_BPO",
          valuationStatus: reachedIdx >= rail.indexOf("UNDERWRITING") ? "UW_ACCEPTED" : "",
          titleStatus: reachedIdx >= rail.indexOf("DOCS_CLOSING") ? "COMMITMENT_FINAL" : reachedIdx >= rail.indexOf("UNDERWRITING") ? "PRELIM_RECEIVED" : "",
          insuranceStatus: reachedIdx >= rail.indexOf("DOCS_CLOSING") ? "VERIFIED" : reachedIdx >= rail.indexOf("UNDERWRITING") ? "REQUESTED" : "",
        },
      });
    }

    // stage history walking the rail
    let cursor = s.startedDaysAgo;
    const step = Math.max(1, Math.floor(s.startedDaysAgo / (reachedIdx + 2)));
    for (let i = 0; i <= reachedIdx; i++) {
      await db.stageEvent.create({
        data: {
          dealId: deal.id, fromStage: i === 0 ? "QUALIFIED" : rail[i - 1], toStage: rail[i],
          actor: i === 0 ? "LO" : "SYS", createdAt: daysAgo(cursor),
        },
      });
      cursor -= step;
    }
    if (s.terminal) {
      await db.stageEvent.create({
        data: { dealId: deal.id, fromStage: rail[reachedIdx], toStage: s.terminal.kind, actor: "UW", note: s.terminal.reason, createdAt: daysAgo(Math.max(1, cursor)) },
      });
    }

    // document checklist with stage-appropriate statuses
    const currentStage = s.terminal ? rail[reachedIdx] : s.stage;
    const currentIdx = rail.indexOf(currentStage);
    for (const spec of docsForDeal(s.dealType, s.subType)) {
      const gateIdx = spec.stageGate ? rail.indexOf(spec.stageGate) : 99;
      let status = "REQUESTED";
      let fileName = "";
      if (gateIdx < currentIdx) { status = "ACCEPTED"; fileName = `${spec.docCode.toLowerCase()}.pdf`; }
      else if (gateIdx === currentIdx) {
        const roll = spec.docCode.length % 3;
        status = roll === 0 ? "ACCEPTED" : roll === 1 ? "UPLOADED" : "REQUESTED";
        if (status !== "REQUESTED") fileName = `${spec.docCode.toLowerCase()}.pdf`;
      }
      await db.documentRequest.create({
        data: {
          dealId: deal.id, docCode: spec.docCode, name: spec.name, category: spec.category,
          status, fileName, stageGate: spec.stageGate ?? "", freshnessDays: spec.freshnessDays ?? 0,
          gateCritical: Boolean(spec.stageGate),
          ...(status === "ACCEPTED" ? { uploadedAt: daysAgo(cursor + 1), reviewedBy: "Danielle Ortiz", ...(spec.freshnessDays ? { expiresAt: daysAhead(spec.freshnessDays - 10) } : {}) } : {}),
          ...(status === "UPLOADED" ? { uploadedAt: daysAgo(1) } : {}),
        },
      });
    }

    // tasks: past-stage playbooks DONE; current-stage humans OPEN
    for (let i = 0; i <= currentIdx; i++) {
      for (const t of playbookFor(s.dealType, rail[i])) {
        const isPast = i < currentIdx || t.owner === "SYS" || Boolean(s.terminal);
        await db.task.create({
          data: {
            dealId: deal.id, title: t.title, type: t.type, ownerRole: t.owner,
            status: isPast ? "DONE" : "OPEN", priority: t.priority ?? "MED",
            playbookCode: t.code, slaHours: t.slaHours,
            dueAt: !isPast && t.slaHours ? new Date(Date.now() + (t.slaHours - 20) * 3600_000) : null,
            completedAt: isPast ? daysAgo(Math.max(0, cursor)) : null,
          },
        });
      }
    }

    // compliance checks
    const lic = await db.licensingMatrix.findUnique({ where: { state: s.state } });
    await db.complianceCheck.create({
      data: {
        dealId: deal.id, checkType: "LICENSE_CHECK", status: lic?.licensed ? "PASS" : "FAIL",
        detail: lic?.licensed ? `${s.state}: ${lic.licenseType}` : `${s.state}: no licensing row — blocked`,
        resolvedAt: daysAgo(s.startedDaysAgo),
      },
    });
    if ((s.dealType === "BB" || s.dealType === "WC") && lic?.cfdlRequired) {
      await db.complianceCheck.create({
        data: { dealId: deal.id, checkType: "CFDL_DISCLOSURE", status: currentIdx >= rail.indexOf("TERM_SHEET") ? "SENT" : "PENDING", detail: `${s.state} commercial financing disclosure` },
      });
    }
    if (currentIdx >= rail.indexOf("DOCS_CLOSING") && !s.terminal) {
      await db.complianceCheck.create({
        data: {
          dealId: deal.id, checkType: "OFAC_SCREEN",
          status: funded ? "PASS" : "PENDING",
          detail: "Pre-wire re-scan (≤ 24h before funding — blocks wire button)",
          ...(funded ? { resolvedAt: deal.fundedAt } : {}),
        },
      });
    }
    if (s.terminal?.kind === "DECLINED") {
      await db.complianceCheck.create({
        data: { dealId: deal.id, checkType: "ADVERSE_ACTION_TIMER", status: "PENDING", detail: `Notice due — reasons: ${s.terminal.reason}`, dueAt: daysAhead(18) },
      });
    }
    await db.ofacScreen.create({ data: { partyType: "CONTACT", partyName: `${s.first} ${s.last}`, dealId: deal.id, result: "CLEAR", context: "APPLICATION", screenedAt: daysAgo(s.startedDaysAgo) } });

    // borrower stage-update messages
    await db.messageLog.create({
      data: {
        dealId: deal.id, channel: "EMAIL", direction: "OUT", toAddress: s.email,
        templateCode: `SEQ_STAGE_${currentStage}`, subject: `Your Lendrock ${deal.dealNumber} update`,
        body: `Your file moved to ${currentStage.replace(/_/g, " ")}. We'll update you at every step — no need to call.`,
        createdAt: daysAgo(Math.max(0, cursor)),
      },
    });

    // credit-box run for deals at/past TERM_SHEET
    if (s.prescreen) {
      const flags =
        s.prescreen === "PASS_WITH_EXCEPTIONS"
          ? [{ field: "ltc_bps", label: "Max LTC 85%", severity: "SOFT", actual: 8720, op: "LTE", limit: 8500 }]
          : [];
      await db.creditBoxRun.create({
        data: { dealId: deal.id, result: s.prescreen, flags: JSON.stringify(flags), snapshot: JSON.stringify({ amount_cents: $(s.amount), fico_mid: s.fico }), createdAt: daysAgo(Math.max(1, cursor + step)) },
      });
    }

    return deal;
  }

  // ═══════════ the book ═══════════

  // 1 · HM_FF in UNDERWRITING — the classic live file
  const d1 = await makeDeal({
    legalName: "Reyes Builds LLC", first: "Jordan", last: "Reyes", email: "jordan@reyesbuilds.example", phone: "214-555-0187",
    dealType: "HM", subType: "HM_FF", stage: "UNDERWRITING", amount: 485_000, rate: 11.25, term: 12,
    state: "TX", fico: 702, startedDaysAgo: 9, useOfProceeds: "FIX_FLIP",
    asIs: 520_000, arv: 780_000, rehab: 96_000, collateralAddr: "4312 Sylvan Ave", city: "Dallas",
    prescreen: "PASS_WITH_EXCEPTIONS",
  });

  // 2 · HM_FF in DOCS_CLOSING — OFAC gate pending
  await makeDeal({
    legalName: "Twin Pines Property Group", first: "Sasha", last: "Ivanov", email: "sasha@twinpines.example", phone: "469-555-0119",
    dealType: "HM", subType: "HM_FF", stage: "DOCS_CLOSING", amount: 610_000, rate: 10.75, term: 12,
    state: "TX", fico: 688, startedDaysAgo: 13, useOfProceeds: "FIX_FLIP",
    asIs: 700_000, arv: 1_010_000, rehab: 140_000, collateralAddr: "1108 Beacon St", city: "Fort Worth",
    prescreen: "PASS",
  });

  // 3 · HM_GUC in SERVICING — syndicated, draws in flight
  const d3 = await makeDeal({
    legalName: "Calder Creek Development LLC", first: "Mitch", last: "Calder", email: "mitch@caldercreek.example", phone: "615-555-0133",
    dealType: "HM", subType: "HM_GUC", stage: "SERVICING", amount: 1_450_000, rate: 12.5, term: 18,
    state: "TN", fico: 715, startedDaysAgo: 55, useOfProceeds: "GROUND_UP",
    asIs: 900_000, arv: 2_350_000, rehab: 780_000, collateralAddr: "Lot 14, Calder Creek Rd", city: "Franklin",
    propertyType: "LAND", prescreen: "PASS", capitalSource: "SYNDICATED",
  });

  // 4 · HM_BTP in APPLICATION
  await makeDeal({
    legalName: "Webb Holdings LLC", first: "Marcus", last: "Webb", email: "mwebb@webbholdings.example", phone: "512-555-0122",
    dealType: "HM", subType: "HM_BTP", stage: "APPLICATION", amount: 725_000, rate: 10.5, term: 18,
    state: "TX", fico: 694, startedDaysAgo: 3, useOfProceeds: "RENTAL_BRIDGE",
    asIs: 1_040_000, collateralAddr: "77 Mueller Blvd", city: "Austin", propertyType: "MULTI_2_4",
  });

  // 5 · BB_BIZ in UNDERWRITING
  await makeDeal({
    legalName: "Hargrove Distributing Inc", first: "Celia", last: "Hargrove", email: "celia@hargrovedist.example", phone: "404-555-0177",
    dealType: "BB", subType: "BB_BIZ", stage: "UNDERWRITING", amount: 340_000, rate: 16.5, term: 24,
    state: "GA", fico: 671, startedDaysAgo: 8, useOfProceeds: "EQUIPMENT",
    monthlyRevenue: 92_000, dscr: 1.34, prescreen: "PASS",
  });

  // 6 · BB_CRE at TERM_SHEET
  await makeDeal({
    legalName: "Pelican Bay Hospitality LLC", first: "Andre", last: "Toussaint", email: "andre@pelicanbay.example", phone: "504-555-0149",
    dealType: "BB", subType: "BB_CRE", stage: "TERM_SHEET", amount: 1_150_000, rate: 12.0, term: 18,
    state: "FL", fico: 655, startedDaysAgo: 5, useOfProceeds: "BRIDGE_CRE",
    asIs: 1_700_000, collateralAddr: "220 Shoreline Dr", city: "Clearwater", propertyType: "COMMERCIAL",
    prescreen: "PASS",
  });

  // 7 · BB_BIZ in SERVICING — balance sheet, payments flowing
  const d7 = await makeDeal({
    legalName: "Ironclad Fabrication LLC", first: "Dee", last: "Okonkwo", email: "dee@ironcladfab.example", phone: "980-555-0126",
    dealType: "BB", subType: "BB_BIZ", stage: "SERVICING", amount: 175_000, rate: 15.0, term: 24,
    state: "NC", fico: 662, startedDaysAgo: 40, useOfProceeds: "EXPANSION",
    monthlyRevenue: 61_000, dscr: 1.41, prescreen: "PASS",
  });

  // 8 · WC in SERVICING — active revolver
  const d8 = await makeDeal({
    legalName: "Shah Logistics LLC", first: "Priyanka", last: "Shah", email: "pshah@shahlogistics.example", phone: "678-555-0163",
    dealType: "WC", subType: "WC_STANDARD", stage: "SERVICING", amount: 110_000, rate: 17.5, term: 12,
    state: "GA", fico: 684, startedDaysAgo: 35, useOfProceeds: "WORKING_CAPITAL",
    monthlyRevenue: 74_000, prescreen: "PASS",
  });

  // 9 · WC in APPLICATION
  await makeDeal({
    legalName: "Brightside Staffing Co", first: "Lena", last: "Brooks", email: "lena@brightsidestaffing.example", phone: "704-555-0158",
    dealType: "WC", subType: "WC_BORROWING_BASE", stage: "APPLICATION", amount: 200_000, rate: 17.5, term: 12,
    state: "NC", fico: 668, startedDaysAgo: 2, useOfProceeds: "WORKING_CAPITAL",
    monthlyRevenue: 130_000,
  });

  // 10 · SBA in LENDER_MATCHING
  const d10 = await makeDeal({
    legalName: "Cole Manufacturing Inc", first: "Whitney", last: "Cole", email: "wcole@colemfg.example", phone: "330-555-0171",
    dealType: "SBA", subType: "SBA_7A", stage: "LENDER_MATCHING", amount: 1_800_000, rate: 10.25, term: 120,
    state: "OH", fico: 741, startedDaysAgo: 21, useOfProceeds: "ACQUISITION",
  });

  // 11 · SBA in APPLICATION (package assembly)
  await makeDeal({
    legalName: "Verde Kitchen Group LLC", first: "Rosa", last: "Delgado", email: "rosa@verdekitchen.example", phone: "719-555-0139",
    dealType: "SBA", subType: "SBA_7A", stage: "APPLICATION", amount: 640_000, rate: 10.75, term: 120,
    state: "CO", fico: 707, startedDaysAgo: 10, useOfProceeds: "EXPANSION_LONG",
  });

  // 12 · HM_FF DECLINED — adverse action running
  await makeDeal({
    legalName: "Quickturn Rehab LLC", first: "Vince", last: "Marlow", email: "vince@quickturn.example", phone: "813-555-0102",
    dealType: "HM", subType: "HM_FF", stage: "UNDERWRITING", amount: 390_000, rate: 11.5, term: 12,
    state: "FL", fico: 604, startedDaysAgo: 16, useOfProceeds: "FIX_FLIP",
    asIs: 410_000, arv: 505_000, rehab: 60_000, collateralAddr: "3390 Palmetto Way", city: "Tampa",
    prescreen: "FAIL",
    terminal: { kind: "DECLINED", reason: "DECLINED_FICO_BELOW_FLOOR, DECLINED_LTARV_EXCEEDED" },
  });

  // 13 · BB_BIZ at APPROVED — live approval awaiting signoffs
  const d13 = await makeDeal({
    legalName: "Nolan Bros Paving LLC", first: "Chris", last: "Nolan", email: "chris@nolanpaving.example", phone: "615-555-0118",
    dealType: "BB", subType: "BB_BIZ", stage: "APPROVED", amount: 425_000, rate: 15.75, term: 24,
    state: "TN", fico: 649, startedDaysAgo: 11, useOfProceeds: "EQUIPMENT",
    monthlyRevenue: 88_000, dscr: 1.22, prescreen: "PASS_WITH_EXCEPTIONS",
  });

  // ── post-factory enrichments ──

  // d3 (HM_GUC servicing): participations, draws, payments, distributions
  const p1 = await db.participation.create({
    data: { dealId: d3.id, investorId: invHarlan.id, committedCents: $(500_000), fundedCents: $(500_000), rateBps: 1050, status: "ACTIVE", committedAt: daysAgo(40), wiredAt: daysAgo(34) },
  });
  const p2 = await db.participation.create({
    data: { dealId: d3.id, investorId: invMeridian.id, committedCents: $(800_000), fundedCents: $(800_000), rateBps: 1050, status: "ACTIVE", committedAt: daysAgo(39), wiredAt: daysAgo(34) },
  });
  await db.transaction.createMany({
    data: [
      { dealId: d3.id, investorId: invHarlan.id, participationId: p1.id, type: "FUNDING_WIRE", direction: "IN", amountCents: $(500_000), method: "WIRE", status: "SETTLED", date: daysAgo(34), memo: "Participation wire" },
      { dealId: d3.id, investorId: invMeridian.id, participationId: p2.id, type: "FUNDING_WIRE", direction: "IN", amountCents: $(800_000), method: "WIRE", status: "SETTLED", date: daysAgo(34), memo: "Participation wire" },
      { dealId: d3.id, type: "FEE", direction: "IN", amountCents: $(29_000), status: "SETTLED", date: daysAgo(33), memo: "Origination fee 2.0%" },
      { dealId: d3.id, type: "PAYMENT", direction: "IN", amountCents: $(15_104), status: "SETTLED", date: daysAgo(20), memo: "Interest payment (from reserve)" },
      { dealId: d3.id, investorId: invHarlan.id, type: "DISTRIBUTION", direction: "OUT", amountCents: $(4_375), status: "SETTLED", date: daysAgo(15), memo: "Monthly distribution batch" },
      { dealId: d3.id, investorId: invMeridian.id, type: "DISTRIBUTION", direction: "OUT", amountCents: $(7_000), status: "SETTLED", date: daysAgo(15), memo: "Monthly distribution batch" },
      { dealId: d3.id, type: "PAYMENT", direction: "IN", amountCents: $(15_104), status: "SETTLED", date: daysAgo(4), memo: "Interest payment (from reserve)" },
      { dealId: d3.id, investorId: invHarlan.id, type: "DISTRIBUTION", direction: "OUT", amountCents: $(4_375), status: "INITIATED", date: daysAgo(4), memo: "Accrued — pays in monthly batch (10th)" },
      { dealId: d3.id, investorId: invMeridian.id, type: "DISTRIBUTION", direction: "OUT", amountCents: $(7_000), status: "INITIATED", date: daysAgo(4), memo: "Accrued — pays in monthly batch (10th)" },
    ],
  });
  await db.drawRequest.create({
    data: { dealId: d3.id, amountCents: $(120_000), status: "WIRED", inspectionPct: 100, requestedAt: daysAgo(18), decidedBy: "Rob Feldman", wiredAt: daysAgo(14) },
  });
  await db.transaction.create({
    data: { dealId: d3.id, type: "DRAW_DISBURSEMENT", direction: "OUT", amountCents: $(120_000), method: "WIRE", status: "SETTLED", date: daysAgo(14), memo: "Draw 1 — foundation complete" },
  });
  await db.drawRequest.create({
    data: { dealId: d3.id, amountCents: $(85_000), status: "INSPECTION_RECEIVED", inspectionPct: 90, requestedAt: daysAgo(2) },
  });

  // d7 (BB servicing): payments
  await db.transaction.createMany({
    data: [
      { dealId: d7.id, type: "FEE", direction: "IN", amountCents: $(4_375), status: "SETTLED", date: daysAgo(26), memo: "Origination fee 2.5%" },
      { dealId: d7.id, type: "PAYMENT", direction: "IN", amountCents: $(2_188), status: "SETTLED", date: daysAgo(12), memo: "Weekly ACH payment" },
      { dealId: d7.id, type: "PAYMENT", direction: "IN", amountCents: $(2_188), status: "SETTLED", date: daysAgo(5), memo: "Weekly ACH payment" },
    ],
  });

  // d8 (WC): active line with draws
  const line = await db.wcLine.create({
    data: {
      dealId: d8.id, limitCents: $(35_000), drawnCents: $(18_000), rateBps: 1750, tier: "B",
      status: "ACTIVE", renewalDate: daysAhead(330),
      metrics: JSON.stringify({ avg_daily_balance_90d: $(22_400), monthly_revenue_avg_6m: $(74_000), nsf_count_90d: 0 }),
    },
  });
  await db.wcDraw.createMany({
    data: [
      { lineId: line.id, amountCents: $(8_000), status: "SENT", autoChecks: "[]", requestedAt: daysAgo(20) },
      { lineId: line.id, amountCents: $(10_000), status: "SENT", autoChecks: "[]", requestedAt: daysAgo(9) },
      { lineId: line.id, amountCents: $(12_000), status: "REVIEW", autoChecks: JSON.stringify([{ check: "UNDER_AUTO_CAP", pass: false, detail: "Auto cap $8,750" }]), requestedAt: daysAgo(1) },
    ],
  });
  await db.transaction.createMany({
    data: [
      { dealId: d8.id, type: "DRAW_DISBURSEMENT", direction: "OUT", amountCents: $(8_000), status: "SETTLED", date: daysAgo(20), memo: "WC draw (auto-approved)" },
      { dealId: d8.id, type: "DRAW_DISBURSEMENT", direction: "OUT", amountCents: $(10_000), status: "SETTLED", date: daysAgo(9), memo: "WC draw (auto-approved)" },
      { dealId: d8.id, type: "PAYMENT", direction: "IN", amountCents: $(263), status: "SETTLED", date: daysAgo(6), memo: "Monthly interest autopay" },
    ],
  });

  // d10 (SBA): Form 159 + submissions
  await db.form159Record.create({ data: { dealId: d10.id, status: "SIGNED", packagingFeeCents: $(5_000), referralFeeBps: 100 } });
  await db.complianceCheck.create({ data: { dealId: d10.id, checkType: "FORM_159", status: "PASS", detail: "Signed by borrower + Lendrock; fee flat, non-contingent", resolvedAt: daysAgo(15) } });
  await db.sbaSubmission.createMany({
    data: [
      { dealId: d10.id, lenderId: fcb.id, status: "IN_UW", submittedAt: daysAgo(6), notes: "Requested updated interim financials" },
      { dealId: d10.id, lenderId: heritage.id, status: "SUBMITTED", submittedAt: daysAgo(6) },
      { dealId: d10.id, lenderId: lakeline.id, status: "PROPOSAL", submittedAt: daysAgo(6), notes: "Proposal: P+2.75, 10yr, 25% injection" },
    ],
  });

  // d13 (BB approved): live approval with pending signoffs
  const approval = await db.approval.create({
    data: {
      dealId: d13.id, type: "CREDIT_DECISION", tier: 2, status: "PENDING", requestedBy: "UW",
      memo: JSON.stringify({ reason: "> $250k or any exception", exceptions: 1 }),
      createdAt: daysAgo(1),
    },
  });
  await db.approvalSignoff.createMany({
    data: [
      { approvalId: approval.id, approverRole: "UW", decision: "APPROVED", note: "In-box except DSCR 1.22 vs 1.20 floor — fine.", decidedAt: daysAgo(1), approverId: rob.id },
      { approvalId: approval.id, approverRole: "PRIN", decision: "PENDING" },
    ],
  });

  // d1: pending UW exception approval for the LTC flag
  const exApproval = await db.approval.create({
    data: { dealId: d1.id, type: "EXCEPTION", tier: 2, status: "PENDING", requestedBy: "LO", memo: JSON.stringify({ reason: "LTC 87.2% vs 85% guardrail", exceptions: 1 }) },
  });
  await db.approvalSignoff.createMany({
    data: [
      { approvalId: exApproval.id, approverRole: "UW", decision: "PENDING" },
      { approvalId: exApproval.id, approverRole: "PRIN", decision: "PENDING" },
    ],
  });

  // sprinkle of audit history
  await db.auditLog.createMany({
    data: [
      { actor: "SYS", action: "LEAD_CREATED", objectType: "Lead", objectId: "-", detail: "Web lead scored 84 (HOT)", createdAt: new Date(Date.now() - 25 * 60_000) },
      { actor: "LO", action: "LEAD_FIRST_TOUCH", objectType: "Lead", objectId: "-", detail: "Maya Chen", createdAt: daysAgo(1) },
      { actor: "UW", action: "PRESCREEN_RUN", objectType: "Deal", objectId: d1.id, detail: "PASS_WITH_EXCEPTIONS (1 flag)", createdAt: daysAgo(2) },
      { actor: "SYS", action: "WC_DRAW_REVIEW", objectType: "WcDraw", objectId: "-", detail: "$12,000 over auto cap — routed to PROC", createdAt: daysAgo(1) },
      { actor: "CM", action: "SBA_SUBMITTED", objectType: "Deal", objectId: d10.id, detail: "3 parallel submissions", createdAt: daysAgo(6) },
      { actor: "PRIN", action: "DISTRIBUTION_BATCH", objectType: "Transaction", objectId: "-", detail: "2 distributions settled", createdAt: daysAgo(15) },
    ],
  });

  const counts = {
    users: await db.user.count(), leads: await db.lead.count(), deals: await db.deal.count(),
    docs: await db.documentRequest.count(), tasks: await db.task.count(),
    investors: await db.investor.count(), participations: await db.participation.count(),
    templates: await db.template.count(), rules: await db.creditBoxRule.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });
