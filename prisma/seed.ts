import { PrismaClient } from '@prisma/client';

/**
 * Idempotent development seed. Safe to run repeatedly.
 * Never seed real personal data. Use synthetic values only.
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.client.upsert({
    where: { email: 'ada.demo@example.com' },
    update: {},
    create: {
      firstName: 'Ada',
      lastName: 'Demo',
      email: 'ada.demo@example.com',
      phone: '+2348000000000',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
