-- CreateEnum
CREATE TYPE "billing_account_event_kind" AS ENUM ('ACCOUNT_DETAILS_EDITED', 'REMINDER_SENT');

-- AlterTable
ALTER TABLE "family_directory_entries" ADD COLUMN "preferredPaymentMethod" VARCHAR(60);

-- CreateTable
CREATE TABLE "billing_account_events" (
    "id" UUID NOT NULL,
    "familyDirectoryEntryId" UUID NOT NULL,
    "kind" "billing_account_event_kind" NOT NULL,
    "detail" VARCHAR(500),
    "actorAdminId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_account_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_account_events_familyDirectoryEntryId_createdAt_idx" ON "billing_account_events"("familyDirectoryEntryId", "createdAt");

-- CreateIndex
CREATE INDEX "billing_account_events_kind_createdAt_idx" ON "billing_account_events"("kind", "createdAt");

-- AddForeignKey
ALTER TABLE "billing_account_events" ADD CONSTRAINT "billing_account_events_familyDirectoryEntryId_fkey" FOREIGN KEY ("familyDirectoryEntryId") REFERENCES "family_directory_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
