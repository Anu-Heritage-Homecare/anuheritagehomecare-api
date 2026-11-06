import { Inject, Injectable } from '@nestjs/common';
import {
  FAMILY_DIRECTORY_ENTRY_REPOSITORY,
  FamilyDirectoryEntryRepository,
} from '@modules/family-directory/domain/family-directory-entry.repository';
import { DOCUMENT_STORAGE, DocumentStorage } from '@shared/application/ports/document-storage.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AccountDocumentsResult } from '../dto/account-documents.result';
import {
  ACCOUNT_DOCUMENT_REPOSITORY,
  AccountDocumentRepository,
} from '../../domain/account-document.repository';

/** The account Documents tab: every file on the account, newest first, with a signed URL. */
@Injectable()
export class ListAccountDocumentsUseCase {
  constructor(
    @Inject(FAMILY_DIRECTORY_ENTRY_REPOSITORY)
    private readonly entries: FamilyDirectoryEntryRepository,
    @Inject(ACCOUNT_DOCUMENT_REPOSITORY) private readonly documents: AccountDocumentRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStorage,
  ) {}

  async execute(accountId: string): Promise<AccountDocumentsResult> {
    if ((await this.entries.findById(accountId)) === null) {
      throw new NotFoundDomainException('Billing account not found');
    }
    const documents = await this.documents.listByAccount(accountId);
    return {
      documents: documents.map((document) => ({
        id: document.id,
        title: document.title,
        fileName: document.fileName,
        sizeBytes: document.sizeBytes,
        uploadedAt: document.uploadedAt.toISOString(),
        downloadUrl: this.storage.urlFor(document.storageKey),
      })),
      total: documents.length,
    };
  }
}
