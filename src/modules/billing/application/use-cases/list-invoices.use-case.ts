import { Inject, Injectable } from '@nestjs/common';
import { INVOICE_REPOSITORY, InvoiceRepository } from '../../domain/invoice.repository';
import { InvoiceSummaryResult, toInvoiceSummary } from '../dto/billing.result';

export interface ListInvoicesQuery {
  ownerId: string;
}

/** Use case: the owner's invoices, newest period first. Owner scoped. */
@Injectable()
export class ListInvoicesUseCase {
  constructor(@Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository) {}

  async execute(query: ListInvoicesQuery): Promise<InvoiceSummaryResult[]> {
    const invoices = await this.invoices.listForOwner(query.ownerId);
    return invoices.map((invoice) => toInvoiceSummary(invoice));
  }
}
