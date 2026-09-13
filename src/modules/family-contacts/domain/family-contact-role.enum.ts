/**
 * A designated role a family contact holds for a care recipient. A contact may hold
 * several. Drives the role badges on the admin Family screen and the summary cards
 * (primary contact, emergency contact, power of attorney).
 */
export enum FamilyContactRole {
  PrimaryContact = 'PRIMARY_CONTACT',
  SecondaryContact = 'SECONDARY_CONTACT',
  EmergencyContact = 'EMERGENCY_CONTACT',
  PowerOfAttorney = 'POWER_OF_ATTORNEY',
  BillingContact = 'BILLING_CONTACT',
  MedicalDecisionBackup = 'MEDICAL_DECISION_BACKUP',
  VisitCompanion = 'VISIT_COMPANION',
}

/** Every valid role, used to validate incoming values at the boundary. */
export const ALL_FAMILY_CONTACT_ROLES: readonly FamilyContactRole[] =
  Object.values(FamilyContactRole);
