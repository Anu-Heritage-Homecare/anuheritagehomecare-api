import { BillingModel, CarePlanType, Currency, PrismaClient } from '@prisma/client';

/**
 * Idempotent development seed. Safe to run repeatedly.
 * Never seed real personal data. Use synthetic values only.
 */
const prisma = new PrismaClient();

// PLACEHOLDER pricing only. Amounts are in minor units (cents, kobo). Replace
// with the real, business approved prices before going live.
interface PlanSeed {
  type: CarePlanType;
  name: string;
  description: string;
  billingModel: BillingModel;
  allowedHours: number[];
  prices: { currency: Currency; unitAmountMinor: number; serviceFeeMinor: number }[];
}

const CARE_PLANS: PlanSeed[] = [
  {
    type: 'FLEXIBLE',
    name: 'Flexible Plan',
    description: 'Pay only for the hours you need.',
    billingModel: 'HOURLY',
    allowedHours: [3, 4, 6, 8, 10, 12, 14, 16, 24],
    prices: [
      { currency: 'USD', unitAmountMinor: 3000, serviceFeeMinor: 1000 },
      { currency: 'NGN', unitAmountMinor: 1_500_000, serviceFeeMinor: 500_000 },
    ],
  },
  {
    type: 'STANDARD_MONTHLY',
    name: 'Standard Monthly Plan',
    description: 'Fixed daily schedule with consistent care.',
    billingModel: 'MONTHLY',
    allowedHours: [],
    prices: [
      { currency: 'USD', unitAmountMinor: 50_000, serviceFeeMinor: 0 },
      { currency: 'NGN', unitAmountMinor: 25_000_000, serviceFeeMinor: 0 },
    ],
  },
  {
    type: 'PREMIUM',
    name: 'Premium Plan',
    description: 'Advanced support with health monitoring and more.',
    billingModel: 'MONTHLY',
    allowedHours: [],
    prices: [
      { currency: 'USD', unitAmountMinor: 90_000, serviceFeeMinor: 0 },
      { currency: 'NGN', unitAmountMinor: 45_000_000, serviceFeeMinor: 0 },
    ],
  },
  {
    type: 'LIVE_IN',
    name: 'Live-in Plan',
    description: 'A dedicated caregiver living in the home.',
    billingModel: 'MONTHLY',
    allowedHours: [],
    prices: [
      { currency: 'USD', unitAmountMinor: 300_000, serviceFeeMinor: 0 },
      { currency: 'NGN', unitAmountMinor: 150_000_000, serviceFeeMinor: 0 },
    ],
  },
];

async function seedCarePlans(): Promise<void> {
  for (const plan of CARE_PLANS) {
    const saved = await prisma.carePlan.upsert({
      where: { type: plan.type },
      update: {
        name: plan.name,
        description: plan.description,
        billingModel: plan.billingModel,
        allowedHours: plan.allowedHours,
        active: true,
      },
      create: {
        type: plan.type,
        name: plan.name,
        description: plan.description,
        billingModel: plan.billingModel,
        allowedHours: plan.allowedHours,
      },
    });
    for (const price of plan.prices) {
      await prisma.carePlanPrice.upsert({
        where: { planId_currency: { planId: saved.id, currency: price.currency } },
        update: {
          unitAmountMinor: price.unitAmountMinor,
          serviceFeeMinor: price.serviceFeeMinor,
        },
        create: {
          planId: saved.id,
          currency: price.currency,
          unitAmountMinor: price.unitAmountMinor,
          serviceFeeMinor: price.serviceFeeMinor,
        },
      });
    }
  }
}

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

  await seedCarePlans();
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
