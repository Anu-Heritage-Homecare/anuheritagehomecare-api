-- AlterTable
ALTER TABLE "billable_services" ADD COLUMN "category" VARCHAR(80);

-- AlterTable
ALTER TABLE "recipient_invoice_lines" ADD COLUMN "category" VARCHAR(80),
ADD COLUMN "serviceDateStart" DATE,
ADD COLUMN "serviceDateEnd" DATE,
ADD COLUMN "caregiverId" UUID;
