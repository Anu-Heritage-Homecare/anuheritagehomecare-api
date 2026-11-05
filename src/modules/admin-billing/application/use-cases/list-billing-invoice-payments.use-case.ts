import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { InvoicePaymentsResult } from '../dto/billing-invoice-payments.result';
import {
  BILLING_INVOICES_READ_MODEL,
  BillingInvoicesReadModel,
} from '../ports/billing-invoices-read.port';

/** The invoice Payments tab: payments recorded against one invoice, newest first. Read only. */
@Injectable()
export class ListBillingInvoicePaymentsUseCase {
  constructor(
    @Inject(BILLING_INVOICES_READ_MODEL) private readonly reads: BillingInvoicesReadModel,
  ) {}

  async execute(id: string): Promise<InvoicePaymentsResult> {
    const payments = await this.reads.payments(id);
    if (payments === null) {
      throw new NotFoundDomainException('Invoice not found');
    }
    return {
      payments: payments.map((payment) => ({
        id: payment.id,
        reference: `TXN-${String(payment.sequence).padStart(4, '0')}`,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        method: payment.methodLabel,
        receivedAt: payment.receivedAt.toISOString(),
        status: 'COMPLETED',
      })),
      total: payments.length,
    };
  }
}
