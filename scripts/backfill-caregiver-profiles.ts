/**
 * Backfill the admin caregiver directory from existing caregiver accounts.
 *
 * The admin Caregivers screen reads the `caregiver_profiles` table, keyed to a
 * caregiver `User` by `userId`. New caregivers get their profile at provisioning,
 * but any caregiver account created before that wiring (e.g. an early seed) has no
 * profile and so never appears on the screen. This one off, idempotent script
 * creates a minimal profile for every caregiver user that is missing one. Every
 * profile field except `userId` is optional (status defaults to ACTIVE, the
 * reference autoincrements, the name is composed from the user), so no detail is
 * invented; the office fills the rest in through the admin UI.
 *
 * Usage (DATABASE_URL must point at the target database, e.g. via Doppler):
 *   doppler run -- ts-node -r dotenv/config scripts/backfill-caregiver-profiles.ts
 */
import { PrismaClient, UserType } from '@prisma/client';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const caregivers = await prisma.user.findMany({
      where: { userType: UserType.CAREGIVER },
      select: { id: true },
    });

    const existing = await prisma.caregiverProfile.findMany({
      where: { userId: { in: caregivers.map((c) => c.id) } },
      select: { userId: true },
    });
    const withProfile = new Set(existing.map((e) => e.userId));

    const missing = caregivers.filter((c) => !withProfile.has(c.id));
    if (missing.length === 0) {
      console.log(`All ${caregivers.length} caregivers already have a profile. Nothing to do.`);
      return;
    }

    const result = await prisma.caregiverProfile.createMany({
      data: missing.map((c) => ({ userId: c.id })),
    });

    console.log(
      `Backfilled ${result.count} caregiver profiles (${caregivers.length} caregivers, ${withProfile.size} already had one).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
