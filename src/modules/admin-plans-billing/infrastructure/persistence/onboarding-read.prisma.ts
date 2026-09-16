import { Injectable } from '@nestjs/common';
import {
  Currency as PrismaCurrency,
  OnboardingStage as PrismaStage,
  OnboardingStatus as PrismaStatus,
} from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  ActivationView,
  ApplicationDetailView,
  ApplicationPageView,
  ApplicationQueueFilters,
  OnboardingReadModel,
  StagePipelineView,
} from '../../application/ports/onboarding-read.port';

/** Funnel order, mirroring OnboardingStage; used to pair consecutive stage entries. */
const ORDERED_STAGES: PrismaStage[] = [
  'NEW_REQUEST',
  'PLAN_SELECTED',
  'PAYMENT_RECEIVED',
  'PENDING_REVIEW',
  'DOC_VERIFIED',
  'COORDINATOR_ASSIGNED',
  'CAREGIVER_SCHEDULED',
  'SUB_ACTIVATED',
];

/** Applications considered when averaging stage dwell time, so timing stays bounded. */
const PIPELINE_TIMING_LIMIT = 2000;

const ACTION_STATUSES: PrismaStatus[] = ['UNDER_REVIEW', 'NEEDS_INFO'];

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

/**
 * Prisma read model for the client onboarding pipeline, verification queue and
 * activation KPI. Stage dwell times and activation times are computed from the
 * recorded lifecycle events. Currency scoped.
 */
@Injectable()
export class OnboardingReadPrisma implements OnboardingReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async pipeline(currency: PrismaCurrency, timingWindowStart: Date): Promise<StagePipelineView[]> {
    const [counts, tasks, recentApps] = await Promise.all([
      this.prisma.clientApplication.groupBy({
        by: ['stage'],
        where: { currency },
        _count: { _all: true },
      }),
      this.prisma.clientApplication.groupBy({
        by: ['stage'],
        where: { currency, status: { in: ACTION_STATUSES } },
        _count: { _all: true },
      }),
      this.prisma.clientApplication.findMany({
        where: { currency, updatedAt: { gte: timingWindowStart } },
        orderBy: { updatedAt: 'desc' },
        take: PIPELINE_TIMING_LIMIT,
        select: { id: true },
      }),
    ]);

    const countByStage = new Map(counts.map((row) => [row.stage, row._count._all]));
    const taskByStage = new Map(tasks.map((row) => [row.stage, row._count._all]));
    const dwell = await this.stageDwellMinutes(recentApps.map((app) => app.id));

