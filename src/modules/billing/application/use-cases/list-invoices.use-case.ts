import { Inject, Injectable } from '@nestjs/common';
import { INVOICE_REPOSITORY, InvoiceRepository } from '../../domain/invoice.repository';
import { InvoiceSummaryResult, toInvoiceSummary } from '../dto/billing.result';
import { reflectInvoicePayment } from '../reflect-invoice-payment.util';
import {
  BILLING_PAYMENT_DIRECTORY,
  BillingPaymentDirectory,
} from '../ports/billing-directories.port';

export interface ListInvoicesQuery {
  ownerId: string;
}

/**
 * Use case: the owner's invoices, newest period first, each reflecting whether
 * its charge has settled. Owner scoped.
 */
@Injectable()
export class ListInvoicesUseCase {
  constructor(
    @Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository,
    @Inject(BILLING_PAYMENT_DIRECTORY) private readonly payments: BillingPaymentDirectory,
  ) {}

  async execute(query: ListInvoicesQuery): Promise<InvoiceSummaryResult[]> {
    const [invoices, payments] = await Promise.all([
      this.invoices.listForOwner(query.ownerId),
      this.payments.listForOwner(query.ownerId),
    ]);
    return invoices.map((invoice) => {
      reflectInvoicePayment(invoice, payments);
      return toInvoiceSummary(invoice);
    });
  }
}
