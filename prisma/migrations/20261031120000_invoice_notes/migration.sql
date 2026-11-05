-- The invoice Notes tab: internal notes and communications on an invoice, authored by
-- an admin and classified by category. Body only; never payer facing or card data.

-- CreateEnum
CREATE TYPE "invoice_note_category" AS ENUM ('GENERAL', 'FOLLOW_UP', 'SYSTEM', 'INVOICE_AUDIT');

-- CreateTable
CREATE TABLE "invoice_notes" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "category" "invoice_note_category" NOT NULL DEFAULT 'GENERAL',
    "body" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_notes_invoiceId_createdAt_idx" ON "invoice_notes"("invoiceId", "createdAt");

-- AddForeignKey
ALTER TABLE "invoice_notes" ADD CONSTRAINT "invoice_notes_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "recipient_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_notes" ADD CONSTRAINT "invoice_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
