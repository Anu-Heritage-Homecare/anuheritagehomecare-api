/**
 * Read model of a care recipient as the visits context needs it: enough to render
 * a schedule card and an appointment detail, without depending on the care
 * recipients domain shape. The adapter lives in infrastructure and delegates to
 * that context's repository.
 */
export interface RecipientSnapshot {
  id: string;
  ownerId: string;
  name: string;
  gender: string;
  dateOfBirth: Date;
  fullAddress: string;
  careNeeds: string[];
  medicalConditions: string[];
  allergies: string[];
  photoKey: string | null;
}

export interface CareRecipientDirectory {
  /**
   * Look up several recipients at once, keyed by id, so a schedule never issues a
   * query per visit. Missing ids are simply absent from the returned map.
   */
  lookup(ids: string[]): Promise<Map<string, RecipientSnapshot>>;
}

export const CARE_RECIPIENT_DIRECTORY = Symbol('CARE_RECIPIENT_DIRECTORY');
