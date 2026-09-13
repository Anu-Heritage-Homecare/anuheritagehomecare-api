import { MedicationAudit } from './medication-audit.entity';

/**
 * Persistence port for a recipient's prescription history and audit trail. Append
 * only: an entry is added when a prescription changes and never mutated; reads
 * return the most recent first.
 */
export interface MedicationAuditRepository {
  add(audit: MedicationAudit): Promise<void>;
  listForRecipient(careRecipientId: string, limit: number): Promise<MedicationAudit[]>;
}

export const MEDICATION_AUDIT_REPOSITORY = Symbol('MEDICATION_AUDIT_REPOSITORY');
