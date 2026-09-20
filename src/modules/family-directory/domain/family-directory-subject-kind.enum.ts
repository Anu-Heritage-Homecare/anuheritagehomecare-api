/**
 * Whether a directory entry is backed by an app user account or is a contact only
 * record (a family member who is not an app user). Hybrid: the row composes live
 * user data for an account, and uses the captured snapshot for a contact.
 */
export enum FamilyDirectorySubjectKind {
  Account = 'ACCOUNT',
  Contact = 'CONTACT',
}
