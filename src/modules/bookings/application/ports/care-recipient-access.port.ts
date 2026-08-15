/**
 * Port the bookings context uses to check a care recipient before booking care
 * for them, without depending on the care recipients domain directly. The
 * adapter lives in infrastructure and delegates to that context's repository.
 */
export interface CareRecipientAccess {
  /**
   * Assert the care recipient exists, belongs to the owner, and has finished
   * onboarding (is active). Throws NotFound when it is missing or owned by
   * someone else, and a validation error when onboarding is incomplete.
   */
  assertBookable(ownerId: string, careRecipientId: string): Promise<void>;
}

export const CARE_RECIPIENT_ACCESS = Symbol('CARE_RECIPIENT_ACCESS');
