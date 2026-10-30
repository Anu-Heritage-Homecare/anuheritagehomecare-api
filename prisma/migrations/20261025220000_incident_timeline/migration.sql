-- CreateEnum
CREATE TYPE "incident_timeline_event_kind" AS ENUM ('COORDINATOR_NOTIFIED', 'CAREGIVER_CONTACT', 'FAMILY_NOTIFICATION', 'REVIEW_STARTED', 'NOTE', 'OTHER');

-- CreateTable
CREATE TABLE "incident_timeline_events" (
    "id" UUID NOT NULL,
    "incidentId" UUID NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "incident_timeline_event_kind" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "actorName" VARCHAR(160),
    "actorRole" VARCHAR(80),
    "authorAdminId" UUID,

    CONSTRAINT "incident_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incident_timeline_events_incidentId_at_idx" ON "incident_timeline_events"("incidentId", "at");
