import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { BillingInvoiceDetailResult } from '../dto/billing-invoice-detail.result';
import {
  BILLING_INVOICES_READ_MODEL,
  BillingInvoiceDetailView,
  BillingInvoicesReadModel,
} from '../ports/billing-invoices-read.port';

const MILLIS_PER_DAY = 86_400_000;

/** Assemble the single invoice detail (Overview tab). Read only. */
@Injectable()
export class GetBillingInvoiceUseCase {
  constructor(
    @Inject(BILLING_INVOICES_READ_MODEL) private readonly reads: BillingInvoicesReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(id: string): Promise<BillingInvoiceDetailResult> {
    const view = await this.reads.detail(id, this.clock.now());
    if (view === null) {
      throw new NotFoundDomainException('Invoice not found');
    }
    return toResult(view);
  }
}

function toResult(view: BillingInvoiceDetailView): BillingInvoiceDetailResult {
  const balanceDueMinor = Math.max(0, view.totalAmountMinor - view.amountPaidMinor);
  const percentPaid =
    view.totalAmountMinor === 0
      ? 0
      : Math.round((view.amountPaidMinor / view.totalAmountMinor) * 100);
  return {
    id: view.id,
    number: `INV-${view.issuedAt.getUTCFullYear()}-${String(view.sequence).padStart(3, '0')}`,
    status: view.status,
    billingAccountId: view.billingAccountId,
    billingAccountName: view.billingAccountName,
    careRecipientName: view.careRecipientName,
    careRecipientPhotoKey: view.careRecipientPhotoKey,
    invoiceDate: view.issuedAt.toISOString(),
    dueDate: view.dueDate === null ? null : view.dueDate.toISOString(),
    paymentTerms: paymentTerms(view.issuedAt, view.dueDate),
    servicePeriodStart: view.periodStart.toISOString(),
    servicePeriodEnd: view.periodEnd.toISOString(),
    currency: view.currency,
    totalAmountMinor: view.totalAmountMinor,
    insuranceCoveredMinor: view.insuranceCoveredMinor,
    amountPaidMinor: view.amountPaidMinor,
    balanceDueMinor,
    percentPaid,
    lineItems: view.lineItems.map((line) => ({
      serviceName: line.serviceName,
      quantity: line.quantity,
      unit: line.unit,
      rateMinor: line.rateMinor,
      amountMinor: line.amountMinor,
    })),
  };
}

/** Net terms derived from the days between the invoice date and the due date. */
function paymentTerms(issuedAt: Date, dueDate: Date | null): string | null {
  if (dueDate === null) {
    return null;
  }
  const days = Math.round((dueDate.getTime() - issuedAt.getTime()) / MILLIS_PER_DAY);
  return `Net ${days}`;
}
