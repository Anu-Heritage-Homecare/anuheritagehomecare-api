-- The Credits & Adjustments screen: manual financial corrections against a billing
-- account (credit, refund, write off or generic adjustment). Money is an integer minor
-- amount with its currency. Raised awaiting approval; an admin approves it, which
-- applies the correction (COMPLETED) or, for a refund, starts it settling (PROCESSING).
-- An applied or pending correction can later be reversed (voided).

-- CreateEnum
CREATE TYPE "account_adjustment_category" AS ENUM ('CREDIT', 'REFUND', 'WRITE_OFF', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "account_adjustment_status" AS ENUM ('PENDING_APPROVAL', 'PROCESSING', 'COMPLETED', 'REVERSED');

-- CreateTable
CREATE TABLE "account_adjustments" (
    "id" UUID NOT NULL,
    "sequence" SERIAL NOT NULL,
    "category" "account_adjustment_category" NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "billingAccountId" UUID NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" "currency" NOT NULL,
    "status" "account_adjustment_status" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "reason" VARCHAR(500) NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "reversedById" UUID,
    "reversedAt" TIMESTAMP(3),

    CONSTRAINT "account_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_adjustments_sequence_key" ON "account_adjustments"("sequence");

-- CreateIndex
CREATE INDEX "account_adjustments_category_createdAt_idx" ON "account_adjustments"("category", "createdAt");

-- AddForeignKey
ALTER TABLE "account_adjustments" ADD CONSTRAINT "account_adjustments_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "family_directory_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_adjustments" ADD CONSTRAINT "account_adjustments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_adjustments" ADD CONSTRAINT "account_adjustments_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_adjustments" ADD CONSTRAINT "account_adjustments_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
