/** One mismatched field surfaced in the audit. */
export interface KycMismatchResult {
  field: string;
  provided: string;
  returned: string;
}

/** The owner whose identity was verified. */
export interface KycOwnerResult {
  id: string;
  name: string | null;
}

/** The details the owner claimed, kept for the audit comparison. */
export interface KycClaimedResult {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

/** One row of the KYC audit table. */
export interface KycVerificationRowResult {
  id: string;
  owner: KycOwnerResult;
  country: string;
  provider: string;
  documentType: string | null;
  status: string;
  faceMatch: string | null;
  maskedReference: string | null;
  claimed: KycClaimedResult;
  mismatches: KycMismatchResult[];
  submittedAt: string;
  verifiedAt: string | null;
}

export interface KycAuditListResult {
  total: number;
  page: number;
  pageSize: number;
  rows: KycVerificationRowResult[];
}
