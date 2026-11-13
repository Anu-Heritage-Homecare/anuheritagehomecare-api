-- Settings > Billing & Payments: configurable taxes (billing_taxes) and payment
-- terms (billing_payment_terms), plus include-VAT and default-method on billing_settings.

-- CreateEnum
CREATE TYPE "tax_scope" AS ENUM ('CLIENT_INVOICE', 'CONTRACTOR_PAYOUT');

-- AlterTable
ALTER TABLE "billing_settings" ADD COLUMN     "defaultPaymentMethod" "billing_payment_method_kind",
ADD COLUMN     "includeVatInPricing" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "billing_taxes" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "rateBasisPoints" INTEGER NOT NULL,
    "scope" "tax_scope" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" VARCHAR(200),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_taxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_payment_terms" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "netDays" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "description" VARCHAR(200),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_payment_terms_pkey" PRIMARY KEY ("id")
);

