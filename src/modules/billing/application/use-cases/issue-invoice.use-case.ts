import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { Invoice } from '../../domain/invoice.entity';
import { InvoiceLineItem } from '../../domain/invoice-line-item.vo';
import { INVOICE_REPOSITORY, InvoiceRepository } from '../../domain/invoice.repository';
import { InvoiceDetailResult, toInvoiceDetail } from '../dto/billing.result';
import { monthlyPeriodContaining } from '../billing-date.util';
import {
  BILLING_SUBSCRIPTION_DIRECTORY,
  BillingSubscriptionDirectory,
} from '../ports/billing-directories.port';

export interface IssueInvoiceCommand {
  subscriptionId: string;
  /** Any day within the period to bill for. */
  reference: Date;
  /**
   * The services and charges to itemise, provided by the office. When omitted a
   * single line for the plan at its monthly price is used.
   */
  lineItems?: { description: string; amountMinor: number }[];
  /** The tax rate to apply, in basis points; defaults to none. */
  taxRateBps?: number;
  /** An office applied discount in minor units; defaults to none. */
  discountMinor?: number;
}

/**
 * Use case: issue an invoice for one monthly subscription period. The office
 * supplies the line items (or the plan is billed as a single line), and the tax
 * rate and any discount are snapshotted so the invoice stays a true record.
 * Idempotent per subscription and period. The invoice is paid once its charge
 * settles, which the reads reflect from the settling payment.
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

    const sourceLines =
      command.lineItems !== undefined && command.lineItems.length > 0
        ? command.lineItems
        : [
            {
              description: `${subscription.planType} plan`,
              amountMinor: subscription.monthlyPriceMinor,
            },
          ];
    const lineItems = sourceLines.map((line) => InvoiceLineItem.create(line));

    const invoice = Invoice.issue({
      id: this.ids.generate(),
      ownerId: subscription.ownerId,
      careRecipientId: subscription.careRecipientId,
      subscriptionId: subscription.id,
      number: IssueInvoiceUseCase.numberFor(periodStart, subscription.id),
      currency: subscription.currency as Currency,
      lineItems,
      taxRateBps: command.taxRateBps ?? 0,
      discountMinor: command.discountMinor ?? 0,
      periodStart,
      periodEnd,
      dueDate: periodStart,
      issuedAt: now,
    });

    await this.invoices.save(invoice);
    return toInvoiceDetail(invoice);
  }

  private static numberFor(periodStart: Date, subscriptionId: string): string {
    const year = periodStart.getUTCFullYear();
    const month = String(periodStart.getUTCMonth() + 1).padStart(2, '0');
    return `INV-${year}${month}-${subscriptionId.slice(0, 8)}`;
  }
}
