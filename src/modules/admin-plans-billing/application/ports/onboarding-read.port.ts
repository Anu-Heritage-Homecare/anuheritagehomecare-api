import {
  CarePlanType as PrismaCarePlanType,
  Currency as PrismaCurrency,
  DocsStatus as PrismaDocsStatus,
  OnboardingPaymentStatus as PrismaPaymentStatus,
  OnboardingPriority as PrismaPriority,
  OnboardingStage as PrismaStage,
  OnboardingStatus as PrismaStatus,
} from '@prisma/client';

/** One stage of the Commercial Operations Pipeline (client lifecycle funnel). */
export interface StagePipelineView {
  stage: PrismaStage;
  /** Applications whose current stage is this one. */
  count: number;
  /** Applications at this stage that still need admin action (under review or needs info). */
  tasks: number;
  /** Average time applications dwell in this stage before moving on; null at the terminal stage. */
  avgMinutesInStage: number | null;
}

/** One row of the Recent Care Requests verification queue. */
export interface ApplicationRowView {
  id: string;
  reference: string;
  familyName: string;
  patientName: string;
  selectedPlanType: PrismaCarePlanType | null;
  monthlyPriceMinor: number | null;
  priority: PrismaPriority;
  paymentStatus: PrismaPaymentStatus;
  docsStatus: PrismaDocsStatus;
  coordinatorName: string | null;
  status: PrismaStatus;
  submittedAt: Date;
}

export interface ApplicationPageView {
  total: number;
  rows: ApplicationRowView[];
}

/** Filters for the verification queue. Any combination may be applied. */
export interface ApplicationQueueFilters {
  status: PrismaStatus | null;
  priority: PrismaPriority | null;
  planType: PrismaCarePlanType | null;
}

/** End to end activation time, current window versus the previous one, for the trend. */
export interface ActivationView {
  avgDaysCurrent: number | null;
  avgDaysPrevious: number | null;
  activatedCurrent: number;
}

/**
 * Read model over the client onboarding tables for the admin pipeline, verification
 * queue and activation KPI. Currency scoped, consistent with the market selector.
 */
export interface OnboardingReadModel {
  pipeline(currency: PrismaCurrency, timingWindowStart: Date): Promise<StagePipelineView[]>;
  verificationQueue(
    currency: PrismaCurrency,
    filters: ApplicationQueueFilters,
    page: number,
    pageSize: number,
  ): Promise<ApplicationPageView>;
  activation(currency: PrismaCurrency, now: Date): Promise<ActivationView>;
}

export const ONBOARDING_READ_MODEL = Symbol('ONBOARDING_READ_MODEL');
