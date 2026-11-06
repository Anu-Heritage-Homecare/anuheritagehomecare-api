import { Currency as PrismaCurrency } from '@prisma/client';

/** One service in the billable services catalog, priced for one currency. */
export interface BillableServiceView {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string | null;
  unit: 'HOURLY' | 'SESSION' | 'FIXED';
  /** The rate for the requested currency in minor units, null when not priced for it. */
  rateMinor: number | null;
}

/** Read model for the billable services catalog (Create Invoice wizard, step 3). */
export interface BillableServicesCatalogReadModel {
  /** The active services, ordered for display, priced for the given currency. */
  list(currency: PrismaCurrency): Promise<BillableServiceView[]>;
}

export const BILLABLE_SERVICES_READ_MODEL = Symbol('BILLABLE_SERVICES_READ_MODEL');
