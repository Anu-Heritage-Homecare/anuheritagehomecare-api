import { AccountDocument } from './account-document.entity';

export interface AccountDocumentRepository {
  add(document: AccountDocument): Promise<void>;
  /** The account's documents, newest first. */
  listByAccount(familyDirectoryEntryId: string): Promise<AccountDocument[]>;
}

export const ACCOUNT_DOCUMENT_REPOSITORY = Symbol('ACCOUNT_DOCUMENT_REPOSITORY');
