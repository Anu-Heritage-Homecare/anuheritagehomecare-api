import {
  BillableServiceUnit,
  BillingModel,
  CarePlanType,
  Currency,
  PrismaClient,
} from '@prisma/client';

/**
 * Idempotent development seed. Safe to run repeatedly.
 * Never seed real personal data. Use synthetic values only.
 */
const prisma = new PrismaClient();

// PLACEHOLDER pricing only. Amounts are in minor units (cents, kobo). Replace
// with the real, business approved prices before going live. For the monthly
// plans, also set stripePriceId (a Stripe recurring Price) and paystackPlanCode
// (a Paystack plan) once they are created at the providers; recurring billing
// cannot start without them.
interface PlanSeed {
  type: CarePlanType;
  name: string;
  description: string;
  billingModel: BillingModel;
  allowedHours: number[];
  prices: {
    currency: Currency;
    unitAmountMinor: number;
    serviceFeeMinor: number;
    stripePriceId?: string;
    paystackPlanCode?: string;
  }[];
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
          stripePriceId: price.stripePriceId ?? null,
          paystackPlanCode: price.paystackPlanCode ?? null,
        },
        create: {
          planId: saved.id,
          currency: price.currency,
          unitAmountMinor: price.unitAmountMinor,
          serviceFeeMinor: price.serviceFeeMinor,
          stripePriceId: price.stripePriceId ?? null,
          paystackPlanCode: price.paystackPlanCode ?? null,
        },
      });
    }
  }
}

// PLACEHOLDER rates only, in minor units (kobo, cents). The NGN figures mirror the
// Create Invoice wizard mockup; the USD figures are placeholders. Replace with real,
// business approved rates before going live.
interface BillableServiceSeed {
  code: string;
  name: string;
  description: string;
  category: string;
  unit: BillableServiceUnit;
  sortOrder: number;
  prices: { currency: Currency; unitAmountMinor: number }[];
}

const BILLABLE_SERVICES: BillableServiceSeed[] = [
  {
    code: 'PERSONAL_CARE_SUPPORT',
    name: 'Personal Care Support',
    description: 'Hourly Care Plan Support Tasks',
    category: 'Care & Support',
    unit: 'HOURLY',
    sortOrder: 1,
    prices: [
      { currency: 'NGN', unitAmountMinor: 1_500_000 },
      { currency: 'USD', unitAmountMinor: 3_000 },
    ],
  },
  {
    code: 'MEDICATION_MANAGEMENT',
    name: 'Medication Management',
    description: 'Vitals monitoring and daily dosage prep',
    category: 'Nursing',
    unit: 'HOURLY',
    sortOrder: 2,
    prices: [
      { currency: 'NGN', unitAmountMinor: 1_200_000 },
      { currency: 'USD', unitAmountMinor: 2_400 },
    ],
  },
  {
    code: 'PHYSIOTHERAPY_SESSIONS',
    name: 'Physiotherapy Sessions',
    description: 'Specialized motor and movement rehabilitation',
    category: 'Rehabilitation',
    unit: 'SESSION',
    sortOrder: 3,
    prices: [
      { currency: 'NGN', unitAmountMinor: 2_500_000 },
      { currency: 'USD', unitAmountMinor: 6_000 },
    ],
  },
  {
    code: 'NUTRITIONAL_MEAL_PREP',
    name: 'Nutritional Meal Prep',
    description: 'Dietary plan cooking and kitchen safety supervision',
    category: 'Care & Support',
    unit: 'HOURLY',
    sortOrder: 4,
    prices: [
      { currency: 'NGN', unitAmountMinor: 800_000 },
      { currency: 'USD', unitAmountMinor: 1_600 },
    ],
  },
  {
    code: 'ADMIN_CARE_COORDINATION',
    name: 'Admin and Care Coordination Fee',
    description: 'Quality compliance and caregiver routing',
    category: 'Administration',
    unit: 'FIXED',
    sortOrder: 5,
    prices: [
      { currency: 'NGN', unitAmountMinor: 13_000_000 },
      { currency: 'USD', unitAmountMinor: 15_000 },
    ],
  },
];

async function seedBillableServices(): Promise<void> {
  for (const service of BILLABLE_SERVICES) {
    const saved = await prisma.billableService.upsert({
      where: { code: service.code },
      update: {
        name: service.name,
        description: service.description,
        category: service.category,
        unit: service.unit,
        sortOrder: service.sortOrder,
        active: true,
      },
      create: {
        code: service.code,
        name: service.name,
        description: service.description,
        category: service.category,
        unit: service.unit,
        sortOrder: service.sortOrder,
      },
    });
    for (const price of service.prices) {
      await prisma.billableServicePrice.upsert({
        where: { serviceId_currency: { serviceId: saved.id, currency: price.currency } },
        update: { unitAmountMinor: price.unitAmountMinor },
        create: {
          serviceId: saved.id,
          currency: price.currency,
          unitAmountMinor: price.unitAmountMinor,
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
  await seedBillableServices();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
