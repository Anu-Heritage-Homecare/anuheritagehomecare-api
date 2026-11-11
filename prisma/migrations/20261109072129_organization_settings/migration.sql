-- Settings > Organization Profile: the singleton organization (legal identity,
-- billing currency, regional preferences) with its branches, emergency contacts and weekly schedule.

-- CreateEnum
CREATE TYPE "branch_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "Organization" (
    "id" VARCHAR(64) NOT NULL,
    "legalName" VARCHAR(200),
    "businessRegNumber" VARCHAR(80),
    "registeredAddress" VARCHAR(400),
    "timezone" VARCHAR(80),
    "systemLanguage" VARCHAR(80),
    "currency" "currency" NOT NULL DEFAULT 'NGN',
    "dateFormat" VARCHAR(40),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationBranch" (
    "id" UUID NOT NULL,
    "organizationId" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "address" VARCHAR(400) NOT NULL,
    "managerName" VARCHAR(200),
    "status" "branch_status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationEmergencyContact" (
    "id" UUID NOT NULL,
    "organizationId" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "role" VARCHAR(160),
    "phone" VARCHAR(40) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationEmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationBusinessHour" (
    "id" UUID NOT NULL,
    "organizationId" VARCHAR(64) NOT NULL,
    "dayOfWeek" SMALLINT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "openMinute" INTEGER NOT NULL,
    "closeMinute" INTEGER NOT NULL,

    CONSTRAINT "OrganizationBusinessHour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationBranch_organizationId_idx" ON "OrganizationBranch"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationEmergencyContact_organizationId_idx" ON "OrganizationEmergencyContact"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationBusinessHour_organizationId_dayOfWeek_key" ON "OrganizationBusinessHour"("organizationId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "OrganizationBranch" ADD CONSTRAINT "OrganizationBranch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationEmergencyContact" ADD CONSTRAINT "OrganizationEmergencyContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationBusinessHour" ADD CONSTRAINT "OrganizationBusinessHour_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

