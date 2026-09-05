/**
 * Read ports the profile context composes: the authenticated user (identity) and
 * the owner's active plan (bookings and the plan catalog). Each returns a plain
 * view so profile depends only on these abstractions.
 */

export interface ProfileUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  isFamilyOwner: boolean;
  photoKey: string | null;
}

export interface ProfileUserDirectory {
  findById(userId: string): Promise<ProfileUser | null>;
  findByIds(userIds: string[]): Promise<ProfileUser[]>;
}

export const PROFILE_USER_DIRECTORY = Symbol('PROFILE_USER_DIRECTORY');

export interface ProfilePlanDirectory {
  /** The display name of the owner's active plan, or null when none is active. */
  activePlanNameForOwner(ownerId: string): Promise<string | null>;
}

export const PROFILE_PLAN_DIRECTORY = Symbol('PROFILE_PLAN_DIRECTORY');
