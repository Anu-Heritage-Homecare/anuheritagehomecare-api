-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN     "department" VARCHAR(100),
ADD COLUMN     "phoneNumber" VARCHAR(32);

-- AlterTable
ALTER TABLE "admin_invitations" ADD COLUMN     "department" VARCHAR(100),
ADD COLUMN     "phoneNumber" VARCHAR(32);

