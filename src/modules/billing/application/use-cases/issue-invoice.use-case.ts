import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { Invoice } from '../../domain/invoice.entity';
import { INVOICE_REPOSITORY, InvoiceRepository } from '../../domain/invoice.repository';
import { InvoiceDetailResult, toInvoiceDetail } from '../dto/billing.result';
import { monthlyPeriodContaining } from '../billing-date.util';
import {
  BILLING_PAYMENT_DIRECTORY,
  BILLING_SUBSCRIPTION_DIRECTORY,
  BillingPaymentDirectory,
  BillingSubscriptionDirectory,
} from '../ports/billing-directories.port';

export interface IssueInvoiceCommand {
  subscriptionId: string;
  /** Any day within the period to bill for. */
  reference: Date;
}

/**
 * Use case: issue an invoice for one monthly subscription period. It bills the
 * subscription's monthly price for the period containing the reference day, and
 * marks the invoice paid if a settled payment for that subscription already
 * covers it. Idempotent per subscription and period.
 *
 * This is the capture path for billing history; it is triggered by the office
 * (an admin action or a scheduled job when a period closes), not by a family
 * owner.
 */
@Injectable()
export class IssueInvoiceUseCase {
  constructor(
    @Inject(BILLING_SUBSCRIPTION_DIRECTORY)
    private readonly subscriptions: BillingSubscriptionDirectory,
    @Inject(BILLING_PAYMENT_DIRECTORY) private readonly payments: BillingPaymentDirectory,
    @Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: IssueInvoiceCommand): Promise<InvoiceDetailResult> {
    const subscription = await this.subscriptions.findById(command.subscriptionId);
    if (subscription === null) {
      throw new NotFoundDomainException('Subscription not found');
    }

    const { periodStart, periodEnd } = monthlyPeriodContaining(
      subscription.startDate,
      command.reference,
    );
    const now = this.clock.now();

    const invoice = Invoice.issue({
      id: this.ids.generate(),
      ownerId: subscription.ownerId,
      careRecipientId: subscription.careRecipientId,
      subscriptionId: subscription.id,
      number: IssueInvoiceUseCase.numberFor(periodStart, subscription.id),
      currency: subscription.currency as Currency,
      amountMinor: subscription.monthlyPriceMinor,
      periodStart,
      periodEnd,
      dueDate: periodStart,
      issuedAt: now,
    });

    const settledPayment = (await this.payments.listForOwner(subscription.ownerId)).find(
      (payment) =>
        payment.succeeded &&
        payment.payableType === 'SUBSCRIPTION' &&
        payment.payableId === subscription.id &&
        payment.createdAt.getTime() >= periodStart.getTime(),
    );
    if (settledPayment !== undefined) {
      invoice.markPaid(settledPayment.createdAt);
    }

    await this.invoices.save(invoice);
    return toInvoiceDetail(invoice);
  }

  private static numberFor(periodStart: Date, subscriptionId: string): string {
    const year = periodStart.getUTCFullYear();
    const month = String(periodStart.getUTCMonth() + 1).padStart(2, '0');
    return `INV-${year}${month}-${subscriptionId.slice(0, 8)}`;
  }
}
