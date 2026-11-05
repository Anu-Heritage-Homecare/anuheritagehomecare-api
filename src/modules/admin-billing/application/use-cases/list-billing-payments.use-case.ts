import { Inject, Injectable } from '@nestjs/common';
import { BillingPaymentRowResult, BillingPaymentsListResult } from '../dto/billing-payments.result';
import {
  BILLING_PAYMENTS_READ_MODEL,
  BillingPaymentsReadModel,
  PaymentListFilter,
  PaymentListRowView,
  PaymentListStatus,
} from '../ports/billing-payments-read.port';

/** Matches the mockup: seven rows per page. */
const DEFAULT_PAGE_SIZE = 7;

export interface ListBillingPaymentsCommand {
  status: PaymentListStatus | null;
  search: string | null;
  billingAccountId: string | null;
  method: string | null;
  receivedFrom: Date | null;
  receivedTo: Date | null;
  minAmountMinor: number | null;
  maxAmountMinor: number | null;
  page: number;
  pageSize: number | null;
}

/** Assemble the org wide Payments list: rows for a tab and filters, with tab counts. */
@Injectable()
export class ListBillingPaymentsUseCase {
  constructor(
    @Inject(BILLING_PAYMENTS_READ_MODEL) private readonly reads: BillingPaymentsReadModel,
  ) {}

  async execute(command: ListBillingPaymentsCommand): Promise<BillingPaymentsListResult> {
    const page = Math.max(1, command.page);
    const pageSize = command.pageSize ?? DEFAULT_PAGE_SIZE;
    const filter: PaymentListFilter = {
      status: command.status,
      search: command.search,
      billingAccountId: command.billingAccountId,
      method: command.method,
      receivedFrom: command.receivedFrom,
      receivedTo: command.receivedTo,
      minAmountMinor: command.minAmountMinor,
      maxAmountMinor: command.maxAmountMinor,
      page,
      pageSize,
    };

    const view = await this.reads.list(filter);

    return {
      payments: view.rows.map(toResult),
      tabs: view.counts,
      methods: view.methods,
      page,
      pageSize,
      total: view.total,
      totalPages: Math.max(1, Math.ceil(view.total / pageSize)),
    };
  }
}

function toResult(row: PaymentListRowView): BillingPaymentRowResult {
  return {
    id: row.id,
    reference: `TXN-${String(row.sequence).padStart(4, '0')}`,
    invoiceNumber:
      row.invoiceSequence === null || row.invoiceIssuedAt === null
        ? null
        : `INV-${row.invoiceIssuedAt.getUTCFullYear()}-${String(row.invoiceSequence).padStart(3, '0')}`,
    billingAccountId: row.billingAccountId,
    billingAccountName: row.billingAccountName,
    amountMinor: row.amountMinor,
    currency: row.currency,
    method: row.methodLabel,
    receivedAt: row.receivedAt.toISOString(),
    status: row.status,
  };
}
