-- The billable care services catalog (Create Invoice wizard, step 3). Each service
-- bills HOURLY, by SESSION or as a FIXED fee, with a rate per currency in minor units.

-- CreateEnum
CREATE TYPE "billable_service_unit" AS ENUM ('HOURLY', 'SESSION', 'FIXED');

-- CreateTable
CREATE TABLE "billable_services" (
    "id" UUID NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "unit" "billable_service_unit" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billable_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billable_service_prices" (
    "id" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "currency" "currency" NOT NULL,
    "unitAmountMinor" INTEGER NOT NULL,

    CONSTRAINT "billable_service_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billable_services_code_key" ON "billable_services"("code");

-- CreateIndex
CREATE UNIQUE INDEX "billable_service_prices_serviceId_currency_key" ON "billable_service_prices"("serviceId", "currency");

-- AddForeignKey
ALTER TABLE "billable_service_prices" ADD CONSTRAINT "billable_service_prices_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "billable_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
