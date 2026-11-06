-- CreateEnum
CREATE TYPE "invoice_event_type" AS ENUM ('CREATED', 'APPROVED', 'SENT', 'VIEWED', 'REMINDER_SENT');

-- CreateEnum
CREATE TYPE "invoice_event_actor" AS ENUM ('ADMIN', 'SYSTEM', 'CLIENT');

-- CreateTable
CREATE TABLE "invoice_events" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "type" "invoice_event_type" NOT NULL,
    "detail" VARCHAR(500),
    "actorType" "invoice_event_actor" NOT NULL,
    "actorAdminId" UUID,
    "actorLabel" VARCHAR(160),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_events_invoiceId_createdAt_idx" ON "invoice_events"("invoiceId", "createdAt");

-- AddForeignKey
ALTER TABLE "invoice_events" ADD CONSTRAINT "invoice_events_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "recipient_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
