import {
  BillableServiceUnit,
  BillingModel,
  CarePlanType,
  Currency,
  Prisma,
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

// The single organization and its branches, emergency contacts and weekly
// schedule (Settings > Organization Profile). Synthetic values; replace with the
// real registered details before going live.
async function seedOrganization(): Promise<void> {
  const ORG_ID = 'organization';
  await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: {},
    create: {
      id: ORG_ID,
      legalName: 'CareProfs Health Services Ltd',
      businessRegNumber: 'RC-2847291',
      registeredAddress: '15 Admiralty Way, Lekki Phase 1, Lagos',
      timezone: 'WAT (UTC+1)',
      systemLanguage: 'English (UK)',
      currency: Currency.NGN,
      dateFormat: 'DD/MM/YYYY',
    },
  });

  // Mon to Fri 7:00 AM to 9:00 PM, Sat 8:00 AM to 8:00 PM, Sun closed.
  const hours = [
    { dayOfWeek: 0, isOpen: false, openMinute: 480, closeMinute: 1200 },
    { dayOfWeek: 1, isOpen: true, openMinute: 420, closeMinute: 1260 },
    { dayOfWeek: 2, isOpen: true, openMinute: 420, closeMinute: 1260 },
    { dayOfWeek: 3, isOpen: true, openMinute: 420, closeMinute: 1260 },
    { dayOfWeek: 4, isOpen: true, openMinute: 420, closeMinute: 1260 },
    { dayOfWeek: 5, isOpen: true, openMinute: 420, closeMinute: 1260 },
    { dayOfWeek: 6, isOpen: true, openMinute: 480, closeMinute: 1200 },
  ];
  for (const day of hours) {
    await prisma.organizationBusinessHour.upsert({
      where: { organizationId_dayOfWeek: { organizationId: ORG_ID, dayOfWeek: day.dayOfWeek } },
      update: { isOpen: day.isOpen, openMinute: day.openMinute, closeMinute: day.closeMinute },
      create: { organizationId: ORG_ID, ...day },
    });
  }

  const branches = [
    {
      id: '00000000-0000-0000-0000-0000000b0001',
      name: 'Lagos HQ',
      addressLine1: '15 Admiralty Way',
      city: 'Lekki',
      state: 'Lagos',
      phone: '08012340001',
    },
    {
      id: '00000000-0000-0000-0000-0000000b0002',
      name: 'Abuja Branch',
      addressLine1: 'Plot 234 Wuse 2',
      city: 'Abuja',
      state: 'FCT',
      phone: '08012340002',
    },
    {
      id: '00000000-0000-0000-0000-0000000b0003',
      name: 'Port Harcourt',
      addressLine1: '12 Aba Road',
      city: 'Port Harcourt',
      state: 'Rivers',
      phone: '08012340003',
    },
  ];
  // Open Monday to Saturday 8am to 6pm, closed Sunday (minutes from midnight).
  const branchHours = Array.from({ length: 7 }, (_unused, day) => ({
    dayOfWeek: day,
    isOpen: day !== 0,
    openMinute: 480,
    closeMinute: 1080,
  }));
  for (const branch of branches) {
    await prisma.organizationBranch.upsert({
      where: { id: branch.id },
      update: {},
      create: { organizationId: ORG_ID, ...branch },
    });
    for (const day of branchHours) {
      await prisma.branchBusinessHour.upsert({
        where: { branchId_dayOfWeek: { branchId: branch.id, dayOfWeek: day.dayOfWeek } },
        update: {},
        create: { branchId: branch.id, ...day },
      });
    }
  }

  const contacts = [
    {
      id: '00000000-0000-0000-0000-0000000c0001',
      name: 'Dr. Folake Adeyemi',
      role: 'Medical Director',
      phone: '08012345678',
    },
    {
      id: '00000000-0000-0000-0000-0000000c0002',
      name: 'Security Desk',
      role: 'Duty Lead Officer',
      phone: '08098765432',
    },
  ];
  for (const contact of contacts) {
    await prisma.organizationEmergencyContact.upsert({
      where: { id: contact.id },
      update: {},
      create: { organizationId: ORG_ID, ...contact },
    });
  }

  // A demo API key so the API Key Details drawer renders. Display only: the raw
  // secret is unknown (only its hash is stored), so this key cannot authenticate.
  // Usage buckets are stamped at "now" so the counters read non zero on seed day,
  // then roll to zero naturally as the day and week pass. createdBy is null until
  // admins are seeded (provisioning deferred); the UI then shows no creator name.
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const hour = `${day}T${now.toISOString().slice(11, 13)}`;
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const week = monday.toISOString().slice(0, 10);
  await prisma.apiKey.upsert({
    where: { id: '00000000-0000-0000-0000-0000000a0001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-0000000a0001',
      organizationId: ORG_ID,
      name: 'Mobile App Integration',
      keyPrefix: 'sk-cp',
      last4: '3f7a',
      keyHash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
      scopes: ['read_recipients', 'read_schedules', 'read_write_messages'],
      rateLimitPerHour: 1000,
      status: 'ACTIVE',
      lastUsedAt: now,
      hourBucket: hour,
      hourCount: 42,
      dayBucket: day,
      dayCount: 342,
      weekBucket: week,
      weekCount: 2847,
    },
  });
}

