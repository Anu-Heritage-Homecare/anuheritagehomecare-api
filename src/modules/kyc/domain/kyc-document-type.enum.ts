/**
 * The document a market verifies against. US owners verify the last four of an
 * SSN; Nigeria owners verify a NIN or an international passport.
 */
export enum KycDocumentType {
  SsnLast4 = 'SSN_LAST4',
  Nin = 'NIN',
  Passport = 'PASSPORT',
}
