/**
 * Command to submit the family owner's identity documents for verification.
 * `ownerId` and `country` come from the authenticated principal. Exactly one of
 * the document values is expected, matching the country and document type.
 */
export interface SubmitKycCommand {
  ownerId: string;
  country: string;
  fullName: string;
  documentType: string;
  ssnLast4?: string;
  idNumber?: string;
}
