-- AlterTable: admin acknowledgement and assignment on an SOS alert
ALTER TABLE "sos_alerts" ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "acknowledgedByAdminId" UUID,
ADD COLUMN     "assignedTo" VARCHAR(200);

-- CreateEnum
CREATE TYPE "emergency_protocol_step" AS ENUM ('SOS_CONFIRMATION', 'ASSESS_VISIT', 'NOTIFY_FAMILY', 'DISPATCH_SUPERVISOR', 'LOG_INCIDENT');

-- CreateEnum
CREATE TYPE "sos_response_event_kind" AS ENUM ('CALLBACK', 'GEOFENCE_CHECK', 'INCIDENT_LOGGED', 'NOTE');

-- CreateTable
CREATE TABLE "sos_protocol_completions" (
    "id" UUID NOT NULL,
    "sosAlertId" UUID NOT NULL,
    "step" "emergency_protocol_step" NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedByAdminId" UUID,

    CONSTRAINT "sos_protocol_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_response_events" (
    "id" UUID NOT NULL,
    "sosAlertId" UUID NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "sos_response_event_kind" NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "actorAdminId" UUID,
    "linkedIncidentId" UUID,

    CONSTRAINT "sos_response_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sos_protocol_completions_sosAlertId_step_key" ON "sos_protocol_completions"("sosAlertId", "step");

-- CreateIndex
CREATE INDEX "sos_protocol_completions_sosAlertId_idx" ON "sos_protocol_completions"("sosAlertId");

-- CreateIndex
CREATE INDEX "sos_response_events_sosAlertId_at_idx" ON "sos_response_events"("sosAlertId", "at");
