import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { BillingInvoiceRowResult, BillingInvoicesListResult } from '../dto/billing-invoices.result';
import {
  BILLING_INVOICES_READ_MODEL,
  BillingInvoicesReadModel,
  InvoiceListFilter,
  InvoiceListRowView,
  InvoiceListStatus,
} from '../ports/billing-invoices-read.port';

/** Matches the mockup: seven rows per page (342 invoices render as 49 pages). */
const DEFAULT_PAGE_SIZE = 7;

export interface ListBillingInvoicesCommand {
  status: InvoiceListStatus | null;
  search: string | null;
  billingAccountId: string | null;
  dueFrom: Date | null;
  dueTo: Date | null;
  minAmountMinor: number | null;
  maxAmountMinor: number | null;
  page: number;
  pageSize: number | null;
}

/** Assemble the org wide Invoices list: rows for a tab and filters, with tab counts. */
@Injectable()
export class ListBillingInvoicesUseCase {
  constructor(
    @Inject(BILLING_INVOICES_READ_MODEL) private readonly reads: BillingInvoicesReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ListBillingInvoicesCommand): Promise<BillingInvoicesListResult> {
    const page = Math.max(1, command.page);
    const pageSize = command.pageSize ?? DEFAULT_PAGE_SIZE;
    const filter: InvoiceListFilter = {
      status: command.status,
      search: command.search,
      billingAccountId: command.billingAccountId,
      dueFrom: command.dueFrom,
      dueTo: command.dueTo,
      minAmountMinor: command.minAmountMinor,
      maxAmountMinor: command.maxAmountMinor,
      page,
      pageSize,
    };

    const view = await this.reads.list(filter, this.clock.now());

    return {
      invoices: view.rows.map(toResult),
      tabs: view.counts,
      page,
      pageSize,
      total: view.total,
      totalPages: Math.max(1, Math.ceil(view.total / pageSize)),
    };
  }
}

function toResult(row: InvoiceListRowView): BillingInvoiceRowResult {
  return {
    id: row.id,
    number: `INV-${row.issuedAt.getUTCFullYear()}-${String(row.sequence).padStart(3, '0')}`,
    billingAccountId: row.billingAccountId,
    billingAccountName: row.billingAccountName,
    careRecipientName: row.careRecipientName,
    amountMinor: row.amountMinor,
    currency: row.currency,
    dueDate: row.dueDate === null ? null : row.dueDate.toISOString(),
    status: row.status,
  };
}
