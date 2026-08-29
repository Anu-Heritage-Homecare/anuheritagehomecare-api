import { Inject, Injectable } from '@nestjs/common';
import { ReceiptResult, toReceipt } from '../dto/billing.result';
import {
  BILLING_PAYMENT_DIRECTORY,
  BillingPaymentDirectory,
} from '../ports/billing-directories.port';

export interface ListReceiptsQuery {
  ownerId: string;
}

/**
 * Use case: the owner's receipts, one per settled payment, newest first. A
 * receipt is proof of a successful charge, so pending and failed payments never
 * appear. Owner scoped.
 */
@Injectable()
export class ListReceiptsUseCase {
  constructor(
    @Inject(BILLING_PAYMENT_DIRECTORY) private readonly payments: BillingPaymentDirectory,
  ) {}

  async execute(query: ListReceiptsQuery): Promise<ReceiptResult[]> {
    const payments = await this.payments.listForOwner(query.ownerId);
    return payments
      .filter((payment) => payment.succeeded)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((payment) => toReceipt(payment));
  }
}
