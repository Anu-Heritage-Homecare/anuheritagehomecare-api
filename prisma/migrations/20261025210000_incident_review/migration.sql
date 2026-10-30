-- AlterEnum: an incident can be under review before resolution
ALTER TYPE "incident_status" ADD VALUE 'UNDER_REVIEW';

-- AlterTable: the coordinator handling the incident
ALTER TABLE "incidents" ADD COLUMN     "assignedCoordinatorAdminId" UUID;
