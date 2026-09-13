import { RecipientDocument } from './recipient-document.entity';

/**
 * Persistence port for recipient documents (write side). The paginated, filtered
 * reads and the aggregate counts for the admin screen live in a dedicated read
 * model, not here.
 */
export interface RecipientDocumentRepository {
  add(document: RecipientDocument): Promise<void>;
  save(document: RecipientDocument): Promise<void>;
  findById(id: string): Promise<RecipientDocument | null>;
  remove(id: string): Promise<void>;
}

export const RECIPIENT_DOCUMENT_REPOSITORY = Symbol('RECIPIENT_DOCUMENT_REPOSITORY');
