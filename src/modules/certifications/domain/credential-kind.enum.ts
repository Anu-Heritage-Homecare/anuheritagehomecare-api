/**
 * The kind of caregiver credential. It drives the status label the Documents tab
 * shows while the credential is in date: a licence or certification reads Valid, a
 * background check reads Cleared and a health screening reads Current.
 */
export enum CredentialKind {
  License = 'LICENSE',
  Certification = 'CERTIFICATION',
  BackgroundCheck = 'BACKGROUND_CHECK',
  HealthScreening = 'HEALTH_SCREENING',
  Other = 'OTHER',
}

export const ALL_CREDENTIAL_KINDS: CredentialKind[] = Object.values(CredentialKind);
