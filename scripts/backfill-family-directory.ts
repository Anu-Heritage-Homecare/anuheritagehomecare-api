/**
 * Backfill the admin Families directory from existing family owner accounts.
 *
 * The admin Families screen reads the `family_directory_entries` table, where an
 * ACCOUNT entry (linked by `userId`) represents a real family owner signup. Those
 * entries are created on signup going forward, but accounts that registered before
 * that wiring have no entry and so never appear on the screen. This one off,
 * idempotent script creates a missing ACCOUNT entry for every family owner user.
 *
 * Usage (DATABASE_URL must point at the target database, e.g. via Doppler):
 *   doppler run -- ts-node -r dotenv/config scripts/backfill-family-directory.ts
 */
import { FamilyDirectorySubjectKind, FamilyMemberStatus, PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const owners = await prisma.user.findMany({
      where: { isFamilyOwner: true },
      select: { id: true, firstName: true, lastName: true },
    });

    const existing = await prisma.familyDirectoryEntry.findMany({
      where: { userId: { in: owners.map((o) => o.id) } },
      select: { userId: true },
    });
    const linked = new Set(existing.map((e) => e.userId));

    const missing = owners.filter((o) => !linked.has(o.id));
    if (missing.length === 0) {
      console.log(`All ${owners.length} family owners already have a directory entry. Nothing to do.`);
      return;
    }

    const result = await prisma.familyDirectoryEntry.createMany({
      data: missing.map((o) => ({
        subjectKind: FamilyDirectorySubjectKind.ACCOUNT,
        userId: o.id,
        fullName: `${o.firstName} ${o.lastName}`.trim(),
        status: FamilyMemberStatus.ACTIVE,
      })),
    });

    console.log(
      `Backfilled ${result.count} directory entries (${owners.length} family owners, ${linked.size} already linked).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
