import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  INVOICE_REMINDER_GATEWAY,
  InvoiceReminderGateway,
} from '../../domain/invoice-reminder.gateway';
import { buildReminderMessage, daysOverdue } from '../invoice-reminder.message';
import { InvoiceReminderPreviewResult } from '../dto/invoice-reminder-preview.result';

/** The Send Payment Reminder modal preview (amount due, days overdue, message). Read only. */
@Injectable()
export class GetInvoiceReminderPreviewUseCase {
  constructor(
    @Inject(INVOICE_REMINDER_GATEWAY) private readonly gateway: InvoiceReminderGateway,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(invoiceId: string): Promise<InvoiceReminderPreviewResult> {
    const context = await this.gateway.loadReminderContext(invoiceId);
    if (context === null) {
      throw new NotFoundDomainException('Invoice not found');
    }
    const overdue = daysOverdue(context.dueDate, this.clock.now());
    const message = buildReminderMessage({
      invoiceNumber: context.invoiceNumber,
      amountDueMinor: context.amountDueMinor,
      currency: context.currency,
      daysOverdue: overdue,
    });
    return {
      invoiceNumber: context.invoiceNumber,
      amountDueMinor: context.amountDueMinor,
      currency: context.currency,
      daysOverdue: overdue,
      subject: message.subject,
      body: message.body,
    };
  }
}
