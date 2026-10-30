-- CreateEnum
CREATE TYPE "visit_task_category" AS ENUM ('COMPANIONSHIP', 'PERSONAL_CARE', 'CLINICAL_VITALS', 'MEDICAL_SUPPORT', 'NUTRITION_DIETARY', 'REPORTING_ADMIN', 'GENERAL');

-- AlterTable
ALTER TABLE "visit_tasks" ADD COLUMN     "category" "visit_task_category" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "note" VARCHAR(2000),
ADD COLUMN     "scheduledMinute" INTEGER,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "visit_vitals" ADD COLUMN     "visitTaskPosition" INTEGER;

-- AlterTable
ALTER TABLE "medication_administrations" ADD COLUMN     "visitTaskPosition" INTEGER;
