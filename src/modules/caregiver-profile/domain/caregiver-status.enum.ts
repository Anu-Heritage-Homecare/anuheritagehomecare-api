/** The employment status of a caregiver. */
export enum CaregiverStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  OnLeave = 'ON_LEAVE',
}

export const ALL_CAREGIVER_STATUSES: CaregiverStatus[] = Object.values(CaregiverStatus);
