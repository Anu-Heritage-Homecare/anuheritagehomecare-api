import { FaceMatchOutcome } from '../../domain/face-match-outcome.enum';
import { KycVerification } from '../../domain/kyc-verification.entity';
import { KycDocumentType } from '../../domain/kyc-document-type.enum';
import { KycStatus } from '../../domain/kyc-status.enum';

/**
 * Projection of an owner's KYC state. `status` is null when never started. Only
 * the names of the fields that did not match are exposed (never the provider's
 * returned values, which are kept server side for the admin audit). `clientSecret`
 * is set only when submitting starts an asynchronous provider session.
 */
export interface KycStatusResult {
  started: boolean;
  status: KycStatus | null;
  documentType: KycDocumentType | null;
  maskedReference: string | null;
  faceMatch: FaceMatchOutcome | null;
  mismatchedFields: string[];
  clientSecret: string | null;
  verifiedAt: string | null;
}

export function toKycStatusResult(
  verification: KycVerification | null,
  clientSecret: string | null = null,
): KycStatusResult {
  if (verification === null) {
    return {
      started: false,
      status: null,
      documentType: null,
      maskedReference: null,
      faceMatch: null,
      mismatchedFields: [],
      clientSecret,
      verifiedAt: null,
    };
  }
  return {
    started: true,
    status: verification.status,
    documentType: verification.documentType,
    maskedReference: verification.maskedReference,
    faceMatch: verification.faceMatch,
    mismatchedFields: verification.mismatches.map((mismatch) => mismatch.field),
    clientSecret,
    verifiedAt: verification.verifiedAt === null ? null : verification.verifiedAt.toISOString(),
  };
}
