-- AlterTable
ALTER TABLE "recipient_invoice_payments" ADD COLUMN     "sequence" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "recipient_invoice_payments_sequence_key" ON "recipient_invoice_payments"("sequence");

-- CreateIndex
CREATE INDEX "recipient_invoice_payments_currency_receivedAt_idx" ON "recipient_invoice_payments"("currency", "receivedAt");

-- CreateIndex
CREATE INDEX "recipient_invoices_currency_status_issuedAt_idx" ON "recipient_invoices"("currency", "status", "issuedAt");

-- CreateIndex
CREATE INDEX "recipient_invoices_currency_status_dueDate_idx" ON "recipient_invoices"("currency", "status", "dueDate");

