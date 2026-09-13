/**
 * The portal access level granted to a family contact, governing which clinical
 * sections they may see. Drives the access badge on each card and the Care Portal
 * Permissions Matrix.
 */
export enum FamilyAccessLevel {
  FullAccess = 'FULL_ACCESS',
  ViewOnly = 'VIEW_ONLY',
  Limited = 'LIMITED',
}

/** Every valid access level, used to validate incoming values at the boundary. */
export const ALL_FAMILY_ACCESS_LEVELS: readonly FamilyAccessLevel[] =
  Object.values(FamilyAccessLevel);
