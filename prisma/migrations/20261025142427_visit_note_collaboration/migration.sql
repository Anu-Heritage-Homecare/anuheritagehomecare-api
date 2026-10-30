-- CreateEnum
CREATE TYPE "visit_note_source" AS ENUM ('CAREGIVER', 'COORDINATOR', 'SYSTEM');

-- AlterTable
ALTER TABLE "visit_notes" ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "acknowledgedByName" VARCHAR(200),
ADD COLUMN     "authorAdminId" UUID,
ADD COLUMN     "authorName" VARCHAR(200),
ADD COLUMN     "authorRole" VARCHAR(200),
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "flaggedAt" TIMESTAMP(3),
ADD COLUMN     "flaggedForCoordinator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source" "visit_note_source" NOT NULL DEFAULT 'CAREGIVER',
ALTER COLUMN "authorId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "visit_note_replies" (
    "id" UUID NOT NULL,
    "visitNoteId" UUID NOT NULL,
    "authorName" VARCHAR(200) NOT NULL,
    "authorRole" VARCHAR(200) NOT NULL,
    "text" VARCHAR(4000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_note_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visit_note_replies_visitNoteId_createdAt_idx" ON "visit_note_replies"("visitNoteId", "createdAt");

-- AddForeignKey
ALTER TABLE "visit_note_replies" ADD CONSTRAINT "visit_note_replies_visitNoteId_fkey" FOREIGN KEY ("visitNoteId") REFERENCES "visit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
