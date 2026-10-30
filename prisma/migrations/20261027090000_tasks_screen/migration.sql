-- CreateEnum
CREATE TYPE "task_category" AS ENUM ('CARE_ACTIVITY', 'MEDICATION', 'DOCUMENTATION', 'SCHEDULING', 'COMPLIANCE', 'ADMINISTRATIVE', 'OTHER');

-- AlterTable: category, free-text assignee, related visit on operational tasks
ALTER TABLE "operational_tasks" ADD COLUMN     "category" "task_category" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "assigneeLabel" VARCHAR(160),
ADD COLUMN     "relatedVisitId" UUID;

-- CreateIndex
CREATE INDEX "operational_tasks_dueAt_idx" ON "operational_tasks"("dueAt");

-- CreateTable
CREATE TABLE "task_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000),
    "category" "task_category" NOT NULL DEFAULT 'OTHER',
    "priority" "task_priority" NOT NULL DEFAULT 'MEDIUM',
    "defaultAssigneeLabel" VARCHAR(160),
    "createdByAdminId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);
