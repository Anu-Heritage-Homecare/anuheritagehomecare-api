import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  INVOICE_ATTACHMENT_REPOSITORY,
  InvoiceAttachmentRepository,
} from '../../domain/invoice-attachment.repository';
import { INVOICE_EVENT_RECORDER, InvoiceEventRecorder } from '../../domain/invoice-event.recorder';

/**
 * Record that an invoice was approved for disbursement, on the lifecycle audit log.
 * Audit only: there is no approval gate on sending or paying an invoice yet.
 */
@Injectable()
export class ApproveInvoiceUseCase {
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
      type: 'APPROVED',
      detail: 'Approved for direct disbursement',
      actorType: 'ADMIN',
      actorAdminId: command.adminId,
    });
  }
}
