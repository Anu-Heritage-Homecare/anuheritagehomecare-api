import { Inject, Injectable } from '@nestjs/common';
import { DOCUMENT_STORAGE, DocumentStorage } from '@shared/application/ports/document-storage.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { InvoiceAttachmentsResult } from '../dto/invoice-attachments.result';
import { ADMIN_DIRECTORY, AdminDirectory } from '../ports/admin-directory.port';
import {
  INVOICE_ATTACHMENT_REPOSITORY,
  InvoiceAttachmentRepository,
} from '../../domain/invoice-attachment.repository';

/** The invoice Attachments tab: every file on the invoice, newest first, with a signed URL. */
@Injectable()
export class ListInvoiceAttachmentsUseCase {
  constructor(
    @Inject(INVOICE_ATTACHMENT_REPOSITORY)
    private readonly attachments: InvoiceAttachmentRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStorage,
    @Inject(ADMIN_DIRECTORY) private readonly admins: AdminDirectory,
  ) {}

  async execute(invoiceId: string): Promise<InvoiceAttachmentsResult> {
    if (!(await this.attachments.invoiceExists(invoiceId))) {
      throw new NotFoundDomainException('Invoice not found');
    }
    const attachments = await this.attachments.listByInvoice(invoiceId);
    const names = await this.admins.names(attachments.map((a) => a.uploadedByAdminId));
    return {
      attachments: attachments.map((attachment) => ({
        id: attachment.id,
        title: attachment.title,
        fileName: attachment.fileName,
        sizeBytes: attachment.sizeBytes,
        uploadedAt: attachment.uploadedAt.toISOString(),
        uploadedBy:
          attachment.uploadedByAdminId === null
            ? null
            : (names.get(attachment.uploadedByAdminId) ?? null),
        downloadUrl: this.storage.urlFor(attachment.storageKey),
      })),
      total: attachments.length,
    };
  }
}
