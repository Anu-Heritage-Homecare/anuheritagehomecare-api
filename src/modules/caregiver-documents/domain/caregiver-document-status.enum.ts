/** The status shown against an employment document on the Documents tab. */
export enum CaregiverDocumentStatus {
  Active = 'ACTIVE',
  Current = 'CURRENT',
  Verified = 'VERIFIED',
  Signed = 'SIGNED',
  Expired = 'EXPIRED',
  Archived = 'ARCHIVED',
}

export const ALL_CAREGIVER_DOCUMENT_STATUSES: CaregiverDocumentStatus[] =
  Object.values(CaregiverDocumentStatus);
