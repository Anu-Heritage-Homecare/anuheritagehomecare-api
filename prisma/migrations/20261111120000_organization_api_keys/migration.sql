-- CreateEnum
CREATE TYPE "api_key_status" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" UUID NOT NULL,
    "organizationId" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "keyPrefix" VARCHAR(16) NOT NULL,
    "last4" VARCHAR(8) NOT NULL,
    "keyHash" VARCHAR(128) NOT NULL,
    "scopes" TEXT[],
    "rateLimitPerHour" INTEGER NOT NULL DEFAULT 1000,
    "status" "api_key_status" NOT NULL DEFAULT 'ACTIVE',
    "createdById" UUID,
    "lastUsedAt" TIMESTAMP(3),
    "hourBucket" VARCHAR(16),
    "hourCount" INTEGER NOT NULL DEFAULT 0,
    "dayBucket" VARCHAR(16),
    "dayCount" INTEGER NOT NULL DEFAULT 0,
    "weekBucket" VARCHAR(16),
    "weekCount" INTEGER NOT NULL DEFAULT 0,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_organizationId_idx" ON "ApiKey"("organizationId");

-- CreateIndex
CREATE INDEX "ApiKey_createdById_idx" ON "ApiKey"("createdById");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