// The baseline system access roles (Settings > Users & Permissions). These cannot
// be deleted; admins may create custom roles alongside them. Permission keys are
// duplicated from src/modules/admin-access/domain/permission-catalog.ts; keep the
// two in step (the seed runner does not resolve the @modules path alias).
async function seedRoles(): Promise<void> {
  // Uniform module by action keys, mirroring the permission catalog's CRUD grid.
  const MODULES = [
    'dashboard',
    'care_recipients',
    'scheduling',
    'billing',
    'messages',
    'reports',
    'settings',
  ];
  const ACTIONS = ['view', 'create', 'edit', 'delete'];
  const key = (moduleKey: string, action: string): string => `${moduleKey}.${action}`;
  const grid = (spec: Record<string, string[]>): string[] =>
    Object.entries(spec).flatMap(([moduleKey, actions]) => actions.map((a) => key(moduleKey, a)));
  const ALL = MODULES.flatMap((moduleKey) => ACTIONS.map((a) => key(moduleKey, a)));
  const roles: {
    id: string;
    name: string;
    systemKey: 'SUPER_ADMIN' | 'OPERATIONS_MANAGER' | 'COORDINATOR' | null;
    permissions: string[];
  }[] = [
    {
      id: '00000000-0000-0000-0000-0000000a0001',
      name: 'Administrator',
      systemKey: 'SUPER_ADMIN',
      permissions: ALL,
    },
    {
      id: '00000000-0000-0000-0000-0000000a0002',
      name: 'Operations Manager',
      systemKey: 'OPERATIONS_MANAGER',
      permissions: grid({
        dashboard: ['view'],
        care_recipients: ['view', 'create', 'edit', 'delete'],
        scheduling: ['view', 'create', 'edit', 'delete'],
        billing: ['view', 'create', 'edit'],
        messages: ['view', 'create'],
        reports: ['view'],
        settings: ['view', 'edit'],
      }),
    },
    {
      id: '00000000-0000-0000-0000-0000000a0003',
      name: 'Coordinator',
      systemKey: 'COORDINATOR',
      // Mirrors the Create Role drawer's "Copy from Coordinator" base template grid.
      permissions: grid({
        dashboard: ['view'],
        care_recipients: ['view', 'create', 'edit', 'delete'],
        scheduling: ['view', 'create', 'edit'],
        billing: ['view', 'create'],
        messages: ['view'],
        reports: ['view'],
        settings: ['view', 'edit'],
      }),
    },
    {
      id: '00000000-0000-0000-0000-0000000a0004',
      name: 'Scheduler',
      systemKey: null,
      permissions: grid({
        dashboard: ['view'],
        care_recipients: ['view'],
        scheduling: ['view', 'create', 'edit'],
        messages: ['view'],
      }),
    },
    {
      id: '00000000-0000-0000-0000-0000000a0005',
      name: 'Finance',
      systemKey: null,
      permissions: grid({
        dashboard: ['view'],
        care_recipients: ['view'],
        billing: ['view', 'create', 'edit', 'delete'],
        reports: ['view'],
      }),
    },
  ];
  for (const role of roles) {
    await prisma.adminAccessRole.upsert({
      where: { id: role.id },
      update: { permissions: role.permissions },
      create: {
        id: role.id,
        name: role.name,
        isSystem: true,
        systemKey: role.systemKey,
        permissions: role.permissions,
      },
    });
  }
}

