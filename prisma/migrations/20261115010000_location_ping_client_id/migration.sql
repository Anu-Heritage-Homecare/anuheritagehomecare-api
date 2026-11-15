-- AlterTable
-- Client generated id per point, making a replayed offline batch idempotent. Added
-- NOT NULL without a backfill: this is a pre-launch, write-only feature with no
-- stored points yet. If any rows exist, delete them before applying.
ALTER TABLE "location_pings" ADD COLUMN "clientId" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "location_pings_caregiverId_clientId_key" ON "location_pings"("caregiverId", "clientId");
