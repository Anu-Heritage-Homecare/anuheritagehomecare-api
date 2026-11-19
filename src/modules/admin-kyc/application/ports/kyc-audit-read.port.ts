import { KycStatus as PrismaKycStatus } from '@prisma/client';

/** One field the provider contradicted ([{field, provided, returned}]). */
export interface KycMismatchView {
  field: string;
  provided: string;
  returned: string;
}

/** One row of the KYC audit table, owner name resolved. */
export interface KycVerificationRowView {
  id: string;
  ownerId: string;
  ownerName: string | null;
  country: string;
  provider: string;
  documentType: string | null;
  status: string;
  faceMatch: string | null;
  maskedReference: string | null;
  claimedFirstName: string;
  claimedLastName: string;
  claimedDateOfBirth: Date;
  mismatches: KycMismatchView[];
  createdAt: Date;
  verifiedAt: Date | null;
}

/** A page of KYC audit rows plus the total matching the filter. */
export interface KycAuditPageView {
  total: number;
  rows: KycVerificationRowView[];
}

/**
 * Read model over the KYC verifications table for the admin mismatch audit. Read
 * only; the provider reference and full document number are never selected.
 */
export interface KycAuditReadModel {
  listVerifications(
    status: PrismaKycStatus | null,
    page: number,
    pageSize: number,
  ): Promise<KycAuditPageView>;
}

export const KYC_AUDIT_READ_MODEL = Symbol('KYC_AUDIT_READ_MODEL');