// Care Operations (Settings > Care Operations): the service catalog, visit formats
// with per currency rates, and the scheduling guardrails. NGN figures mirror the
// mockup; USD figures are placeholders (roughly NGN/1500). Replace before go live.
async function seedCareOperations(): Promise<void> {
  const services = [
    {
      id: '00000000-0000-0000-0000-0000000d0001',
      name: 'Personal Care',
      description: 'Assistance with bathing, dressing, and hygiene',
      isEnabled: true,
      sortOrder: 1,
    },
    {
      id: '00000000-0000-0000-0000-0000000d0002',
      name: 'Medication Management',
      description: 'Reminders, dosage tracking, and nurse reviews',
      isEnabled: true,
      sortOrder: 2,
    },
    {
      id: '00000000-0000-0000-0000-0000000d0003',
      name: 'Mobility Support',
      description: 'Transferring assistance and walking guides',
      isEnabled: true,
      sortOrder: 3,
    },
    {
      id: '00000000-0000-0000-0000-0000000d0004',
      name: 'Meal Preparation',
      description: 'Dietary plan preparation and cooking support',
      isEnabled: true,
      sortOrder: 4,
    },
    {
      id: '00000000-0000-0000-0000-0000000d0005',
      name: 'Companionship',
      description: 'Conversation, social visits, and recreation',
      isEnabled: true,
      sortOrder: 5,
    },
    {
      id: '00000000-0000-0000-0000-0000000d0006',
      name: 'Nursing Care',
      description: 'Clinical procedures, wound care, and assessments',
      isEnabled: true,
      sortOrder: 6,
    },
    {
      id: '00000000-0000-0000-0000-0000000d0007',
      name: 'Physiotherapy',
      description: 'Physical therapy drills and rehabilitation sessions',
      isEnabled: false,
      sortOrder: 7,
    },
  ];
  for (const service of services) {
    await prisma.serviceOffering.upsert({
      where: { id: service.id },
      update: {},
      create: service,
    });
  }

  const formats: {
    id: string;
    name: string;
    durationMinutes: number | null;
    rateUnit: 'PER_VISIT' | 'PER_HOUR';
    sortOrder: number;
    ngnMinor: number;
    usdMinor: number;
  }[] = [
    {
      id: '00000000-0000-0000-0000-0000000e0001',
      name: 'Standard Visit',
      durationMinutes: 60,
      rateUnit: 'PER_VISIT',
      sortOrder: 1,
      ngnMinor: 850_000,
      usdMinor: 567,
    },
    {
      id: '00000000-0000-0000-0000-0000000e0002',
      name: 'Extended Visit',
      durationMinutes: 120,
      rateUnit: 'PER_VISIT',
      sortOrder: 2,
      ngnMinor: 1_500_000,
      usdMinor: 1_000,
    },
    {
      id: '00000000-0000-0000-0000-0000000e0003',
      name: 'Overnight Care',
      durationMinutes: 720,
      rateUnit: 'PER_VISIT',
      sortOrder: 3,
      ngnMinor: 4_500_000,
      usdMinor: 3_000,
    },
    {
      id: '00000000-0000-0000-0000-0000000e0004',
      name: 'Live-in Shift',
      durationMinutes: 1440,
      rateUnit: 'PER_VISIT',
      sortOrder: 4,
      ngnMinor: 7_500_000,
      usdMinor: 5_000,
    },
    {
      id: '00000000-0000-0000-0000-0000000e0005',
      name: 'Emergency Dispatch',
      durationMinutes: null,
      rateUnit: 'PER_HOUR',
      sortOrder: 5,
      ngnMinor: 1_200_000,
      usdMinor: 800,
    },
  ];
  for (const format of formats) {
    await prisma.visitFormat.upsert({
      where: { id: format.id },
      update: {},
      create: {
        id: format.id,
        name: format.name,
        durationMinutes: format.durationMinutes,
        rateUnit: format.rateUnit,
        sortOrder: format.sortOrder,
      },
    });
    for (const rate of [
      { currency: 'NGN' as const, baseRateMinor: format.ngnMinor },
      { currency: 'USD' as const, baseRateMinor: format.usdMinor },
    ]) {
      await prisma.visitFormatRate.upsert({
        where: { visitFormatId_currency: { visitFormatId: format.id, currency: rate.currency } },
        update: { baseRateMinor: rate.baseRateMinor },
        create: {
          visitFormatId: format.id,
          currency: rate.currency,
          baseRateMinor: rate.baseRateMinor,
        },
      });
    }
  }

  await prisma.schedulingGuardrails.upsert({
    where: { id: 'scheduling_guardrails' },
    update: {},
    create: {
      id: 'scheduling_guardrails',
      minimumNoticeHours: 24,
      travelBufferMinutes: 30,
      maxVisitsPerCaregiverPerDay: 6,
      autoAssignAlgorithm: 'PROXIMITY_AND_SKILLS',
    },
  });
}

