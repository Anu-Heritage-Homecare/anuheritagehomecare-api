-- AlterTable: a coordinator's acknowledgement of an operational alert, with a note
ALTER TABLE "operational_alerts" ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "acknowledgedByAdminId" UUID,
ADD COLUMN     "acknowledgeNote" VARCHAR(500);
