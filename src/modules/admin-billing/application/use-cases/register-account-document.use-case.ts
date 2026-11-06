import { Inject, Injectable } from '@nestjs/common';
import {
  FAMILY_DIRECTORY_ENTRY_REPOSITORY,
  FamilyDirectoryEntryRepository,
} from '@modules/family-directory/domain/family-directory-entry.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AccountDocument } from '../../domain/account-document.entity';
import {
  ACCOUNT_DOCUMENT_REPOSITORY,
  AccountDocumentRepository,
} from '../../domain/account-document.repository';

export interface RegisterAccountDocumentCommand {
  accountId: string;
  title: string;
  fileName: string;
  storageKey: string;
  sizeBytes: number;
  adminId: string;
}

/**
 * Record a document uploaded to object storage against a billing account. The file
 * is pushed straight to the store with a signed ticket; this persists the metadata
 * and the opaque storage key.
 */
@Injectable()
export class RegisterAccountDocumentUseCase {
  constructor(
    @Inject(FAMILY_DIRECTORY_ENTRY_REPOSITORY)
    private readonly entries: FamilyDirectoryEntryRepository,
    @Inject(ACCOUNT_DOCUMENT_REPOSITORY) private readonly documents: AccountDocumentRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: RegisterAccountDocumentCommand): Promise<{ id: string }> {
    if ((await this.entries.findById(command.accountId)) === null) {
      throw new NotFoundDomainException('Billing account not found');
    }
    const document = AccountDocument.register({
      id: this.ids.generate(),
      familyDirectoryEntryId: command.accountId,
      title: command.title,
      fileName: command.fileName,
      storageKey: command.storageKey,
      sizeBytes: command.sizeBytes,
      uploadedByAdminId: command.adminId,
      now: this.clock.now(),
    });
    await this.documents.add(document);
    return { id: document.id };
  }
}
