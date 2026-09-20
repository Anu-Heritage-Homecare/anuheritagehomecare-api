/** The account status of a family member in the directory. */
export enum FamilyMemberStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  PendingVerification = 'PENDING_VERIFICATION',
}

export const ALL_FAMILY_MEMBER_STATUSES: FamilyMemberStatus[] = Object.values(FamilyMemberStatus);
