import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { INVOICE_REPOSITORY, InvoiceRepository } from '../../domain/invoice.repository';
import { InvoiceDetailResult, toInvoiceDetail } from '../dto/billing.result';
import { reflectInvoicePayment } from '../reflect-invoice-payment.util';
import {
  BILLING_PAYMENT_DIRECTORY,
  BillingPaymentDirectory,
} from '../ports/billing-directories.port';

export interface GetInvoiceQuery {
  ownerId: string;
  invoiceId: string;
}

/**
 * Use case: one invoice in full, reflecting whether its charge has settled. An
 * invoice that does not exist or belongs to another owner is reported as not
 * found.
 */
@Injectable()
export class GetInvoiceUseCase {
  constructor(
    @Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository,
    @Inject(BILLING_PAYMENT_DIRECTORY) private readonly payments: BillingPaymentDirectory,
  ) {}

  async execute(query: GetInvoiceQuery): Promise<InvoiceDetailResult> {
    const invoice = await this.invoices.findById(query.invoiceId);
    if (invoice === null || invoice.ownerId !== query.ownerId) {
      throw new NotFoundDomainException('Invoice not found');
    }
    reflectInvoicePayment(invoice, await this.payments.listForOwner(query.ownerId));
    return toInvoiceDetail(invoice);
  }
}
