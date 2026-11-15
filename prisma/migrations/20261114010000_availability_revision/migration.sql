-- AlterTable
-- Optimistic concurrency version for caregiver availability; existing days start
-- at revision 1 so clients have a baseline to compare against.
ALTER TABLE "caregiver_availability" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
