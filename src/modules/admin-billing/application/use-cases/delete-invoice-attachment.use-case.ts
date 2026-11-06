import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  INVOICE_ATTACHMENT_REPOSITORY,
  InvoiceAttachmentRepository,
} from '../../domain/invoice-attachment.repository';

/** Remove an attachment from an invoice (the Delete action), scoped to that invoice. */
@Injectable()
export class DeleteInvoiceAttachmentUseCase {
  constructor(
    @Inject(INVOICE_ATTACHMENT_REPOSITORY)
    private readonly attachments: InvoiceAttachmentRepository,
  ) {}

  async execute(command: { invoiceId: string; attachmentId: string }): Promise<void> {
    const attachment = await this.attachments.findById(command.attachmentId);
    if (attachment === null || attachment.invoiceId !== command.invoiceId) {
      throw new NotFoundDomainException('Attachment not found');
    }
    await this.attachments.remove(command.attachmentId);
  }
}
