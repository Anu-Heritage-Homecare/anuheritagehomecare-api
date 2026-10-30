import { FamilyMemberStatus as PrismaFamilyStatus } from '@prisma/client';

export type BillingAccountTab = 'ALL' | 'OUTSTANDING' | 'INACTIVE';
export type AccountBillingStatus = 'CURRENT' | 'PENDING' | 'OVERDUE' | 'NONE';

/** Filters and paging for the Billing Accounts list. */
export interface BillingAccountsFilter {
  tab: BillingAccountTab;
  search: string | null;
  branch: string | null;
  status: PrismaFamilyStatus | null;
  /** Inclusive outstanding balance window in minor units; null ends are open. */
  minBalanceMinor: number | null;
  maxBalanceMinor: number | null;
  page: number;
  pageSize: number;
}

/** One row of the Billing Accounts table (composed from the family directory). */
export interface BillingAccountRowView {
  id: string;
  sequence: number;
  /** The billing account label (falls back to the contact name when unset). */
  accountName: string;
  /** The primary contact person (the linked user's name, or the captured name). */
  primaryContact: string;
  phone: string | null;
  branch: string | null;
  recipientCount: number;
  outstandingMinor: number;
  currency: string | null;
  lastPaymentAt: Date | null;
  status: PrismaFamilyStatus;
  billingStatus: AccountBillingStatus;
}

export interface BillingAccountsView {
  rows: BillingAccountRowView[];
  total: number;
  counts: { all: number; outstanding: number; inactive: number };
  branches: string[];
}

/**
 * Read model for the Billing Accounts list: the family directory entries composed
 * with their linked care recipients, outstanding balance and last recorded payment.
 */
export interface BillingAccountsReadModel {
  list(filter: BillingAccountsFilter, now: Date): Promise<BillingAccountsView>;
}

export const BILLING_ACCOUNTS_READ_MODEL = Symbol('BILLING_ACCOUNTS_READ_MODEL');
