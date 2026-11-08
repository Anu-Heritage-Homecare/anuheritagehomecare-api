-- Approve Adjustment modal: a REJECTED decision, approver notes and the rejecter.
ALTER TYPE "account_adjustment_status" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "account_adjustments" ADD COLUMN "approverNotes" VARCHAR(2000);
ALTER TABLE "account_adjustments" ADD COLUMN "rejectedById" UUID;
ALTER TABLE "account_adjustments" ADD COLUMN "rejectedAt" TIMESTAMP(3);

ALTER TABLE "account_adjustments"
  ADD CONSTRAINT "account_adjustments_rejectedById_fkey"
  FOREIGN KEY ("rejectedById") REFERENCES "admin_users" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
