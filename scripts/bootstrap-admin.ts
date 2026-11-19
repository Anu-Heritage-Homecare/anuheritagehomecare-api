/**
 * Bootstrap the first back office admin.
 *
 * Admins are provisioned out of band and no admin account is seeded, so a fresh
 * database has nobody who can log into the admin. This one off script creates (or
 * updates) a SUPER_ADMIN account from environment variables, hashing the password
 * with the same bcrypt the app uses so the normal admin login verifies it. It is
 * idempotent on the email: rerunning resets that admin's password and role.
 *
 * Usage (DATABASE_URL must point at the target database, e.g. via Doppler):
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=YOUR_PASSWORD \
 *   ADMIN_FIRST_NAME=Israel ADMIN_LAST_NAME=Obanijesu \
 *   doppler run -- npm run bootstrap:admin
 */
import { AdminRole, AdminStatus, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);

async function main(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';
  const firstName = (process.env.ADMIN_FIRST_NAME ?? 'Admin').trim();
  const lastName = (process.env.ADMIN_LAST_NAME ?? 'User').trim();

  if (!email || !email.includes('@')) {
    throw new Error('ADMIN_EMAIL is required and must be a valid email');
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD is required and must be at least 8 characters');
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Link to the seeded SUPER_ADMIN configurable role when present, so the
    // Users & Permissions screen shows a role; it is optional for auth.
    const superAdminRole = await prisma.adminAccessRole.findFirst({
      where: { systemKey: 'SUPER_ADMIN' },
      select: { id: true },
    });

    const admin = await prisma.adminUser.upsert({
      where: { email },
      update: {
        passwordHash,
        role: AdminRole.SUPER_ADMIN,
        status: AdminStatus.ACTIVE,
        mustChangePassword: false,
        roleId: superAdminRole?.id ?? null,
        passwordChangedAt: new Date(),
      },
      create: {
        email,
        firstName,
        lastName,
        passwordHash,
        role: AdminRole.SUPER_ADMIN,
        status: AdminStatus.ACTIVE,
        mustChangePassword: false,
        roleId: superAdminRole?.id ?? null,
      },
      select: { id: true, email: true, passwordHash: true },
    });

    // Self check: the stored hash must verify against the supplied password, so a
    // bad hash never ships silently.
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      throw new Error('Password hash failed to verify after write');
    }

    console.log(`Admin ready: ${admin.email} (SUPER_ADMIN). Log in with the password you set.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
