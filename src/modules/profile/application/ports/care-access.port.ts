import { CareAccessLevel } from '../../domain/care-access-level.enum';

/**
 * Authorization port for care information. Resolves what access a caller has to a
 * given owner's care data (the owner has full access; a care circle member has
 * their granted level; anyone else has none) and asserts a required level.
 * Consumed by the care read contexts so access rules live in one place.
 */
export interface CareAccessGuard {
  /** The caller's level for the owner's data, or null when they have no access. */
  resolveLevel(callerUserId: string, ownerId: string): Promise<CareAccessLevel | null>;

  /**
   * Assert the caller may access the owner's care data at the required level.
   * Throws NotFound when the caller has no access at all (so existence is not
   * revealed) and Forbidden when they are in the circle but below the level.
   */
  assertAccess(callerUserId: string, ownerId: string, required: CareAccessLevel): Promise<void>;
}

export const CARE_ACCESS = Symbol('CARE_ACCESS');
