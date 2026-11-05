-- Create Invoice wizard (step 5): capture a raised invoice's financial breakdown and
-- line detail. Adds the subtotal, discount, tax breakdown to the invoice header, per line
-- rate/quantity/unit, and a child table for the whole invoice discounts and adjustments.

-- AlterTable
ALTER TABLE "recipient_invoices"
    ADD COLUMN "subtotalMinor" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "discountTotalMinor" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "taxMinor" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "taxRateBasisPoints" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "recipient_invoice_lines"
    ADD COLUMN "rateMinor" INTEGER,
    ADD COLUMN "quantity" DOUBLE PRECISION,
    ADD COLUMN "unitLabel" VARCHAR(20);

-- CreateEnum
CREATE TYPE "invoice_adjustment_kind" AS ENUM ('DISCOUNT', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "recipient_invoice_adjustments" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "kind" "invoice_adjustment_kind" NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "recipient_invoice_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipient_invoice_adjustments_invoiceId_idx" ON "recipient_invoice_adjustments"("invoiceId");

-- AddForeignKey
ALTER TABLE "recipient_invoice_adjustments" ADD CONSTRAINT "recipient_invoice_adjustments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "recipient_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
