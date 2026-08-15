import { KycVerification } from '../../domain/kyc-verification.entity';
import { KycDocumentType } from '../../domain/kyc-document-type.enum';
import { KycStatus } from '../../domain/kyc-status.enum';

/** Projection of an owner's KYC state. `status` is null when never started. */
export interface KycStatusResult {
  started: boolean;
  status: KycStatus | null;
  documentType: KycDocumentType | null;
  maskedReference: string | null;
  verifiedAt: string | null;
}

export function toKycStatusResult(verification: KycVerification | null): KycStatusResult {
  if (verification === null) {
    return {
      started: false,
      status: null,
      documentType: null,
      maskedReference: null,
      verifiedAt: null,
    };
  }
  return {
    started: true,
    status: verification.status,
    documentType: verification.documentType,
    maskedReference: verification.maskedReference,
    verifiedAt: verification.verifiedAt === null ? null : verification.verifiedAt.toISOString(),
  };
}
