-- CreateTable
CREATE TABLE "account_documents" (
    "id" UUID NOT NULL,
    "familyDirectoryEntryId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "fileName" VARCHAR(300) NOT NULL,
    "storageKey" VARCHAR(500) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedByAdminId" UUID,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_documents_familyDirectoryEntryId_uploadedAt_idx" ON "account_documents"("familyDirectoryEntryId", "uploadedAt");

-- AddForeignKey
ALTER TABLE "account_documents" ADD CONSTRAINT "account_documents_familyDirectoryEntryId_fkey" FOREIGN KEY ("familyDirectoryEntryId") REFERENCES "family_directory_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
