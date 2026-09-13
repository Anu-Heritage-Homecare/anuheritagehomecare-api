/**
 * A caregiver's role on a care recipient's team. PRIMARY is the day to day
 * caregiver, BACKUP covers when the primary is unavailable, and COORDINATOR
 * oversees the care plan. Office set on the admin Caregivers screen.
 */
export enum CareTeamRole {
  Primary = 'PRIMARY',
  Backup = 'BACKUP',
  Coordinator = 'COORDINATOR',
}

/** Every valid role, used to validate incoming values at the boundary. */
export const ALL_CARE_TEAM_ROLES: readonly CareTeamRole[] = Object.values(CareTeamRole);
