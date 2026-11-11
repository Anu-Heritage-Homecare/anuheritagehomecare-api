-- Settings > Security & Integrations: the security settings singleton, admin
-- login events, integrations and the admin audit trail.

-- CreateEnum
CREATE TYPE "mfa_enforcement" AS ENUM ('ENABLED_FOR_ALL', 'OPTIONAL', 'DISABLED');

-- CreateEnum
CREATE TYPE "mfa_method" AS ENUM ('AUTHENTICATOR', 'SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "login_event_outcome" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "integration_status" AS ENUM ('CONNECTED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "integration_category" AS ENUM ('COMMUNICATIONS', 'PAYMENTS', 'IDENTITY', 'MAPS', 'OTHER');

-- CreateEnum
CREATE TYPE "audit_category" AS ENUM ('SECURITY', 'INTEGRATIONS', 'USERS', 'BILLING', 'OPERATIONS', 'OTHER');

-- CreateTable
CREATE TABLE "security_settings" (
    "id" VARCHAR(64) NOT NULL,
    "passwordMinLength" INTEGER NOT NULL DEFAULT 8,
    "requireUppercase" BOOLEAN NOT NULL DEFAULT true,
    "requireNumber" BOOLEAN NOT NULL DEFAULT true,
    "requireSpecialChar" BOOLEAN NOT NULL DEFAULT true,
    "passwordExpiryDays" INTEGER NOT NULL DEFAULT 90,
    "passwordHistoryBlocked" INTEGER NOT NULL DEFAULT 5,
    "mfaEnforcement" "mfa_enforcement" NOT NULL DEFAULT 'ENABLED_FOR_ALL',
    "mfaMethods" "mfa_method"[],
    "mfaEnforcedRoles" TEXT[],
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 30,
    "maxConcurrentSessions" INTEGER NOT NULL DEFAULT 3,
    "rememberDeviceDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_login_events" (
    "id" UUID NOT NULL,
    "adminUserId" UUID,
    "email" VARCHAR(255) NOT NULL,
    "operatorName" VARCHAR(200),
    "outcome" "login_event_outcome" NOT NULL,
    "ipAddress" VARCHAR(64),
    "deviceLabel" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_login_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "category" "integration_category" NOT NULL,
    "status" "integration_status" NOT NULL DEFAULT 'DISCONNECTED',
    "description" VARCHAR(300),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_events" (
    "id" UUID NOT NULL,
    "actorAdminId" UUID,
    "actorName" VARCHAR(200),
    "category" "audit_category" NOT NULL,
    "action" VARCHAR(120) NOT NULL,
    "summary" VARCHAR(400) NOT NULL,
    "ipAddress" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_login_events_createdAt_idx" ON "admin_login_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_key_key" ON "integrations"("key");

-- CreateIndex
CREATE INDEX "admin_audit_events_createdAt_idx" ON "admin_audit_events"("createdAt");

