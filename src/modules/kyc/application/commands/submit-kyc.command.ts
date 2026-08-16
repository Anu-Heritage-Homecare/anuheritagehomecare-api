/**
 * Command to submit the family owner's identity for verification. `ownerId` and
 * `country` come from the authenticated principal. The name and date of birth are
 * the claimed details compared against the provider record. Nigeria (QoreID)
 * additionally sends a document type, number and live selfie; the United States
 * (Stripe Identity) collects the document and selfie through the provider SDK, so
 * those are absent and the result carries a client secret instead.
 */
export interface SubmitKycCommand {
  ownerId: string;
  country: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  documentType?: string;
  idNumber?: string;
  faceImageBase64?: string;
}
