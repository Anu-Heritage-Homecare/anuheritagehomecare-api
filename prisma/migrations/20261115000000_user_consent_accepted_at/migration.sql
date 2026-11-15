-- AlterTable
-- Records when a user accepted the consent terms; null until they do, so existing
-- users are treated as not yet consented.
ALTER TABLE "User" ADD COLUMN "consentAcceptedAt" TIMESTAMP(3);