    return ORDERED_STAGES.map((stage) => ({
      stage,
      count: countByStage.get(stage) ?? 0,
      tasks: taskByStage.get(stage) ?? 0,
      avgMinutesInStage: dwell.get(stage) ?? null,
    }));
  }

  private async stageDwellMinutes(applicationIds: string[]): Promise<Map<PrismaStage, number>> {
    const result = new Map<PrismaStage, number>();
    if (applicationIds.length === 0) {
      return result;
    }
    const events = await this.prisma.clientLifecycleEvent.findMany({
      where: { applicationId: { in: applicationIds } },
      select: { applicationId: true, stage: true, enteredAt: true },
    });

    const byApp = new Map<string, Map<PrismaStage, Date>>();
    for (const event of events) {
      const stages = byApp.get(event.applicationId) ?? new Map<PrismaStage, Date>();
      const existing = stages.get(event.stage);
      if (existing === undefined || event.enteredAt.getTime() < existing.getTime()) {
        stages.set(event.stage, event.enteredAt);
      }
      byApp.set(event.applicationId, stages);
    }

    const sums = new Map<PrismaStage, { total: number; count: number }>();
    for (const stages of byApp.values()) {
      for (let index = 0; index < ORDERED_STAGES.length - 1; index += 1) {
        const from = stages.get(ORDERED_STAGES[index]);
        const to = stages.get(ORDERED_STAGES[index + 1]);
        if (from === undefined || to === undefined) {
          continue;
        }
        const minutes = (to.getTime() - from.getTime()) / MINUTE_MS;
        if (minutes < 0) {
          continue;
        }
        const acc = sums.get(ORDERED_STAGES[index]) ?? { total: 0, count: 0 };
        acc.total += minutes;
        acc.count += 1;
        sums.set(ORDERED_STAGES[index], acc);
      }
    }

    for (const [stage, acc] of sums) {
      result.set(stage, Math.round(acc.total / acc.count));
    }
    return result;
  }

  async verificationQueue(
    currency: PrismaCurrency,
    filters: ApplicationQueueFilters,
    page: number,
    pageSize: number,
  ): Promise<ApplicationPageView> {
    const where = {
      currency,
      ...(filters.status === null ? {} : { status: filters.status }),
      ...(filters.priority === null ? {} : { priority: filters.priority }),
      ...(filters.planType === null ? {} : { selectedPlanType: filters.planType }),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.clientApplication.count({ where }),
      this.prisma.clientApplication.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: Math.max(0, (page - 1) * pageSize),
        take: pageSize,
        select: {
          id: true,
          sequence: true,
          familyName: true,
          patientName: true,
          selectedPlanType: true,
          monthlyPriceMinor: true,
          priority: true,
          paymentStatus: true,
          docsStatus: true,
          coordinatorId: true,
          status: true,
          submittedAt: true,
          createdAt: true,
        },
      }),
    ]);

    const coordinatorNames = await this.adminNames(
      rows.map((row) => row.coordinatorId).filter((id): id is string => id !== null),
    );

    return {
      total,
      rows: rows.map((row) => ({
        id: row.id,
        reference: referenceFor(row.sequence, row.createdAt),
        familyName: row.familyName,
        patientName: row.patientName,
        selectedPlanType: row.selectedPlanType,
        monthlyPriceMinor: row.monthlyPriceMinor,
        priority: row.priority,
        paymentStatus: row.paymentStatus,
        docsStatus: row.docsStatus,
        coordinatorName:
          row.coordinatorId === null ? null : (coordinatorNames.get(row.coordinatorId) ?? null),
        status: row.status,
        submittedAt: row.submittedAt,
      })),
    };
  }

  async activation(currency: PrismaCurrency, now: Date): Promise<ActivationView> {
    const currentStart = new Date(now.getTime() - 30 * DAY_MS);
    const previousStart = new Date(now.getTime() - 60 * DAY_MS);

    const activated = await this.prisma.clientLifecycleEvent.findMany({
      where: {
        stage: 'SUB_ACTIVATED',
        enteredAt: { gte: previousStart },
        application: { currency },
      },
      select: { applicationId: true, enteredAt: true },
    });
    if (activated.length === 0) {
      return { avgDaysCurrent: null, avgDaysPrevious: null, activatedCurrent: 0 };
    }

    const newRequests = await this.prisma.clientLifecycleEvent.findMany({
      where: { stage: 'NEW_REQUEST', applicationId: { in: activated.map((e) => e.applicationId) } },
      select: { applicationId: true, enteredAt: true },
    });
    const openedAt = new Map(newRequests.map((e) => [e.applicationId, e.enteredAt]));

    const current: number[] = [];
    const previous: number[] = [];
    for (const event of activated) {
      const opened = openedAt.get(event.applicationId);
      if (opened === undefined) {
        continue;
      }
      const days = (event.enteredAt.getTime() - opened.getTime()) / DAY_MS;
      if (days < 0) {
        continue;
      }
      if (event.enteredAt.getTime() >= currentStart.getTime()) {
        current.push(days);
      } else {
        previous.push(days);
      }
    }

    return {
      avgDaysCurrent: average(current),
      avgDaysPrevious: average(previous),
      activatedCurrent: current.length,
    };
  }

  async applicationDetail(id: string): Promise<ApplicationDetailView | null> {
    const app = await this.prisma.clientApplication.findUnique({
      where: { id },
      include: { documents: { orderBy: { createdAt: 'asc' } } },
    });
    if (app === null) {
      return null;
    }

    const [recipient, owner, coordinatorName] = await Promise.all([
      app.careRecipientId === null
        ? Promise.resolve(null)
        : this.prisma.careRecipient.findUnique({
            where: { id: app.careRecipientId },
            select: { name: true, dateOfBirth: true, gender: true, medicalConditions: true },
          }),
      app.ownerId === null
        ? Promise.resolve(null)
        : this.prisma.user.findUnique({
            where: { id: app.ownerId },
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              postalCode: true,
            },
          }),
      app.coordinatorId === null
        ? Promise.resolve(null)
        : this.prisma.adminUser
            .findUnique({
              where: { id: app.coordinatorId },
              select: { firstName: true, lastName: true },
            })
            .then((row) => (row === null ? null : `${row.firstName} ${row.lastName}`.trim())),
    ]);

    return {
      id: app.id,
      reference: referenceFor(app.sequence, app.createdAt),
      familyName: app.familyName,
      patientName: recipient?.name ?? app.patientName,
      selectedPlanType: app.selectedPlanType,
      monthlyPriceMinor: app.monthlyPriceMinor,
      currencyCode: app.currency,
      priority: app.priority,
      paymentStatus: app.paymentStatus,
      docsStatus: app.docsStatus,
      status: app.status,
      coordinatorName,
      submittedAt: app.submittedAt,
      patientDateOfBirth: recipient?.dateOfBirth ?? app.patientDateOfBirth,
      patientGender: recipient === null ? app.patientGender : titleCase(recipient.gender),
      patientConditions: recipient?.medicalConditions ?? app.patientConditions,
      contactName: owner === null ? app.contactName : `${owner.firstName} ${owner.lastName}`.trim(),
      contactPhone: owner?.phone ?? app.contactPhone,
      contactEmail: owner?.email ?? app.contactEmail,
      contactAddress: owner === null ? app.contactAddress : formatAddress(owner),
      requestedHoursPerWeek: app.requestedHoursPerWeek,
      requestedSchedule: app.requestedSchedule,
      specialNeeds: app.specialNeeds,
      documents: app.documents.map((document) => ({ label: document.label, key: document.key })),
    };
  }

  private async adminNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.adminUser.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true },
    });
    return new Map(rows.map((row) => [row.id, `${row.firstName} ${row.lastName}`.trim()]));
  }
}

/** Human readable application reference: CR-{year}-{zero padded sequence}. */
function referenceFor(sequence: number, createdAt: Date): string {
  return `CR-${createdAt.getUTCFullYear()}-${String(sequence).padStart(3, '0')}`;
}

/** Turn an UPPER_SNAKE enum value into a Title Cased display string. */
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => (word.length === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join(' ');
}

/** One line address from a user's structured address fields. */
function formatAddress(owner: {
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
}): string {
  const line2 = owner.addressLine2 === null ? '' : `${owner.addressLine2}, `;
  return `${owner.addressLine1}, ${line2}${owner.city}, ${owner.state} ${owner.postalCode}`;
}

/** Mean of the values, rounded to one decimal place, or null when empty. */
function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(mean * 10) / 10;
}
