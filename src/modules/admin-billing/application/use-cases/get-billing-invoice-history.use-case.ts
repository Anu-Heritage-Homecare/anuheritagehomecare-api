import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { InvoiceHistoryResult } from '../dto/billing-invoice-history.result';
import {
  BILLING_INVOICES_READ_MODEL,
  BillingInvoicesReadModel,
  InvoiceHistoryEventType,
} from '../ports/billing-invoices-read.port';

const EVENT_TITLES: Record<InvoiceHistoryEventType, string> = {
  INVOICE_CREATED: 'Invoice Created',
  INVOICE_APPROVED: 'Invoice Approved',
  INVOICE_SENT: 'Invoice Sent to Client',
  INVOICE_VIEWED: 'Invoice Viewed by Client',
  INVOICE_REMINDER_SENT: 'Reminder Sent',
  INVOICE_CANCELLED: 'Invoice Cancelled',
  PAYMENT_RECORDED: 'Payment Recorded',
};

/** The History tab: the evidenced invoice lifecycle timeline. Read only. */
@Injectable()
export class GetBillingInvoiceHistoryUseCase {
  constructor(
    @Inject(BILLING_INVOICES_READ_MODEL) private readonly reads: BillingInvoicesReadModel,
  ) {}

  async execute(id: string): Promise<InvoiceHistoryResult> {
    const events = await this.reads.history(id);
    if (events === null) {
      throw new NotFoundDomainException('Invoice not found');
    }
    return {
      events: events.map((event) => ({
        type: event.type,
        title: EVENT_TITLES[event.type],
        at: event.at.toISOString(),
        amountMinor: event.amountMinor,
        methodLabel: event.methodLabel,
        detail: event.detail,
        performedBy: event.performedBy,
      })),
      total: events.length,
    };
  }
}
