-- The admin Billing Accounts screen: a directory entry can carry a billing account
-- label distinct from the primary contact person, and an office branch, so the same
-- family directory entry powers both the Families screen and the Billing Accounts list.
ALTER TABLE "family_directory_entries"
  ADD COLUMN "accountName" VARCHAR(200),
  ADD COLUMN "branch" VARCHAR(120);
