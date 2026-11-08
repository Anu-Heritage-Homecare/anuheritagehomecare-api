import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { EMAIL_SENDER, EmailSender } from '@shared/application/ports/email-sender.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  INVOICE_REMINDER_GATEWAY,
  InvoiceReminderGateway,
} from '../../domain/invoice-reminder.gateway';
import { INVOICE_EVENT_RECORDER, InvoiceEventRecorder } from '../../domain/invoice-event.recorder';
import { ReminderChannel, buildReminderMessage, daysOverdue } from '../invoice-reminder.message';

export interface SendInvoiceReminderCommand {
  invoiceId: string;
  adminId: string;
  /** The chosen channels (Send via); at least one is required. */
  channels: ReminderChannel[];
}

const CHANNEL_LABEL: Record<ReminderChannel, string> = { EMAIL: 'Email', SMS: 'SMS' };

/**
 * Send a payment reminder for an invoice over the chosen channels (the Send Payment
 * Reminder modal). The email is dispatched for real through the shared sender; SMS has
 * no adapter yet, so it is recorded as requested but not transmitted. The channels and
 * the dispatch are logged on the invoice lifecycle audit (the History tab).
 *
 * shortcut: SMS is recorded, not sent. Wire an SMS port here when one exists.
 */
@Injectable()
export class SendInvoiceReminderUseCase {
  constructor(
    @Inject(INVOICE_REMINDER_GATEWAY) private readonly gateway: InvoiceReminderGateway,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
    @Inject(INVOICE_EVENT_RECORDER) private readonly events: InvoiceEventRecorder,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SendInvoiceReminderCommand): Promise<void> {
    if (command.channels.length === 0) {
      throw new ValidationException('Select at least one channel to send the reminder');
    }
    const context = await this.gateway.loadReminderContext(command.invoiceId);
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

    if (command.channels.includes('EMAIL')) {
      if (context.clientEmail === null || context.clientEmail.length === 0) {
        throw new ValidationException('The billing client has no email address on file');
      }
      await this.email.send({
        to: context.clientEmail,
        subject: message.subject,
        text: message.body,
      });
    }

    const channelList = command.channels.map((channel) => CHANNEL_LABEL[channel]).join(', ');
    await this.events.record({
      invoiceId: context.invoiceId,
      type: 'REMINDER_SENT',
      detail: `Payment reminder sent via ${channelList}`,
      actorType: 'ADMIN',
      actorAdminId: command.adminId,
    });
  }
}
