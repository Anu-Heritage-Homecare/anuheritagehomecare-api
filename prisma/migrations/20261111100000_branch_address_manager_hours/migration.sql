-- AlterTable
ALTER TABLE "OrganizationBranch" DROP COLUMN "address",
DROP COLUMN "managerName",
ADD COLUMN     "addressLine1" VARCHAR(200) NOT NULL,
ADD COLUMN     "addressLine2" VARCHAR(200),
ADD COLUMN     "city" VARCHAR(120) NOT NULL,
ADD COLUMN     "managerId" UUID,
ADD COLUMN     "phone" VARCHAR(40),
ADD COLUMN     "state" VARCHAR(120) NOT NULL;

-- CreateTable
CREATE TABLE "BranchBusinessHour" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "dayOfWeek" SMALLINT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "openMinute" INTEGER NOT NULL,
    "closeMinute" INTEGER NOT NULL,

    CONSTRAINT "BranchBusinessHour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BranchBusinessHour_branchId_dayOfWeek_key" ON "BranchBusinessHour"("branchId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "OrganizationBranch_managerId_idx" ON "OrganizationBranch"("managerId");

-- AddForeignKey
ALTER TABLE "OrganizationBranch" ADD CONSTRAINT "OrganizationBranch_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchBusinessHour" ADD CONSTRAINT "BranchBusinessHour_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "OrganizationBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

