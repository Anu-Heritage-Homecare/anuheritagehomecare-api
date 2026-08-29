/**
 * Read port to resolve who owns a care recipient, so a request can be scoped to
 * the family owner. The adapter delegates to the care recipients context.
 */
export interface CareRecipientOwnerDirectory {
  ownerOf(careRecipientId: string): Promise<string | null>;
}

export const CARE_RECIPIENT_OWNER_DIRECTORY = Symbol('CARE_RECIPIENT_OWNER_DIRECTORY');
