import { FamilyContact } from './family-contact.entity';

/**
 * Persistence port for family contacts (write side). The composed reads for the admin
 * screen (contacts, communication log and permissions matrix) live in a dedicated read
 * model, not here.
 */
export interface FamilyContactRepository {
  add(contact: FamilyContact): Promise<void>;
  save(contact: FamilyContact): Promise<void>;
  findById(id: string): Promise<FamilyContact | null>;
  remove(id: string): Promise<void>;
}

export const FAMILY_CONTACT_REPOSITORY = Symbol('FAMILY_CONTACT_REPOSITORY');
