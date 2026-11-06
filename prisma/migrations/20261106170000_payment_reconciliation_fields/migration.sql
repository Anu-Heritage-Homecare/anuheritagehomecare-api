-- Record Payment drawer: capture the offline reconciliation details.
ALTER TABLE "recipient_invoice_payments"
  ADD COLUMN "referenceNumber" VARCHAR(120),
  ADD COLUMN "bankName" VARCHAR(120),
  ADD COLUMN "notes" VARCHAR(2000);
