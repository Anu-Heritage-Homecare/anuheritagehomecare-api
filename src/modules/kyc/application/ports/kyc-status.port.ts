/**
 * Read port other contexts use to check whether an owner has passed KYC, without
 * depending on the KYC domain. The adapter lives in KYC infrastructure and is
 * exported by the KYC module.
 */
export interface KycStatusService {
  isVerified(ownerId: string): Promise<boolean>;
}

export const KYC_STATUS_SERVICE = Symbol('KYC_STATUS_SERVICE');
