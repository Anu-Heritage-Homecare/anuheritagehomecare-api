export interface FamilySummaryContactResult {
  name: string | null;
  relationship: string | null;
}

export interface FamilySummaryResult {
  primaryContact: FamilySummaryContactResult;
  emergencyContact: FamilySummaryContactResult;
  powerOfAttorney: FamilySummaryContactResult;
  totalMembers: number;
}

export interface FamilyContactItemResult {
  id: string;
  name: string;
  relationship: string;
  /** The contact tier badge shown by the name (PRIMARY_CONTACT/SECONDARY_CONTACT), or null. */
  tier: string | null;
  roles: string[];
  roleNote: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  accessLevel: string;
  accessScopeLabel: string | null;
  preferredMethod: string | null;
  lastContactAt: Date | null;
  lastContactType: string | null;
}

export interface CommunicationLogItemResult {
  id: string;
  familyMemberName: string;
  type: string;
  subject: string;
  staffMemberName: string;
  occurredAt: Date;
}

export interface PermissionMatrixRowResult {
  familyMemberName: string;
  accessLevel: string;
  authorizedSectionsLabel: string | null;
  portalLoginEnabled: boolean;
}

export interface RecipientFamilyResult {
  summary: FamilySummaryResult;
  contacts: FamilyContactItemResult[];
  communicationLog: CommunicationLogItemResult[];
  permissionsMatrix: PermissionMatrixRowResult[];
}
