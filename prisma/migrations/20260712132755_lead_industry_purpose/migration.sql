-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "consumerPurpose" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "industry" TEXT NOT NULL DEFAULT '';
