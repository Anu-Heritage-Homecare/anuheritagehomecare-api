-- AlterTable
ALTER TABLE "visits" ADD COLUMN     "sequence" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "visits_sequence_key" ON "visits"("sequence");
