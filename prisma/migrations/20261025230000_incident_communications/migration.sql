-- CreateEnum
CREATE TYPE "communication_channel" AS ENUM ('PHONE_CALL', 'INTERNAL_MESSAGE', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "communication_outcome" AS ENUM ('REACHED', 'NO_ANSWER', 'LEFT_MESSAGE', 'ACKNOWLEDGED');

-- CreateTable
CREATE TABLE "incident_communications" (
    "id" UUID NOT NULL,
    "incidentId" UUID NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" "communication_channel" NOT NULL,
    "outcome" "communication_outcome" NOT NULL,
    "contactName" VARCHAR(160) NOT NULL,
    "contactRole" VARCHAR(80),
    "notes" VARCHAR(1000),
    "authorAdminId" UUID,

    CONSTRAINT "incident_communications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incident_communications_incidentId_at_idx" ON "incident_communications"("incidentId", "at");
