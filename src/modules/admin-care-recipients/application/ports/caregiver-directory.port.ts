export const CAREGIVER_DIRECTORY = Symbol('CAREGIVER_DIRECTORY');

/**
 * Resolves a caregiver reference coming off the wire to the canonical identity
 * user id that the whole system keys a caregiver on. The admin directory lists
 * caregivers by their CaregiverProfile id, so an assign request may carry either
 * that profile id or the user id; both must land as the user id, or every reader
 * (care team, mobile family care plan, visits) fails to resolve the caregiver.
 */
export interface CaregiverDirectory {
  /** The caregiver's user id, whether given a user id or a profile id; null if neither exists. */
  resolveToUserId(id: string): Promise<string | null>;
}
