/**
 * Read port resolving the care plan a recipient is on (its display name), so the
 * Care section can show it without depending on the bookings domain shape.
 */
export interface FamilyPlanDirectory {
  planNameForRecipient(ownerId: string, careRecipientId: string): Promise<string | null>;
}

export const FAMILY_PLAN_DIRECTORY = Symbol('FAMILY_PLAN_DIRECTORY');
