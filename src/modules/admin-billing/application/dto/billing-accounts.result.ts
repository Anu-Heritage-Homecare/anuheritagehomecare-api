/**
 * The admin Billing Accounts list. Money is minor units in each account's own
 * currency; a balance is never summed across accounts of different currencies.
 */

/** One row of the Billing Accounts table. */
export interface BillingAccountResult {
  id: string;
  /** Human friendly account reference, ACC-<sequence>. */
  reference: string;
  accountName: string;
  primaryContact: string;
  phone: string | null;
  branch: string | null;
  recipientCount: number;
  outstandingMinor: number;
  currency: string | null;
  lastPaymentAt: string | null;
  status: string;
  billingStatus: string;
}

export interface BillingAccountsTabCountsResult {
  all: number;
  outstanding: number;
  inactive: number;
}

export interface BillingAccountsListResult {
  tabs: BillingAccountsTabCountsResult;
  /** Distinct office branches present, for the Branch filter. */
  branches: string[];
  accounts: BillingAccountResult[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
