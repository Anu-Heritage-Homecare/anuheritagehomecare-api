-- Settings > Notifications: the global notification settings singleton
-- (notification_settings) and per-type on/off overrides (notification_toggles).

-- CreateEnum
CREATE TYPE "notification_channel" AS ENUM ('EMAIL', 'SMS', 'PUSH');

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" VARCHAR(64) NOT NULL,
    "caregiverReminderMinutes" INTEGER NOT NULL DEFAULT 60,
    "familyNotificationMinutes" INTEGER NOT NULL DEFAULT 30,
    "coordinatorLateMinutes" INTEGER NOT NULL DEFAULT 15,
    "emergencyRecipients" TEXT[],
    "emergencyChannels" "notification_channel"[],
    "emergencyTriggers" TEXT[],
    "smsProviderName" VARCHAR(80),
    "smsProviderConnected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_toggles" (
    "id" UUID NOT NULL,
    "channel" "notification_channel" NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_toggles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_toggles_channel_key_key" ON "notification_toggles"("channel", "key");

