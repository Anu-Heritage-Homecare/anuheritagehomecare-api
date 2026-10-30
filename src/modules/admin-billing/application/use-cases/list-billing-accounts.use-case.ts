import { Inject, Injectable } from '@nestjs/common';
import { FamilyMemberStatus as PrismaFamilyStatus } from '@prisma/client';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { BillingAccountResult, BillingAccountsListResult } from '../dto/billing-accounts.result';
import {
  BILLING_ACCOUNTS_READ_MODEL,
  BillingAccountRowView,
  BillingAccountsFilter,
  BillingAccountsReadModel,
} from '../ports/billing-accounts-read.port';

/** Matches the mockup: seven rows per page (156 accounts render as 23 pages). */
const DEFAULT_PAGE_SIZE = 7;

export interface ListBillingAccountsCommand {
  tab: 'ALL' | 'OUTSTANDING' | 'INACTIVE';
  search: string | null;
  branch: string | null;
  status: PrismaFamilyStatus | null;
  minBalanceMinor: number | null;
  maxBalanceMinor: number | null;
  page: number;
  pageSize: number | null;
}

/**
 * Assemble the admin Billing Accounts list: the account rows for one tab and set of
 * filters, the per tab counts and the branches present. Read only.
 */
@Injectable()
export class ListBillingAccountsUseCase {
  constructor(
    @Inject(BILLING_ACCOUNTS_READ_MODEL) private readonly reads: BillingAccountsReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ListBillingAccountsCommand): Promise<BillingAccountsListResult> {
    const page = Math.max(1, command.page);
    const pageSize = command.pageSize ?? DEFAULT_PAGE_SIZE;
    const filter: BillingAccountsFilter = {
      tab: command.tab,
      search: command.search,
      branch: command.branch,
      status: command.status,
      minBalanceMinor: command.minBalanceMinor,
      maxBalanceMinor: command.maxBalanceMinor,
      page,
      pageSize,
    };

    const view = await this.reads.list(filter, this.clock.now());

    return {
      tabs: view.counts,
      branches: view.branches,
      accounts: view.rows.map(toResult),
      page,
      pageSize,
      total: view.total,
      totalPages: Math.max(1, Math.ceil(view.total / pageSize)),
    };
  }
}

function toResult(row: BillingAccountRowView): BillingAccountResult {
  return {
    id: row.id,
    reference: `ACC-${row.sequence}`,
    accountName: row.accountName,
    primaryContact: row.primaryContact,
    phone: row.phone,
    branch: row.branch,
    recipientCount: row.recipientCount,
    outstandingMinor: row.outstandingMinor,
    currency: row.currency,
    lastPaymentAt: row.lastPaymentAt === null ? null : row.lastPaymentAt.toISOString(),
    status: row.status,
    billingStatus: row.billingStatus,
  };
}
