-- Settings > Care Operations: service offerings, visit formats with per-currency
-- rates (visit_format_rates), and the singleton scheduling guardrails.

-- CreateEnum
CREATE TYPE "rate_unit" AS ENUM ('PER_VISIT', 'PER_HOUR');

-- CreateEnum
CREATE TYPE "auto_assign_algorithm" AS ENUM ('PROXIMITY_AND_SKILLS', 'PROXIMITY_ONLY', 'SKILLS_ONLY', 'ROUND_ROBIN', 'MANUAL');

-- CreateTable
CREATE TABLE "service_offerings" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(300),
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_formats" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(300),
    "durationMinutes" INTEGER,
    "rateUnit" "rate_unit" NOT NULL DEFAULT 'PER_VISIT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visit_formats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_format_rates" (
    "id" UUID NOT NULL,
    "visitFormatId" UUID NOT NULL,
    "currency" "currency" NOT NULL,
    "baseRateMinor" INTEGER NOT NULL,

    CONSTRAINT "visit_format_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduling_guardrails" (
    "id" VARCHAR(64) NOT NULL,
    "minimumNoticeHours" INTEGER NOT NULL DEFAULT 24,
    "travelBufferMinutes" INTEGER NOT NULL DEFAULT 30,
    "maxVisitsPerCaregiverPerDay" INTEGER NOT NULL DEFAULT 6,
    "autoAssignAlgorithm" "auto_assign_algorithm" NOT NULL DEFAULT 'PROXIMITY_AND_SKILLS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduling_guardrails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "visit_format_rates_visitFormatId_currency_key" ON "visit_format_rates"("visitFormatId", "currency");

-- AddForeignKey
ALTER TABLE "visit_format_rates" ADD CONSTRAINT "visit_format_rates_visitFormatId_fkey" FOREIGN KEY ("visitFormatId") REFERENCES "visit_formats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

