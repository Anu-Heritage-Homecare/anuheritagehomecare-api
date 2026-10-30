-- AlterTable: checklist defaults, schedule label, estimated time and active flag for task templates
ALTER TABLE "task_templates" ADD COLUMN     "checklistItems" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "scheduleLabel" VARCHAR(80),
ADD COLUMN     "estimatedMinutes" INTEGER,
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;
