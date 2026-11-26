/**
 * Seed a batch of caregivers so the admin roster and the assign/scheduling flows
 * have realistic data to work with. Each caregiver is created the same shape the
 * provisioning flow produces: a verified, active CAREGIVER user flagged to change
 * its password on first login, plus an admin CaregiverProfile overlay with varied
 * role, branch, skills and experience.
 *
 * Idempotent on email: a caregiver whose email already exists is skipped, so the
 * script can be re-run to top up to the target count.
 *
 * Usage (DATABASE_URL must point at the target database):
 *   COUNT=40 ts-node -r dotenv/config scripts/seed-caregivers.ts
 */
import {
  CaregiverEmploymentType,
  CaregiverStatus,
  Country,
  Gender,
  PrismaClient,
  UserStatus,
  UserType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
const TARGET = Number(process.env.COUNT ?? 40);
// A single known temporary password for every seeded caregiver; they are flagged
// to change it on first login. Never used in production, only for seeded data.
const TEMP_PASSWORD = process.env.SEED_PASSWORD ?? 'Caregiver#2026';

const FIRST = [
  'Amara', 'Chidi', 'Ngozi', 'Emeka', 'Folake', 'Tunde', 'Zainab', 'Yusuf', 'Adaeze', 'Ibrahim',
  'Blessing', 'Samuel', 'Grace', 'David', 'Mary', 'James', 'Sarah', 'Michael', 'Esther', 'Daniel',
  'Patience', 'John', 'Ruth', 'Peter', 'Hannah', 'Joseph', 'Deborah', 'Victor', 'Rachel', 'Paul',
  'Comfort', 'Stephen', 'Joy', 'Isaac', 'Faith', 'Elijah', 'Gift', 'Abraham', 'Mercy', 'Caleb',
  'Linda', 'Robert', 'Angela', 'Thomas', 'Nicole', 'Kevin', 'Laura', 'Brian', 'Monica', 'Eric',
];
const LAST = [
  'Okafor', 'Adeyemi', 'Balogun', 'Okonkwo', 'Eze', 'Afolabi', 'Ibrahim', 'Nwosu', 'Chukwu', 'Bello',
  'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas',
  'Ogunleye', 'Adebayo', 'Mohammed', 'Obi', 'Lawson', 'Smith', 'Garcia', 'Martinez', 'Lee', 'Walker',
];
const TITLES = [
  'Certified Nursing Assistant (CNA)',
  'Home Health Aide',
  'Registered Nurse',
  'Licensed Practical Nurse',
  'Personal Care Assistant',
  'Companion Caregiver',
];
const BRANCHES = ['Lagos', 'Abuja', 'Port Harcourt', 'North Branch', 'Central Branch', 'West Branch'];
const EMPLOYMENT = [
  CaregiverEmploymentType.FULL_TIME,
  CaregiverEmploymentType.PART_TIME,
  CaregiverEmploymentType.CONTRACT,
];
const SKILLS = [
  'Dementia care', 'Medication management', 'Mobility assistance', 'Wound care', 'Personal hygiene',
  'Meal preparation', 'Companionship', 'Vital signs', 'Physical therapy support', 'Diabetes care',
];
const LANGUAGES = ['English', 'Yoruba', 'Igbo', 'Hausa', 'French', 'Spanish'];
const SHIFTS = ['Morning', 'Afternoon', 'Evening', 'No preference'];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function sample<T>(arr: T[], count: number, seed: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < count; i++) out.push(arr[(seed + i * 3) % arr.length]);
  return [...new Set(out)];
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(TEMP_PASSWORD, SALT_ROUNDS);
    const existingPhones = new Set(
      (await prisma.user.findMany({ select: { phone: true } })).map((u) => u.phone),
    );
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < TARGET; i++) {
      const first = pick(FIRST, i);
      const last = pick(LAST, i * 7 + 3);
      const email = `${first}.${last}.${i + 1}@careprofs.test`.toLowerCase();
      if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
        skipped += 1;
        continue;
      }
      // Build a unique phone that is not already taken.
      let phone = '';
      let n = 7000000 + i * 137;
      do {
        phone = `+234803${String(n).padStart(7, '0').slice(-7)}`;
        n += 1;
      } while (existingPhones.has(phone));
      existingPhones.add(phone);

      const isNg = i % 3 !== 0;
      const user = await prisma.user.create({
        data: {
          userType: UserType.CAREGIVER,
          firstName: first,
          lastName: last,
          email,
          phone,
          addressLine1: `${10 + i} ${pick(['Allen', 'Marina', 'Awolowo', 'Maple', 'Oak', 'Park'], i)} ${isNg ? 'Avenue' : 'Street'}`,
          city: isNg ? pick(['Ikeja', 'Lekki', 'Garki', 'GRA'], i) : pick(['Boston', 'Austin', 'Denver'], i),
          state: isNg ? pick(['Lagos', 'Abuja', 'Rivers'], i) : pick(['MA', 'TX', 'CO'], i),
          postalCode: isNg ? '100271' : '02108',
          country: isNg ? Country.NG : Country.US,
          passwordHash,
          emailVerified: true,
          mustChangePassword: true,
          status: UserStatus.ACTIVE,
        },
        select: { id: true },
      });
      await prisma.caregiverProfile.create({
        data: {
          userId: user.id,
          title: pick(TITLES, i),
          gender: i % 2 === 0 ? Gender.FEMALE : Gender.MALE,
          branch: pick(BRANCHES, i),
          employmentType: pick(EMPLOYMENT, i),
          experienceYears: 1 + (i % 15),
          status: CaregiverStatus.ACTIVE,
          skills: sample(SKILLS, 3 + (i % 3), i),
          languages: sample(LANGUAGES, 2, i),
          maxHoursPerWeek: 40,
          preferredShift: pick(SHIFTS, i),
        },
      });
      created += 1;
    }

    const total = await prisma.caregiverProfile.count();
    console.log(
      `Seeded ${created} caregivers (${skipped} skipped as existing). Roster now has ${total} caregiver profiles. Temporary password: ${TEMP_PASSWORD}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
