import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { BillingAccountInvoicesResult } from '../dto/billing-account-invoices.result';
import {
  BILLING_ACCOUNTS_READ_MODEL,
  BillingAccountsReadModel,
} from '../ports/billing-accounts-read.port';

/** The Invoices tab: every invoice billed to one account, newest first. Read only. */
@Injectable()
export class ListBillingAccountInvoicesUseCase {
  constructor(
    @Inject(BILLING_ACCOUNTS_READ_MODEL) private readonly reads: BillingAccountsReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(id: string): Promise<BillingAccountInvoicesResult> {
    const invoices = await this.reads.invoices(id, this.clock.now());
    if (invoices === null) {
      throw new NotFoundDomainException('Billing account not found');
    }
    return {
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        number: `INV-${invoice.issuedAt.getUTCFullYear()}-${String(invoice.sequence).padStart(3, '0')}`,
        periodStart: invoice.periodStart.toISOString(),
        periodEnd: invoice.periodEnd.toISOString(),
        amountMinor: invoice.amountMinor,
        currency: invoice.currency,
        dueDate: invoice.dueDate === null ? null : invoice.dueDate.toISOString(),
        paidAmountMinor: invoice.paidAmountMinor,
        status: invoice.status,
      })),
      total: invoices.length,
    };
  }
}
