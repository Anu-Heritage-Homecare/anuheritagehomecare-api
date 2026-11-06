import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  INVOICE_ATTACHMENT_REPOSITORY,
  InvoiceAttachmentRepository,
} from '../../domain/invoice-attachment.repository';
import { INVOICE_EVENT_RECORDER, InvoiceEventRecorder } from '../../domain/invoice-event.recorder';

/**
 * Record that a payment reminder was sent for an invoice, on the lifecycle audit log.
 *
 * shortcut: records the reminder only; it does not yet dispatch the email or SMS.
 */
@Injectable()
export class SendInvoiceReminderUseCase {
  constructor(
    @Inject(INVOICE_ATTACHMENT_REPOSITORY)
    private readonly invoices: InvoiceAttachmentRepository,
    @Inject(INVOICE_EVENT_RECORDER) private readonly events: InvoiceEventRecorder,
  ) {}

  async execute(command: { invoiceId: string; adminId: string }): Promise<void> {
    if (!(await this.invoices.invoiceExists(command.invoiceId))) {
      throw new NotFoundDomainException('Invoice not found');
    }
    await this.events.record({
      invoiceId: command.invoiceId,
      type: 'REMINDER_SENT',
      detail: 'Payment reminder dispatched to the client',
      actorType: 'ADMIN',
      actorAdminId: command.adminId,
    });
  }
}
