import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { BillingAccountActivityResult } from '../dto/billing-account-activity.result';
import {
  BILLING_ACCOUNTS_READ_MODEL,
  BillingAccountActivityEventView,
  BillingAccountEventType,
  BillingAccountsReadModel,
} from '../ports/billing-accounts-read.port';

/** Event titles, matching the Overview timeline. */
const EVENT_TITLES: Record<BillingAccountEventType, string> = {
  PAYMENT_RECORDED: 'Payment Recorded',
  INVOICE_ISSUED: 'Invoice Issued',
  CARE_RECIPIENT_LINKED: 'New Care Recipient Linked',
  CARE_PLAN_UPDATED: 'Care Plan Updated',
  ACCOUNT_DETAILS_EDITED: 'Account Details Edited',
  REMINDER_SENT: 'Reminder Sent',
};

/** The Activity tab: the full account billing and care timeline. Read only. */
@Injectable()
export class GetBillingAccountActivityUseCase {
  constructor(
    @Inject(BILLING_ACCOUNTS_READ_MODEL) private readonly reads: BillingAccountsReadModel,
  ) {}

  async execute(id: string): Promise<BillingAccountActivityResult> {
    const view = await this.reads.activity(id);
    if (view === null) {
      throw new NotFoundDomainException('Billing account not found');
    }
    return {
      currency: view.currency,
      events: view.events.map(toEvent),
      total: view.events.length,
    };
  }
}

function toEvent(
  event: BillingAccountActivityEventView,
): BillingAccountActivityResult['events'][number] {
  return {
    type: event.type,
    title: EVENT_TITLES[event.type],
    at: event.at.toISOString(),
    amountMinor: event.amountMinor,
    methodLabel: event.methodLabel,
    invoiceNumber:
      event.invoiceSequence === null || event.invoiceIssuedAt === null
        ? null
        : `INV-${event.invoiceIssuedAt.getUTCFullYear()}-${String(event.invoiceSequence).padStart(3, '0')}`,
    periodStart: event.periodStart === null ? null : event.periodStart.toISOString(),
    periodEnd: event.periodEnd === null ? null : event.periodEnd.toISOString(),
    recipientName: event.recipientName,
    detail: event.detail,
    performedBy: event.performedBy,
  };
}
