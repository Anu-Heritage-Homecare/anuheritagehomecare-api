/**
 * One off repair: the admin Assign Caregiver flow used to store the caregiver's
 * CaregiverProfile id as the care team `caregiverId`, but every reader (care team,
 * mobile family care plan, visits) keys the caregiver off the identity User id.
 * So assigned caregivers showed a blank name and the mobile primary came back null.
 *
 * This translates any stored profile id back to the matching User id across the
 * four places that write it: the active assignments, the assignment history, the
 * recipient primary pointer and the weekly coverage grid. Idempotent: a value that
 * is already a User id matches no profile and is left alone, so it is safe to re-run.
 *
 * Usage (DATABASE_URL must point at the target database):
 *   npx ts-node -r dotenv/config scripts/backfill-caregiver-ids.ts
 */
import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const profiles = await prisma.caregiverProfile.findMany({
      select: { id: true, userId: true },
    });
    const userIdByProfileId = new Map(profiles.map((p) => [p.id, p.userId]));
    const profileIds = [...userIdByProfileId.keys()];
    const resolve = (id: string): string => userIdByProfileId.get(id) ?? id;

    // Only the rows whose caregiver reference is still a profile id need fixing, so
    // fetch just those (a handful) rather than sweeping every profile against every
    // table. Each broken row is then repointed at the matching user id.
    const [brokenAssignments, brokenEvents, brokenPrimaries, brokenCoverage] = await Promise.all([
      prisma.careTeamAssignment.findMany({
        where: { caregiverId: { in: profileIds } },
        select: { id: true, caregiverId: true },
      }),
      prisma.careTeamAssignmentEvent.findMany({
        where: { caregiverId: { in: profileIds } },
        select: { id: true, caregiverId: true },
      }),
      prisma.careRecipient.findMany({
        where: { primaryCaregiverId: { in: profileIds } },
        select: { id: true, primaryCaregiverId: true },
      }),
      prisma.coverageBlock.findMany({
        where: { caregiverId: { in: profileIds } },
        select: { id: true, caregiverId: true },
      }),
    ]);

    await Promise.all([
      ...brokenAssignments.map((row) =>
        prisma.careTeamAssignment.update({
          where: { id: row.id },
          data: { caregiverId: resolve(row.caregiverId) },
        }),
      ),
      ...brokenEvents.map((row) =>
        prisma.careTeamAssignmentEvent.update({
          where: { id: row.id },
          data: { caregiverId: resolve(row.caregiverId) },
        }),
      ),
      ...brokenPrimaries.map((row) =>
        prisma.careRecipient.update({
          where: { id: row.id },
          data: { primaryCaregiverId: resolve(row.primaryCaregiverId as string) },
        }),
      ),
      ...brokenCoverage.map((row) =>
        prisma.coverageBlock.update({
          where: { id: row.id },
          data: { caregiverId: resolve(row.caregiverId as string) },
        }),
      ),
    ]);

    const assignments = brokenAssignments.length;
    const events = brokenEvents.length;
    const primaries = brokenPrimaries.length;
    const coverage = brokenCoverage.length;

    console.log(
      `Repaired caregiver ids: assignments=${assignments}, history events=${events}, ` +
        `recipient primary pointers=${primaries}, coverage blocks=${coverage}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
