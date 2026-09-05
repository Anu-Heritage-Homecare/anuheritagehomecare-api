/**
 * How much of a care recipient's information a care circle member may see.
 *
 * LIMITED  — basic care visibility (overview, today's visit, the visit list).
 * VIEW_ONLY — all care information (adds health, care plan and visit detail), read only.
 * FULL     — everything a view only member sees, plus the ability to act (requests, changes).
 *
 * The owner of the record always has FULL access. Ordering is used to test whether
 * a member's granted level satisfies the level an endpoint requires.
 */
export enum CareAccessLevel {
  Limited = 'LIMITED',
  ViewOnly = 'VIEW_ONLY',
  Full = 'FULL',
}

const RANK: Record<CareAccessLevel, number> = {
  [CareAccessLevel.Limited]: 1,
  [CareAccessLevel.ViewOnly]: 2,
  [CareAccessLevel.Full]: 3,
};

/** Whether a granted level meets or exceeds the required one. */
export function accessLevelSatisfies(granted: CareAccessLevel, required: CareAccessLevel): boolean {
  return RANK[granted] >= RANK[required];
}

/** Resolve a raw string to a CareAccessLevel, or undefined when it is not one. */
export function toCareAccessLevel(raw: string): CareAccessLevel | undefined {
  const normalised = raw.trim().toUpperCase();
  return Object.values(CareAccessLevel).find((level) => String(level) === normalised);
}
