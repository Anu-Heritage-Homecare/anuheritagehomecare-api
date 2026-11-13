-- The Reports screen report activity feed: metadata for each report produced from
-- the admin Reports dashboard. The artifact is streamed on demand, never stored.

-- CreateEnum
CREATE TYPE "report_type" AS ENUM (
  'OPERATIONS',
  'CAREGIVER_PERFORMANCE',
  'FINANCIAL_SUMMARY',
  'CLIENT_SATISFACTION',
  'WORKFORCE_COMPLIANCE'
);

-- CreateEnum
CREATE TYPE "report_format" AS ENUM ('PDF', 'EXCEL');

-- CreateTable
CREATE TABLE "generated_reports" (
    "id" UUID NOT NULL,
    "type" "report_type" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "format" "report_format" NOT NULL,
    "currency" "currency" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "generatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generated_reports_createdAt_idx" ON "generated_reports" ("createdAt");

-- AddForeignKey
ALTER TABLE "generated_reports"
    ADD CONSTRAINT "generated_reports_generatedById_fkey"
    FOREIGN KEY ("generatedById") REFERENCES "admin_users" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
