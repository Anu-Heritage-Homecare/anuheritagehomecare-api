import { CarePlanType as PrismaCarePlanType, Currency as PrismaCurrency } from '@prisma/client';

/** Per monthly plan subscriber and churn figures used to derive retention and renewal. */
export interface PlanPerformanceRowView {
  planType: PrismaCarePlanType;
  activeCount: number;
  monthlyRevenueMinor: number;
  cancelledCount: number;
  /** Active subscriptions old enough to have reached at least one renewal. */
  activeMatureCount: number;
  /** Active plus cancelled subscriptions old enough to have reached a renewal. */
  maturedCount: number;
}

export interface PlanPerformanceView {
  monthly: PlanPerformanceRowView[];
  flexibleBookings: number;
  flexibleRevenueMinor: number;
}

/**
 * Read model for the Care Plan Distribution and Performance cards. Retention and
 * renewal are computed by the use case from these counts. Currency scoped.
 */
export interface PlanPerformanceReadModel {
  perPlan(
    currency: PrismaCurrency,
    matureBefore: Date,
    monthStart: Date,
  ): Promise<PlanPerformanceView>;
}

export const PLAN_PERFORMANCE_READ_MODEL = Symbol('PLAN_PERFORMANCE_READ_MODEL');
