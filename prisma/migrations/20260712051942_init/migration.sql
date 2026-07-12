-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "ficoMid" INTEGER,
    "kycStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "ofacStatus" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "dba" TEXT NOT NULL DEFAULT '',
    "ein" TEXT NOT NULL DEFAULT '',
    "entityType" TEXT NOT NULL DEFAULT 'LLC',
    "state" TEXT NOT NULL DEFAULT '',
    "naics" TEXT NOT NULL DEFAULT '',
    "timeInBusinessMonths" INTEGER NOT NULL DEFAULT 0,
    "kybStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "goodStandingAsOf" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "directContactOk" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Broker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerLender" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "programs" TEXT NOT NULL DEFAULT 'SBA_7A',
    "industries" TEXT NOT NULL DEFAULT '',
    "minAmountCents" INTEGER NOT NULL DEFAULT 0,
    "maxAmountCents" INTEGER NOT NULL DEFAULT 0,
    "turnaroundDays" INTEGER NOT NULL DEFAULT 30,
    "noShoppedDeals" BOOLEAN NOT NULL DEFAULT false,
    "contactName" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PartnerLender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "formVariant" TEXT NOT NULL DEFAULT '',
    "utmSource" TEXT NOT NULL DEFAULT '',
    "utmCampaign" TEXT NOT NULL DEFAULT '',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "companyName" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "dealType" TEXT NOT NULL DEFAULT '',
    "useOfFunds" TEXT NOT NULL DEFAULT '',
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "fundingTimeline" TEXT NOT NULL DEFAULT '',
    "creditStated" TEXT NOT NULL DEFAULT '',
    "score" INTEGER NOT NULL DEFAULT 0,
    "band" TEXT NOT NULL DEFAULT 'COOL',
    "stage" TEXT NOT NULL DEFAULT 'NEW_LEAD',
    "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dqCode" TEXT NOT NULL DEFAULT '',
    "deadReason" TEXT NOT NULL DEFAULT '',
    "smsConsent" BOOLEAN NOT NULL DEFAULT false,
    "nurtureOnly" BOOLEAN NOT NULL DEFAULT false,
    "firstTouchAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "ownerId" TEXT,
    "brokerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "dealNumber" TEXT NOT NULL,
    "dealType" TEXT NOT NULL,
    "subType" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'APPLICATION',
    "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT,
    "companyId" TEXT NOT NULL,
    "ownerLoId" TEXT,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "rateBps" INTEGER NOT NULL DEFAULT 0,
    "termMonths" INTEGER NOT NULL DEFAULT 12,
    "originationFeeBps" INTEGER NOT NULL DEFAULT 200,
    "useOfProceeds" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "targetCloseDate" TIMESTAMP(3),
    "ficoMid" INTEGER,
    "monthlyRevenueCents" INTEGER NOT NULL DEFAULT 0,
    "dscrBps" INTEGER NOT NULL DEFAULT 0,
    "capitalSource" TEXT NOT NULL DEFAULT 'BALANCE_SHEET',
    "asIsValueCents" INTEGER NOT NULL DEFAULT 0,
    "arvCents" INTEGER NOT NULL DEFAULT 0,
    "rehabBudgetCents" INTEGER NOT NULL DEFAULT 0,
    "interestReserveCents" INTEGER NOT NULL DEFAULT 0,
    "prescreenResult" TEXT NOT NULL DEFAULT '',
    "prescreenSnapshot" TEXT NOT NULL DEFAULT '',
    "approvedAmountCents" INTEGER,
    "approvedRateBps" INTEGER,
    "fundedAt" TIMESTAMP(3),
    "maturityDate" TIMESTAMP(3),
    "servicingStatus" TEXT NOT NULL DEFAULT '',
    "deadReason" TEXT NOT NULL DEFAULT '',
    "declineReasons" TEXT NOT NULL DEFAULT '',
    "borrowerToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealContact" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'GUARANTOR',
    "ownershipPct" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DealContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collateral" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "zip" TEXT NOT NULL DEFAULT '',
    "propertyType" TEXT NOT NULL DEFAULT 'SFR',
    "asIsValueCents" INTEGER NOT NULL DEFAULT 0,
    "arvCents" INTEGER NOT NULL DEFAULT 0,
    "valuationProduct" TEXT NOT NULL DEFAULT '',
    "valuationStatus" TEXT NOT NULL DEFAULT '',
    "titleStatus" TEXT NOT NULL DEFAULT '',
    "insuranceStatus" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Collateral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageEvent" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "leadId" TEXT,
    "fromStage" TEXT NOT NULL,
    "toStage" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'SYS',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "leadId" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "ownerRole" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MED',
    "dueAt" TIMESTAMP(3),
    "slaHours" INTEGER,
    "playbookCode" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadReason" (
    "code" TEXT NOT NULL,
    "coreCode" TEXT NOT NULL,
    "pathwayScope" TEXT NOT NULL DEFAULT 'ALL',
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DeadReason_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "DocRequirement" (
    "id" TEXT NOT NULL,
    "docCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "dealTypes" TEXT NOT NULL,
    "conditional" TEXT NOT NULL DEFAULT '',
    "freshnessDays" INTEGER NOT NULL DEFAULT 0,
    "stageGate" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "DocRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRequest" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "docCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "gateCritical" BOOLEAN NOT NULL DEFAULT false,
    "stageGate" TEXT NOT NULL DEFAULT '',
    "rejectedReason" TEXT NOT NULL DEFAULT '',
    "freshnessDays" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "fileName" TEXT NOT NULL DEFAULT '',
    "uploadedAt" TIMESTAMP(3),
    "reviewedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditBoxRule" (
    "id" TEXT NOT NULL,
    "dealType" TEXT NOT NULL,
    "subType" TEXT NOT NULL DEFAULT '',
    "field" TEXT NOT NULL,
    "op" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'SOFT',
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CreditBoxRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditBoxRun" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "flags" TEXT NOT NULL DEFAULT '[]',
    "snapshot" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditBoxRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL DEFAULT 'SYS',
    "memo" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalSignoff" (
    "id" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "approverRole" TEXT NOT NULL,
    "approverId" TEXT,
    "decision" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT NOT NULL DEFAULT '',
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalSignoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investor" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PROSPECT',
    "accreditationStatus" TEXT NOT NULL DEFAULT 'SELF_CERTIFIED',
    "accreditationExpires" TIMESTAMP(3),
    "capitalAvailableCents" INTEGER NOT NULL DEFAULT 0,
    "prefDealTypes" TEXT NOT NULL DEFAULT 'HM,BB',
    "prefStates" TEXT NOT NULL DEFAULT '',
    "prefMinCents" INTEGER NOT NULL DEFAULT 2500000,
    "prefMaxCents" INTEGER NOT NULL DEFAULT 50000000,
    "prefTargetYieldBps" INTEGER NOT NULL DEFAULT 1000,
    "prefMaxLtvBps" INTEGER NOT NULL DEFAULT 7500,
    "ofacStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "portalToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Investor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participation" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "committedCents" INTEGER NOT NULL,
    "fundedCents" INTEGER NOT NULL DEFAULT 0,
    "rateBps" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SOFT_COMMIT',
    "committedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wiredAt" TIMESTAMP(3),

    CONSTRAINT "Participation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "investorId" TEXT,
    "participationId" TEXT,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'ACH',
    "status" TEXT NOT NULL DEFAULT 'SETTLED',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memo" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawRequest" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "inspectionPct" INTEGER NOT NULL DEFAULT 0,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedBy" TEXT NOT NULL DEFAULT '',
    "wiredAt" TIMESTAMP(3),

    CONSTRAINT "DrawRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WcLine" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "limitCents" INTEGER NOT NULL,
    "drawnCents" INTEGER NOT NULL DEFAULT 0,
    "rateBps" INTEGER NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'A',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "freezeReason" TEXT NOT NULL DEFAULT '',
    "autopayDay" INTEGER NOT NULL DEFAULT 5,
    "renewalDate" TIMESTAMP(3),
    "metrics" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "WcLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WcDraw" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "autoChecks" TEXT NOT NULL DEFAULT '[]',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WcDraw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Form159Record" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "packagingFeeCents" INTEGER NOT NULL DEFAULT 350000,
    "referralFeeBps" INTEGER NOT NULL DEFAULT 100,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form159Record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SbaSubmission" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PREPARING',
    "submittedAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "SbaSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "dealTypes" TEXT NOT NULL DEFAULT 'ALL',
    "delivery" TEXT NOT NULL DEFAULT 'EMAIL',
    "body" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "attorneyReview" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "leadId" TEXT,
    "investorId" TEXT,
    "channel" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'OUT',
    "toAddress" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "templateCode" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceCheck" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "checkType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "detail" TEXT NOT NULL DEFAULT '',
    "dueAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicensingMatrix" (
    "state" TEXT NOT NULL,
    "licensed" BOOLEAN NOT NULL DEFAULT false,
    "licenseType" TEXT NOT NULL DEFAULT '',
    "cfdlRequired" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "LicensingMatrix_pkey" PRIMARY KEY ("state")
);

-- CreateTable
CREATE TABLE "OfacScreen" (
    "id" TEXT NOT NULL,
    "partyType" TEXT NOT NULL,
    "partyName" TEXT NOT NULL,
    "dealId" TEXT,
    "result" TEXT NOT NULL DEFAULT 'CLEAR',
    "context" TEXT NOT NULL DEFAULT '',
    "screenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfacScreen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_dealNumber_key" ON "Deal"("dealNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_leadId_key" ON "Deal"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_borrowerToken_key" ON "Deal"("borrowerToken");

-- CreateIndex
CREATE UNIQUE INDEX "DocRequirement_docCode_key" ON "DocRequirement"("docCode");

-- CreateIndex
CREATE UNIQUE INDEX "Investor_portalToken_key" ON "Investor"("portalToken");

-- CreateIndex
CREATE UNIQUE INDEX "WcLine_dealId_key" ON "WcLine"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "Form159Record_dealId_key" ON "Form159Record"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "Template_code_key" ON "Template"("code");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealContact" ADD CONSTRAINT "DealContact_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealContact" ADD CONSTRAINT "DealContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collateral" ADD CONSTRAINT "Collateral_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageEvent" ADD CONSTRAINT "StageEvent_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditBoxRun" ADD CONSTRAINT "CreditBoxRun_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalSignoff" ADD CONSTRAINT "ApprovalSignoff_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "Approval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalSignoff" ADD CONSTRAINT "ApprovalSignoff_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawRequest" ADD CONSTRAINT "DrawRequest_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WcLine" ADD CONSTRAINT "WcLine_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WcDraw" ADD CONSTRAINT "WcDraw_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "WcLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form159Record" ADD CONSTRAINT "Form159Record_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbaSubmission" ADD CONSTRAINT "SbaSubmission_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbaSubmission" ADD CONSTRAINT "SbaSubmission_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "PartnerLender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceCheck" ADD CONSTRAINT "ComplianceCheck_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
