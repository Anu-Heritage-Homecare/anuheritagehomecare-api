import { Inject, Injectable } from '@nestjs/common';
import { DocumentStatus } from '@modules/care-recipients/domain/document-status.enum';
import {
  RECIPIENT_DOCUMENT_REPOSITORY,
  RecipientDocumentRepository,
} from '@modules/care-recipients/domain/recipient-document.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface SetDocumentStatusCommand {
  recipientId: string;
  documentId: string;
  status: DocumentStatus;
}

/**
 * Use case: the admin changes a document's review status (for example marking it
 * verified or pending review).
 */
@Injectable()
export class SetDocumentStatusUseCase {
  constructor(
    @Inject(RECIPIENT_DOCUMENT_REPOSITORY) private readonly documents: RecipientDocumentRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SetDocumentStatusCommand): Promise<{ id: string; status: string }> {
    const document = await this.documents.findById(command.documentId);
    if (document === null || document.careRecipientId !== command.recipientId) {
      throw new NotFoundDomainException('Document not found');
    }
    document.setStatus(command.status, this.clock.now());
    await this.documents.save(document);
    return { id: document.id, status: String(document.status) };
  }
}
