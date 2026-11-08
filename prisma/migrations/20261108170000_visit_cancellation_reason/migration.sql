-- The Operations Report cancellation breakdown: why a cancelled visit was called off.
-- Nullable, only meaningful once a cancel with reason action populates it.

-- CreateEnum
CREATE TYPE "visit_cancellation_reason" AS ENUM (
  'CLIENT_REQUEST',
  'CAREGIVER_UNAVAILABLE',
  'WEATHER',
  'EMERGENCY',
  'OTHER'
);

-- AlterTable
ALTER TABLE "visits" ADD COLUMN "cancellationReason" "visit_cancellation_reason";
