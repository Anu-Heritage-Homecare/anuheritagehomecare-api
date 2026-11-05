import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { BillingAccountPaymentsResult } from '../dto/billing-account-payments.result';
import {
  BILLING_ACCOUNTS_READ_MODEL,
  BillingAccountsReadModel,
} from '../ports/billing-accounts-read.port';

/** The Payments tab: every recorded payment on one account, newest first. Read only. */
@Injectable()
export class ListBillingAccountPaymentsUseCase {
  constructor(
    @Inject(BILLING_ACCOUNTS_READ_MODEL) private readonly reads: BillingAccountsReadModel,
  ) {}

  async execute(id: string): Promise<BillingAccountPaymentsResult> {
    const payments = await this.reads.payments(id);
    if (payments === null) {
      throw new NotFoundDomainException('Billing account not found');
    }
    return {
      payments: payments.map((payment) => ({
        id: payment.id,
        reference: `TXN-${String(payment.sequence).padStart(4, '0')}`,
        invoiceNumber:
          payment.invoiceSequence === null || payment.invoiceIssuedAt === null
            ? null
            : `INV-${payment.invoiceIssuedAt.getUTCFullYear()}-${String(payment.invoiceSequence).padStart(3, '0')}`,
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
