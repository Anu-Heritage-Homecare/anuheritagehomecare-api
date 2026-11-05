-- The Billing Settings screen: organisation wide invoice, automation and notification
-- preferences (a singleton) plus the configurable payment avenues. The tax rate is an
-- integer in basis points (750 = 7.5%).

-- CreateEnum
CREATE TYPE "billing_payment_method_kind" AS ENUM ('BANK_TRANSFER', 'CARD', 'CASH', 'MOBILE_MONEY');

-- CreateTable
CREATE TABLE "billing_settings" (
    "id" UUID NOT NULL,
    "singleton" BOOLEAN NOT NULL DEFAULT true,
    "defaultPaymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "invoicePrefix" VARCHAR(10) NOT NULL DEFAULT 'INV-',
    "defaultCurrency" "currency" NOT NULL DEFAULT 'NGN',
    "standardTaxRateBasisPoints" INTEGER NOT NULL DEFAULT 750,
    "autoNumbering" BOOLEAN NOT NULL DEFAULT true,
    "autoSendInvoices" BOOLEAN NOT NULL DEFAULT true,
    "paymentReminders" BOOLEAN NOT NULL DEFAULT true,
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 7,
    "overdueNotifications" BOOLEAN NOT NULL DEFAULT true,
    "overdueNoticeDaysAfter" INTEGER NOT NULL DEFAULT 1,
    "autoReceipts" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT true,
    "inAppNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_payment_method_settings" (
    "method" "billing_payment_method_kind" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" VARCHAR(200) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_payment_method_settings_pkey" PRIMARY KEY ("method")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_settings_singleton_key" ON "billing_settings"("singleton");
