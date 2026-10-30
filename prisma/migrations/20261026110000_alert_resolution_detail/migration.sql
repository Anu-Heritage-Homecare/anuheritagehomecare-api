-- AlterTable: resolution detail captured on the Resolve Alert modal
ALTER TABLE "operational_alerts" ADD COLUMN     "resolutionCategory" VARCHAR(120),
ADD COLUMN     "resolutionActionTaken" VARCHAR(500),
ADD COLUMN     "resolutionInternalNote" VARCHAR(500);
