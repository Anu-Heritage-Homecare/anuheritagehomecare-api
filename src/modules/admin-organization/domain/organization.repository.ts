import { Organization } from './organization.entity';
import { OrganizationBranch } from './organization-branch.entity';
import { OrganizationEmergencyContact } from './organization-emergency-contact.entity';

/** The fixed id of the one and only organization row (this is a single tenant service). */
export const ORGANIZATION_SINGLETON_ID = 'organization';

/**
 * Persistence port for the organization and its child collections. The singleton
 * is implicit: there is one organization, so no id is passed for its reads. Child
 * saves must ensure the organization row exists first so the foreign key holds on a
 * fresh database.
 */
export interface OrganizationRepository {
  /** The organization with its weekly schedule, or null if never configured. */
  getProfile(): Promise<Organization | null>;
  /** Upsert the organization and replace its weekly schedule. */
  saveProfile(organization: Organization): Promise<void>;

  listBranches(): Promise<OrganizationBranch[]>;
  findBranch(id: string): Promise<OrganizationBranch | null>;
  saveBranch(branch: OrganizationBranch): Promise<void>;
  deleteBranch(id: string): Promise<void>;
  /** Whether an admin user exists, to validate a branch manager assignment. */
  managerExists(adminUserId: string): Promise<boolean>;

  listContacts(): Promise<OrganizationEmergencyContact[]>;
  findContact(id: string): Promise<OrganizationEmergencyContact | null>;
  saveContact(contact: OrganizationEmergencyContact): Promise<void>;
  deleteContact(id: string): Promise<void>;
}

export const ORGANIZATION_REPOSITORY = Symbol('ORGANIZATION_REPOSITORY');
