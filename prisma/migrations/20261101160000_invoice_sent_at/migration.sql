-- Create Invoice wizard (step 6, Send Invoice): record when an invoice was last emailed
-- to the client. Delivery is tracked separately from payment status; null until sent.

-- AlterTable
ALTER TABLE "recipient_invoices" ADD COLUMN "sentAt" TIMESTAMP(3);
