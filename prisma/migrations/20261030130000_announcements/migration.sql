-- CreateEnum
CREATE TYPE "announcement_audience" AS ENUM ('ALL_STAFF', 'CAREGIVERS', 'COORDINATORS');

-- CreateEnum
CREATE TYPE "announcement_priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "announcement_status" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" VARCHAR(8000) NOT NULL,
    "audiences" "announcement_audience"[] DEFAULT ARRAY[]::"announcement_audience"[],
    "priority" "announcement_priority" NOT NULL DEFAULT 'NORMAL',
    "status" "announcement_status" NOT NULL DEFAULT 'DRAFT',
    "authorAdminId" UUID NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcements_status_createdAt_idx" ON "announcements"("status", "createdAt");
