-- CreateEnum
CREATE TYPE "incident_resolution_status" AS ENUM ('PENDING_RESOLUTION', 'RESOLVED', 'ESCALATED');

-- CreateTable
CREATE TABLE "incident_resolutions" (
    "id" UUID NOT NULL,
    "incidentId" UUID NOT NULL,
    "status" "incident_resolution_status" NOT NULL DEFAULT 'PENDING_RESOLUTION',
    "summary" VARCHAR(1000),
    "actionsTaken" VARCHAR(1000),
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" DATE,
    "followUpNotes" VARCHAR(1000),
    "updatedByAdminId" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "incident_resolutions_incidentId_key" ON "incident_resolutions"("incidentId");
