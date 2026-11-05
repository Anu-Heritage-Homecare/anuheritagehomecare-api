import { Inject, Injectable } from '@nestjs/common';
import { AccountAdjustmentCategory } from '../../domain/account-adjustment-category.enum';
import { AccountAdjustmentStatus } from '../../domain/account-adjustment-status.enum';
import { adjustmentReference } from '../../domain/account-adjustment-category.enum';
import {
  AccountAdjustmentRowResult,
  AccountAdjustmentsListResult,
} from '../dto/account-adjustments.result';
import {
  ACCOUNT_ADJUSTMENTS_READ_MODEL,
  AccountAdjustmentRowView,
  AccountAdjustmentsFilter,
  AccountAdjustmentsReadModel,
} from '../ports/account-adjustments-read.port';

/** Matches the mockup: five rows per page. */
const DEFAULT_PAGE_SIZE = 5;

export interface ListAccountAdjustmentsCommand {
  category: AccountAdjustmentCategory | null;
  status: AccountAdjustmentStatus | null;
  type: string | null;
  search: string | null;
  minAmountMinor: number | null;
  maxAmountMinor: number | null;
  page: number;
  pageSize: number | null;
}

/** Assemble the Credits & Adjustments list: rows for a tab and filters, with tab counts. */
@Injectable()
export class ListAccountAdjustmentsUseCase {
  constructor(
    @Inject(ACCOUNT_ADJUSTMENTS_READ_MODEL)
    private readonly reads: AccountAdjustmentsReadModel,
  ) {}

  async execute(command: ListAccountAdjustmentsCommand): Promise<AccountAdjustmentsListResult> {
    const page = Math.max(1, command.page);
    const pageSize = command.pageSize ?? DEFAULT_PAGE_SIZE;
    const filter: AccountAdjustmentsFilter = {
      category: command.category,
      status: command.status,
      type: command.type,
      search: command.search,
      minAmountMinor: command.minAmountMinor,
      maxAmountMinor: command.maxAmountMinor,
      page,
      pageSize,
    };

    const view = await this.reads.list(filter);

    return {
      adjustments: view.rows.map(toResult),
      tabs: view.counts,
      types: view.types,
      page,
      pageSize,
      total: view.total,
      totalPages: Math.max(1, Math.ceil(view.total / pageSize)),
    };
  }
}

function toResult(row: AccountAdjustmentRowView): AccountAdjustmentRowResult {
  return {
    id: row.id,
    reference: adjustmentReference(row.category, row.sequence, row.createdAt),
    category: row.category,
    type: row.type,
    billingAccountId: row.billingAccountId,
    billingAccountName: row.billingAccountName,
    amountMinor: row.amountMinor,
    currency: row.currency,
    reason: row.reason,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}
