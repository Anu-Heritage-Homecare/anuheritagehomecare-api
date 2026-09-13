import { Inject, Injectable } from '@nestjs/common';
import {
  RECIPIENT_DOCUMENT_REPOSITORY,
  RecipientDocumentRepository,
} from '@modules/care-recipients/domain/recipient-document.repository';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface DeleteDocumentCommand {
  recipientId: string;
  documentId: string;
}

/**
 * Use case: the admin removes a document from a recipient's registry. The stored
 * object is cleaned up out of band (storage is deferred); this removes the metadata.
 */
@Injectable()
export class DeleteDocumentUseCase {
  constructor(
    @Inject(RECIPIENT_DOCUMENT_REPOSITORY) private readonly documents: RecipientDocumentRepository,
  ) {}

  async execute(command: DeleteDocumentCommand): Promise<{ id: string }> {
    const document = await this.documents.findById(command.documentId);
    if (document === null || document.careRecipientId !== command.recipientId) {
      throw new NotFoundDomainException('Document not found');
    }
    await this.documents.remove(document.id);
    return { id: document.id };
  }
}
