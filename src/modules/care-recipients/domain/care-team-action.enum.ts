/**
 * What happened to a caregiver on a recipient's team, for the assignment history
 * log. A caregiver is ASSIGNED to the team or REMOVED from it.
 */
export enum CareTeamAction {
  Assigned = 'ASSIGNED',
  Removed = 'REMOVED',
}

/** Every valid action, used to validate incoming values at the boundary. */
export const ALL_CARE_TEAM_ACTIONS: readonly CareTeamAction[] = Object.values(CareTeamAction);
