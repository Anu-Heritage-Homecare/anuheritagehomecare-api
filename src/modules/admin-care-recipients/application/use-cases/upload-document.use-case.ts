import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { DocumentCategory } from '@modules/care-recipients/domain/document-category.enum';
import { DocumentStatus } from '@modules/care-recipients/domain/document-status.enum';
import { RecipientDocument } from '@modules/care-recipients/domain/recipient-document.entity';
import {
  RECIPIENT_DOCUMENT_REPOSITORY,
  RecipientDocumentRepository,
} from '@modules/care-recipients/domain/recipient-document.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface UploadDocumentCommand {
  recipientId: string;
  name: string;
  category: DocumentCategory;
  storageKey: string;
  sizeBytes: number;
  uploadedByName?: string | null;
  status?: DocumentStatus;
  expiresAt?: Date | null;
}

/**
 * Use case: the admin registers an uploaded document against a recipient. The file
 * itself is uploaded to object storage out of band; this records the metadata and
 * the opaque storage key (storage and the download flow are deferred).
 */
@Injectable()
export class UploadDocumentUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(RECIPIENT_DOCUMENT_REPOSITORY) private readonly documents: RecipientDocumentRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: UploadDocumentCommand): Promise<{ id: string }> {
    if ((await this.recipients.findById(command.recipientId)) === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const document = RecipientDocument.upload({
      id: this.ids.generate(),
      careRecipientId: command.recipientId,
      name: command.name,
      category: command.category,
      storageKey: command.storageKey,
      sizeBytes: command.sizeBytes,
      uploadedByName: command.uploadedByName,
      status: command.status,
      expiresAt: command.expiresAt,
      now: this.clock.now(),
    });
    await this.documents.add(document);
    return { id: document.id };
  }
}
