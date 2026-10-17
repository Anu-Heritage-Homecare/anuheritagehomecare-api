-- AlterTable
ALTER TABLE "profile_preferences" ADD COLUMN     "locationServicesEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

