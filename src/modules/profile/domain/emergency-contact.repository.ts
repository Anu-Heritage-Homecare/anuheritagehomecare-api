import { EmergencyContact } from './emergency-contact.entity';

/** Persistence port for the owner's emergency contact. */
export interface EmergencyContactRepository {
  findByUser(userId: string): Promise<EmergencyContact | null>;
  save(contact: EmergencyContact): Promise<void>;
}

export const EMERGENCY_CONTACT_REPOSITORY = Symbol('EMERGENCY_CONTACT_REPOSITORY');
