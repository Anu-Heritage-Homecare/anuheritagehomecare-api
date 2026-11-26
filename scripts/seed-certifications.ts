/**
 * Seed a few credentials per caregiver so the Documents tab, the care team card
 * "Certifications" line and the certification expiry alerts have realistic data.
 * Each caregiver gets a licence, a CPR certification and a background check, with
 * expiry dates spread so some fall inside the "expiring soon" window.
 *
 * Idempotent on (caregiverId, name): a credential that already exists is skipped,
 * so the script can be re-run safely.
 *
 * Usage (DATABASE_URL must point at the target database):
 *   npx ts-node -r dotenv/config scripts/seed-certifications.ts
 */
import { CredentialKind, PrismaClient, UserType } from '@prisma/client';

const DAY_MS = 86_400_000;

interface Template {
  name: string;
  kind: CredentialKind;
  withLicence: boolean;
  // Days from now the credential expires; negative or small values drive the
  // "expiring soon" and "expired" states.
  expiresInDays: (index: number) => number;
}

const TEMPLATES: Template[] = [
  {
    name: 'Certified Nursing Assistant (CNA)',
    kind: CredentialKind.LICENSE,
    withLicence: true,
    // Most valid for about two years; every seventh is inside the renewal window.
    expiresInDays: (i) => (i % 7 === 0 ? 20 + (i % 3) * 5 : 540 + (i % 6) * 30),
  },
  {
    name: 'CPR & First Aid',
    kind: CredentialKind.CERTIFICATION,
    withLicence: false,
    expiresInDays: (i) => (i % 5 === 0 ? 45 : 300 + (i % 4) * 20),
  },
  {
    name: 'Background Check',
    kind: CredentialKind.BACKGROUND_CHECK,
    withLicence: false,
    expiresInDays: (i) => 365 + (i % 5) * 20,
  },
];

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const now = Date.now();
    const caregivers = await prisma.user.findMany({
      where: { userType: UserType.CAREGIVER },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    // One read of the credentials already on file, keyed by caregiver and name, so
    // the re-run skip costs a single query instead of one per candidate row.
    const existing = new Set(
      (
        await prisma.certification.findMany({
          where: { caregiverId: { in: caregivers.map((c) => c.id) } },
          select: { caregiverId: true, name: true },
        })
      ).map((c) => `${c.caregiverId}::${c.name}`),
    );

    const rows: {
      caregiverId: string;
      name: string;
      kind: CredentialKind;
      licenseNumber: string | null;
      issuedAt: Date;
      expiresAt: Date;
      uploadedBy: string;
    }[] = [];

    for (let i = 0; i < caregivers.length; i++) {
      const caregiverId = caregivers[i].id;
      const issuedAt = new Date(now - (365 + (i % 4) * 30) * DAY_MS);
      for (const template of TEMPLATES) {
        if (existing.has(`${caregiverId}::${template.name}`)) {
          continue;
        }
        rows.push({
          caregiverId,
          name: template.name,
          kind: template.kind,
          licenseNumber: template.withLicence ? `LIC-${String(100000 + i * 37).slice(-6)}` : null,
          issuedAt,
          expiresAt: new Date(now + template.expiresInDays(i) * DAY_MS),
          uploadedBy: 'Office',
        });
      }
    }

    const { count } = await prisma.certification.createMany({ data: rows });
    console.log(
      `Seeded ${count} credentials across ${caregivers.length} caregivers ` +
        `(${caregivers.length * TEMPLATES.length - count} already present).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
