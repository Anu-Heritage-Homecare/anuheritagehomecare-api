import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  DOCUMENT_STORAGE,
  DocumentStorage,
  DocumentUploadTicket,
} from '@shared/application/ports/document-storage.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  INVOICE_ATTACHMENT_REPOSITORY,
  InvoiceAttachmentRepository,
} from '../../domain/invoice-attachment.repository';

/**
 * Issue a signed ticket so the admin UI can upload an invoice attachment straight
 * to object storage. After the upload succeeds the client registers the returned
 * key through the create attachment endpoint.
 */
@Injectable()
export class CreateInvoiceAttachmentTicketUseCase {
  constructor(
    @Inject(INVOICE_ATTACHMENT_REPOSITORY)
    private readonly attachments: InvoiceAttachmentRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStorage,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: { invoiceId: string }): Promise<DocumentUploadTicket> {
    if (!(await this.attachments.invoiceExists(command.invoiceId))) {
      throw new NotFoundDomainException('Invoice not found');
    }
    const reference = `invoices/${command.invoiceId}/${this.ids.generate()}`;
    return this.storage.createUploadTicket({ reference, now: this.clock.now() });
  }
}
