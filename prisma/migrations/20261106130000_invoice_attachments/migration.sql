-- CreateTable
CREATE TABLE "invoice_attachments" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "fileName" VARCHAR(300) NOT NULL,
    "storageKey" VARCHAR(500) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedByAdminId" UUID,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_attachments_invoiceId_uploadedAt_idx" ON "invoice_attachments"("invoiceId", "uploadedAt");

-- AddForeignKey
ALTER TABLE "invoice_attachments" ADD CONSTRAINT "invoice_attachments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "recipient_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
