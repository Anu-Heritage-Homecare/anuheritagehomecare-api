-- CreateEnum
CREATE TYPE "care_circle_member_status" AS ENUM ('PENDING', 'ACTIVE');

-- AlterTable
-- Existing members already joined under the old immediate flow, so they default
-- to ACTIVE; only new join requests created after this migration are PENDING.
ALTER TABLE "care_circle_members" ADD COLUMN "status" "care_circle_member_status" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "care_circle_members_ownerId_status_idx" ON "care_circle_members"("ownerId", "status");
