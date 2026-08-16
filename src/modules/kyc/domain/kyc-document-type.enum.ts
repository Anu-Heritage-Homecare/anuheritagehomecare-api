/**
 * The photo identity document verified against. Both markets use a document plus
 * a selfie: Nigeria owners verify a NIN, driver's licence or international
 * passport through QoreID; United States owners present a driver's licence or
 * passport through Stripe Identity, which detects the type. The SSN is no longer
 * used, since a number carries no photo to match a face against.
 */
export enum KycDocumentType {
  Nin = 'NIN',
  DriversLicense = 'DRIVERS_LICENSE',
  Passport = 'PASSPORT',
}
