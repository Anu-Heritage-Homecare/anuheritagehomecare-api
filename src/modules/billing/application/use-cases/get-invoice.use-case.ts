import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { INVOICE_REPOSITORY, InvoiceRepository } from '../../domain/invoice.repository';
import { InvoiceDetailResult, toInvoiceDetail } from '../dto/billing.result';

export interface GetInvoiceQuery {
  ownerId: string;
  invoiceId: string;
}

/**
 * Use case: one invoice in full. An invoice that does not exist or belongs to
 * another owner is reported as not found.
 */
@Injectable()
export class GetInvoiceUseCase {
  constructor(@Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository) {}

  async execute(query: GetInvoiceQuery): Promise<InvoiceDetailResult> {
    const invoice = await this.invoices.findById(query.invoiceId);
    if (invoice === null || invoice.ownerId !== query.ownerId) {
      throw new NotFoundDomainException('Invoice not found');
    }
    return toInvoiceDetail(invoice);
  }
}
