import { KycVerification } from './kyc-verification.entity';

/** Persistence port for the KYC verification aggregate (one per owner). */
export interface KycVerificationRepository {
  save(verification: KycVerification): Promise<void>;
  findByOwner(ownerId: string): Promise<KycVerification | null>;
}

export const KYC_VERIFICATION_REPOSITORY = Symbol('KYC_VERIFICATION_REPOSITORY');
