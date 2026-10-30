-- CreateEnum
CREATE TYPE "incident_category" AS ENUM ('MEDICATION_CONCERN', 'RECIPIENT_FALL', 'SERVICE_COMPLAINT', 'BEHAVIOURAL', 'OTHER');

-- CreateEnum
CREATE TYPE "incident_status" AS ENUM ('OPEN', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "incidents" (
    "id" UUID NOT NULL,
    "sequence" SERIAL NOT NULL,
    "category" "incident_category" NOT NULL,
    "severity" "alert_severity" NOT NULL,
    "status" "incident_status" NOT NULL DEFAULT 'OPEN',
    "detail" VARCHAR(1000),
    "reporterName" VARCHAR(160),
    "reportedByAdminId" UUID,
    "relatedVisitId" UUID,
    "relatedCaregiverId" UUID,
    "relatedCareRecipientId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByAdminId" UUID,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "incidents_sequence_key" ON "incidents"("sequence");

-- CreateIndex
CREATE INDEX "incidents_status_createdAt_idx" ON "incidents"("status", "createdAt");
