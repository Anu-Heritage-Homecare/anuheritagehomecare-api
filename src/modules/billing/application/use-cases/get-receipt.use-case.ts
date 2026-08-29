import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { ReceiptResult, toReceipt } from '../dto/billing.result';
import {
  BILLING_PAYMENT_DIRECTORY,
  BillingPaymentDirectory,
} from '../ports/billing-directories.port';

export interface GetReceiptQuery {
  ownerId: string;
  receiptId: string;
}

/**
 * Use case: one receipt in full. A payment that does not exist, belongs to
 * another owner, or has not settled is reported as not found (only a successful
 * charge is a receipt).
 */
@Injectable()
export class GetReceiptUseCase {
  constructor(
    @Inject(BILLING_PAYMENT_DIRECTORY) private readonly payments: BillingPaymentDirectory,
  ) {}

  async execute(query: GetReceiptQuery): Promise<ReceiptResult> {
    const payment = await this.payments.findForOwner(query.ownerId, query.receiptId);
    if (payment === null || !payment.succeeded) {
      throw new NotFoundDomainException('Receipt not found');
    }
    return toReceipt(payment);
  }
}
