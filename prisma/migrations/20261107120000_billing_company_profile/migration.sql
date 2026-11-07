-- Invoice Preview: the issuing agency's own letterhead and payment info.
ALTER TABLE "billing_settings"
  ADD COLUMN "companyName" VARCHAR(160),
  ADD COLUMN "companyAddress" VARCHAR(300),
  ADD COLUMN "bankName" VARCHAR(120),
  ADD COLUMN "bankAccountNumber" VARCHAR(40),
  ADD COLUMN "bankAccountName" VARCHAR(160);
