-- Partial refunds: a per refund audit trail and a denormalised cumulative total.
ALTER TABLE "recipient_invoice_payments"
  ADD COLUMN "refundedAmountMinor" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "payment_refunds" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "method" VARCHAR(120),
    "reason" VARCHAR(200),
    "notes" VARCHAR(2000),
    "refundedByAdminId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_refunds_paymentId_createdAt_idx" ON "payment_refunds"("paymentId", "createdAt");

ALTER TABLE "payment_refunds"
  ADD CONSTRAINT "payment_refunds_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "recipient_invoice_payments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: existing fully refunded payments have their whole amount refunded.
UPDATE "recipient_invoice_payments"
  SET "refundedAmountMinor" = "amountMinor"
  WHERE "refundedAt" IS NOT NULL;
