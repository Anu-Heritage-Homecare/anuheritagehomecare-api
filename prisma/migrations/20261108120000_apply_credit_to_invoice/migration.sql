-- Apply Credit: link a CREDIT adjustment to an invoice and capture auditing notes.
ALTER TABLE "account_adjustments" ADD COLUMN "invoiceId" UUID;
ALTER TABLE "account_adjustments" ADD COLUMN "notes" VARCHAR(2000);

-- Discriminate a non cash credit settlement from a real payment. Set to the approved
-- CREDIT adjustment that produced it; null for cash/online payments.
ALTER TABLE "recipient_invoice_payments" ADD COLUMN "creditAdjustmentId" UUID;

CREATE INDEX "account_adjustments_invoiceId_idx" ON "account_adjustments" ("invoiceId");
CREATE UNIQUE INDEX "recipient_invoice_payments_creditAdjustmentId_key"
  ON "recipient_invoice_payments" ("creditAdjustmentId");

ALTER TABLE "account_adjustments"
  ADD CONSTRAINT "account_adjustments_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "recipient_invoices" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
