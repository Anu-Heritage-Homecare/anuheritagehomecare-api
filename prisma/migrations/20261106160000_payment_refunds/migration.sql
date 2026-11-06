-- AlterTable
ALTER TABLE "recipient_invoice_payments" ADD COLUMN "refundedAt" TIMESTAMP(3),
ADD COLUMN "refundReason" VARCHAR(500),
ADD COLUMN "refundedByAdminId" UUID;
