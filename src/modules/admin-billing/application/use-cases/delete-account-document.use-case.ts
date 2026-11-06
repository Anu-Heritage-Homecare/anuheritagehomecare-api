import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  ACCOUNT_DOCUMENT_REPOSITORY,
  AccountDocumentRepository,
} from '../../domain/account-document.repository';

/** Remove a document from an account (the Delete action), scoped to that account. */
@Injectable()
export class DeleteAccountDocumentUseCase {
  constructor(
    @Inject(ACCOUNT_DOCUMENT_REPOSITORY) private readonly documents: AccountDocumentRepository,
  ) {}

  async execute(command: { accountId: string; documentId: string }): Promise<void> {
    const document = await this.documents.findById(command.documentId);
    if (document === null || document.familyDirectoryEntryId !== command.accountId) {
      throw new NotFoundDomainException('Document not found');
    }
    await this.documents.remove(command.documentId);
  }
}
