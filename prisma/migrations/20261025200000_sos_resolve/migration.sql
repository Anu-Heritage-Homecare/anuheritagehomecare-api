-- AlterEnum: an SOS emergency can be resolved by the office
ALTER TYPE "sos_alert_status" ADD VALUE 'RESOLVED';

-- AlterTable: office resolution of an SOS emergency
ALTER TABLE "sos_alerts" ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedByAdminId" UUID;
