-- AlterTable
-- Records when a user accepted the consent terms; null until they do, so existing
-- users are treated as not yet consented.
ALTER TABLE "users" ADD COLUMN "consentAcceptedAt" TIMESTAMP(3);
