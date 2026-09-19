import {
  CarePlanType as PrismaCarePlanType,
  Currency as PrismaCurrency,
  PayableType as PrismaPayableType,
  PaymentProvider as PrismaPaymentProvider,
  PaymentStatus as PrismaPaymentStatus,
  SubscriptionOpsEventType as PrismaOpsEventType,
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

/** One event on the subscription operational timeline / audit log. */
export interface SubscriptionEventView {
  type: PrismaOpsEventType;
  detail: string;
  hoursDeltaTenths: number | null;
  actorAdminId: string | null;
  actorLabel: string | null;
  occurredAt: Date;
}

/** One note on the subscription. */
export interface SubscriptionNoteView {
  body: string;
  authorAdminId: string | null;
  authorName: string | null;
  createdAt: Date;
}

/** One payment against the subscription. */
export interface SubscriptionPaymentView {
  reference: string;
  provider: PrismaPaymentProvider;
  payableType: PrismaPayableType;
  amountMinor: number;
  status: PrismaPaymentStatus;
  createdAt: Date;
}

/** The full composed detail behind the subscription tabs. */
export interface SubscriptionDetailView {
  id: string;
  planType: PrismaCarePlanType;
  status: PrismaSubscriptionStatus;
  autoRenew: boolean;
  monthlyPriceMinor: number;
  currencyCode: string;
  startDate: Date;
  recipientName: string | null;
  recipientDateOfBirth: Date | null;
  recipientGender: string | null;
  recipientConditions: string[];
  ownerName: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
  ownerAddress: string | null;
  coordinatorName: string | null;
  caregiverName: string | null;
  contractStartAt: Date | null;
  activatedAt: Date | null;
  flexAllocatedTenths: number | null;
  flexConsumedTenths: number | null;
  flexCycleEndsAt: Date | null;
  hasOverlay: boolean;
  events: SubscriptionEventView[];
  notes: SubscriptionNoteView[];
  payments: SubscriptionPaymentView[];
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
  subscriptionDetail(id: string): Promise<SubscriptionDetailView | null>;
}

export const SUBSCRIPTIONS_ADMIN_READ_MODEL = Symbol('SUBSCRIPTIONS_ADMIN_READ_MODEL');
