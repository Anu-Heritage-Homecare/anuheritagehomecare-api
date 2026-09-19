import {
  CarePlanType as PrismaCarePlanType,
  Currency as PrismaCurrency,
  SubscriptionStatus as PrismaSubscriptionStatus,
} from '@prisma/client';

/** One enriched row of the Active Subscriptions table (names and overlay resolved). */
export interface EnrichedSubscriptionRowView {
  id: string;
  recipientName: string | null;
  recipientDateOfBirth: Date | null;
  accountHolderName: string | null;
  planType: PrismaCarePlanType;
  status: PrismaSubscriptionStatus;
  autoRenew: boolean;
  startDate: Date;
  monthlyPriceMinor: number;
  coordinatorName: string | null;
  caregiverName: string | null;
  flexAllocatedTenths: number | null;
  flexConsumedTenths: number | null;
}

export interface EnrichedSubscriptionPageView {
  total: number;
  rows: EnrichedSubscriptionRowView[];
}

/** The KPI figures across all subscriptions in one market. */
export interface SubscriptionKpisView {
  totalActive: number;
  paused: number;
  pendingActivation: number;
  cancelled: number;
  renewingSoon: number;
  expiring: number;
  activeScanned: number;
  activeTotal: number;
}

/**
 * Read model backing the Active Subscriptions table and its KPI bar, composing the
 * bookings subscription with the operational overlay, the recipient and the resolved
 * coordinator and caregiver names. Currency scoped.
 */
export interface SubscriptionsAdminReadModel {
  listEnriched(
    currency: PrismaCurrency,
    status: PrismaSubscriptionStatus | null,
    page: number,
    pageSize: number,
  ): Promise<EnrichedSubscriptionPageView>;
  subscriptionKpis(currency: PrismaCurrency, now: Date): Promise<SubscriptionKpisView>;
}

export const SUBSCRIPTIONS_ADMIN_READ_MODEL = Symbol('SUBSCRIPTIONS_ADMIN_READ_MODEL');
