/**
 * The emergency contact shown on an appointment detail. It is derived from the
 * family owner who set up the recipient's care (their account holds a name and
 * phone), so no separate contact is captured yet. The adapter delegates to the
 * identity context's user repository.
 */
export interface OwnerContact {
  name: string;
  phone: string;
}

export interface OwnerContactDirectory {
  findContact(ownerId: string): Promise<OwnerContact | null>;
}

export const OWNER_CONTACT_DIRECTORY = Symbol('OWNER_CONTACT_DIRECTORY');