// Billing taxes and payment terms (Settings > Billing & Payments). Rates are in
// basis points (750 = 7.5%). Synthetic defaults; confirm with finance before go live.
async function seedBillingTaxesAndTerms(): Promise<void> {
  const taxes: {
    id: string;
    name: string;
    rateBasisPoints: number;
    scope: 'CLIENT_INVOICE' | 'CONTRACTOR_PAYOUT';
    description: string;
    sortOrder: number;
  }[] = [
    {
      id: '00000000-0000-0000-0000-0000000f0001',
      name: 'VAT',
      rateBasisPoints: 750,
      scope: 'CLIENT_INVOICE',
      description: 'Applied to all client invoices',
      sortOrder: 1,
    },
    {
      id: '00000000-0000-0000-0000-0000000f0002',
      name: 'WHT',
      rateBasisPoints: 500,
      scope: 'CONTRACTOR_PAYOUT',
      description: 'Applied to contractor payout processing',
      sortOrder: 2,
    },
  ];
  for (const tax of taxes) {
    await prisma.billingTax.upsert({
      where: { id: tax.id },
      update: {},
      create: { ...tax, isActive: true },
    });
  }

  const terms: {
    id: string;
    name: string;
    netDays: number | null;
    isDefault: boolean;
    isCustom: boolean;
    description: string | null;
    sortOrder: number;
  }[] = [
    {
      id: '00000000-0000-0000-0000-0000000f1001',
      name: 'Net 15',
      netDays: 15,
      isDefault: false,
      isCustom: false,
      description: '15 days from issue date',
      sortOrder: 1,
    },
    {
      id: '00000000-0000-0000-0000-0000000f1002',
      name: 'Net 30',
      netDays: 30,
      isDefault: true,
      isCustom: false,
      description: '30 days from issue date',
      sortOrder: 2,
    },
    {
      id: '00000000-0000-0000-0000-0000000f1003',
      name: 'Net 45',
      netDays: 45,
      isDefault: false,
      isCustom: false,
      description: '45 days from issue date',
      sortOrder: 3,
    },
    {
      id: '00000000-0000-0000-0000-0000000f1004',
      name: 'Custom',
      netDays: null,
      isDefault: false,
      isCustom: true,
      description: 'Manual parameters per account',
      sortOrder: 4,
    },
  ];
  for (const term of terms) {
    await prisma.billingPaymentTerm.upsert({
      where: { id: term.id },
      update: {},
      create: { ...term, isActive: true },
    });
  }
}

// Global notification settings (Settings > Notifications). Per type toggles fall
// back to the catalog defaults; this seeds the emergency routing, visit reminder
// timings and the SMS provider status shown in the mockup.
async function seedNotifications(): Promise<void> {
  await prisma.notificationSettings.upsert({
    where: { id: 'notification_settings' },
    update: {},
    create: {
      id: 'notification_settings',
      caregiverReminderMinutes: 60,
      familyNotificationMinutes: 30,
      coordinatorLateMinutes: 15,
      emergencyRecipients: ['All Coordinators', 'Medical Director', 'Branch Manager'],
      emergencyChannels: ['SMS', 'PUSH', 'EMAIL'],
      emergencyTriggers: ['sos_button', 'missed_checkin_30m', 'incident_report'],
      smsProviderName: 'Termii',
      smsProviderConnected: true,
    },
  });
}

