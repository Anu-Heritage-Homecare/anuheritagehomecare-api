import { Inject, Injectable } from '@nestjs/common';
import {
  FAMILY_DIRECTORY_ENTRY_REPOSITORY,
  FamilyDirectoryEntryRepository,
} from '@modules/family-directory/domain/family-directory-entry.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  DOCUMENT_STORAGE,
  DocumentStorage,
  DocumentUploadTicket,
} from '@shared/application/ports/document-storage.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

/**
 * Issue a signed ticket so the admin UI can upload a document straight to object
 * storage. After the upload succeeds the client registers the returned key through
 * the create document endpoint.
 */
@Injectable()
export class CreateAccountDocumentTicketUseCase {
  constructor(
    @Inject(FAMILY_DIRECTORY_ENTRY_REPOSITORY)
    private readonly entries: FamilyDirectoryEntryRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStorage,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: { accountId: string }): Promise<DocumentUploadTicket> {
    if ((await this.entries.findById(command.accountId)) === null) {
      throw new NotFoundDomainException('Billing account not found');
    }
    const reference = `${command.accountId}/${this.ids.generate()}`;
    return this.storage.createUploadTicket({ reference, now: this.clock.now() });
  }
}
