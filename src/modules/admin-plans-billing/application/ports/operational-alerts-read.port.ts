import { Currency as PrismaCurrency } from '@prisma/client';

/** Counts behind the Operational Alerts Queue that come straight from current state. */
export interface OperationalAlertCountsView {
  paymentFailedClients: number;
  documentationMissing: number;
  coordinatorNotAssigned: number;
  subscriptionSuspended: number;
}

/** Read model for the Operational Alerts Queue. Currency scoped. */
export interface OperationalAlertsReadModel {
  alertCounts(currency: PrismaCurrency, failedSince: Date): Promise<OperationalAlertCountsView>;
}

export const OPERATIONAL_ALERTS_READ_MODEL = Symbol('OPERATIONAL_ALERTS_READ_MODEL');