// Security settings, integrations and a few sample login events (Settings >
// Security & Integrations). Synthetic; the login events are illustrative so the
// Recent Login History renders before any real admin logins accrue.
async function seedSecurity(): Promise<void> {
  await prisma.securitySettings.upsert({
    where: { id: 'security_settings' },
    update: {},
    create: {
      id: 'security_settings',
      passwordMinLength: 8,
      requireUppercase: true,
      requireNumber: true,
      requireSpecialChar: true,
      passwordExpiryDays: 90,
      passwordHistoryBlocked: 5,
      mfaEnforcement: 'ENABLED_FOR_ALL',
      mfaMethods: ['AUTHENTICATOR', 'SMS'],
      mfaEnforcedRoles: ['Administrator', 'Coordinator', 'Finance Managers'],
      sessionTimeoutMinutes: 30,
      maxConcurrentSessions: 3,
      rememberDeviceDays: 30,
    },
  });

  const integrations: {
    id: string;
    key: string;
    name: string;
    category: 'COMMUNICATIONS' | 'PAYMENTS' | 'IDENTITY' | 'MAPS' | 'OTHER';
    status: 'CONNECTED' | 'DISCONNECTED';
    description: string;
    sortOrder: number;
    config?: Prisma.InputJsonValue;
    connectedAt?: Date;
    lastSyncAt?: Date;
  }[] = [
    {
      id: '00000000-0000-0000-0000-00000a010001',
      key: 'termii',
      name: 'Termii',
      category: 'COMMUNICATIONS',
      status: 'CONNECTED',
      description: 'SMS and voice delivery',
      sortOrder: 1,
    },
    {
      id: '00000000-0000-0000-0000-00000a010002',
      key: 'stripe',
      name: 'Stripe',
      category: 'PAYMENTS',
      status: 'CONNECTED',
      description: 'Card payments (USD)',
      sortOrder: 2,
    },
    {
      id: '00000000-0000-0000-0000-00000a010003',
      key: 'paystack',
      name: 'Paystack',
      category: 'PAYMENTS',
      status: 'CONNECTED',
      description: 'Card and bank payments (NGN)',
      sortOrder: 3,
    },
    {
      id: '00000000-0000-0000-0000-00000a010004',
      key: 'qoreid',
      name: 'QoreID',
      category: 'IDENTITY',
      status: 'CONNECTED',
      description: 'Nigeria identity verification',
      sortOrder: 4,
    },
    {
      id: '00000000-0000-0000-0000-00000a010005',
      key: 'google_maps',
      name: 'Google Maps',
      category: 'MAPS',
      status: 'CONNECTED',
      description: 'Geocoding and routing',
      sortOrder: 5,
    },
    {
      id: '00000000-0000-0000-0000-00000a010006',
      key: 'google_calendar',
      name: 'Google Calendar',
      category: 'OTHER',
      status: 'CONNECTED',
      description: 'Two way calendar sync for visits and shifts',
      sortOrder: 6,
      config: {
        syncDirection: 'TWO_WAY',
        targetCalendar: 'CareProfs Primary Calendar',
        syncEvents: ['VISITS_AND_CARE_SHIFTS', 'STAFF_MEETINGS', 'TASK_REMINDERS'],
        autoSyncIntervalMinutes: 15,
      },
      connectedAt: new Date('2026-07-01T09:00:00.000Z'),
      lastSyncAt: new Date('2026-11-09T08:55:00.000Z'),
    },
  ];
  for (const integration of integrations) {
    await prisma.integration.upsert({
      where: { id: integration.id },
      update: {},
      create: integration,
    });
  }

  const loginCount = await prisma.adminLoginEvent.count();
  if (loginCount === 0) {
    await prisma.adminLoginEvent.createMany({
      data: [
        {
          email: 'sarah@careprofs.ng',
          operatorName: 'Sarah Jenkins',
          outcome: 'SUCCESS',
          ipAddress: '192.168.1.42',
          deviceLabel: 'Chrome / macOS',
        },
        {
          email: 'john@careprofs.ng',
          operatorName: 'John Carter (Coordinator)',
          outcome: 'SUCCESS',
          ipAddress: '102.89.34.12',
          deviceLabel: 'Safari / iOS',
        },
        {
          email: 'finance@careprofs.ng',
          operatorName: 'Finance Admin',
          outcome: 'SUCCESS',
          ipAddress: '197.210.64.1',
          deviceLabel: 'Firefox / Windows',
        },
        {
          email: 'unknown@nowhere.test',
          operatorName: null,
          outcome: 'FAILED',
          ipAddress: '45.12.89.90',
          deviceLabel: 'Unknown / Android',
        },
      ],
    });
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
  await seedOrganization();
  await seedRoles();
  await seedCareOperations();
  await seedBillingTaxesAndTerms();
  await seedNotifications();
  await seedSecurity();
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
