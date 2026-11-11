-- AlterTable
ALTER TABLE "integrations" ADD COLUMN     "config" JSONB,
ADD COLUMN     "connectedAt" TIMESTAMP(3),
ADD COLUMN     "lastSyncAt" TIMESTAMP(3);

