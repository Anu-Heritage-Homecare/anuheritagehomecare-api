import { CaregiverDocument } from './caregiver-document.entity';

/** Persistence port for caregiver employment documents. */
export interface CaregiverDocumentRepository {
  save(document: CaregiverDocument): Promise<void>;
  findById(id: string): Promise<CaregiverDocument | null>;
  listForCaregiver(caregiverId: string): Promise<CaregiverDocument[]>;
}

export const CAREGIVER_DOCUMENT_REPOSITORY = Symbol('CAREGIVER_DOCUMENT_REPOSITORY');
