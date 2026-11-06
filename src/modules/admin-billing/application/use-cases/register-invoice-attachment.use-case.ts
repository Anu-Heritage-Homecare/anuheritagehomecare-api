import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { InvoiceAttachment } from '../../domain/invoice-attachment.entity';
import {
  INVOICE_ATTACHMENT_REPOSITORY,
  InvoiceAttachmentRepository,
} from '../../domain/invoice-attachment.repository';

export interface RegisterInvoiceAttachmentCommand {
  invoiceId: string;
  title: string;
  fileName: string;
  storageKey: string;
  sizeBytes: number;
  adminId: string;
}

/**
 * Record a file uploaded to object storage against an invoice. The file is pushed
 * straight to the store with a signed ticket; this persists the metadata and the
 * opaque storage key.
 */
@Injectable()
export class RegisterInvoiceAttachmentUseCase {
  constructor(
    @Inject(INVOICE_ATTACHMENT_REPOSITORY)
    private readonly attachments: InvoiceAttachmentRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: RegisterInvoiceAttachmentCommand): Promise<{ id: string }> {
    if (!(await this.attachments.invoiceExists(command.invoiceId))) {
      throw new NotFoundDomainException('Invoice not found');
    }
    const attachment = InvoiceAttachment.register({
      id: this.ids.generate(),
      invoiceId: command.invoiceId,
      title: command.title,
      fileName: command.fileName,
      storageKey: command.storageKey,
      sizeBytes: command.sizeBytes,
      uploadedByAdminId: command.adminId,
      now: this.clock.now(),
    });
    await this.attachments.add(attachment);
    return { id: attachment.id };
  }
}
