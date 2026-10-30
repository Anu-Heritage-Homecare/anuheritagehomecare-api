-- AlterTable: escalation of an operational alert to a higher level
ALTER TABLE "operational_alerts" ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "escalatedByAdminId" UUID,
ADD COLUMN     "escalationLevel" VARCHAR(120),
ADD COLUMN     "escalationAssignee" VARCHAR(160),
ADD COLUMN     "escalationReason" VARCHAR(160),
ADD COLUMN     "escalationNote" VARCHAR(500);
