import { Inject, Injectable } from '@nestjs/common';
import { KycStatusService } from '../../application/ports/kyc-status.port';
import {
  KYC_VERIFICATION_REPOSITORY,
  KycVerificationRepository,
} from '../../domain/kyc-verification.repository';

/**
 * Adapter for the KycStatusService port, exported so other contexts (payments)
 * can gate on verification without touching the KYC domain.
 */
@Injectable()
export class RepositoryKycStatusService implements KycStatusService {
  constructor(
    @Inject(KYC_VERIFICATION_REPOSITORY) private readonly repository: KycVerificationRepository,
  ) {}

  async isVerified(ownerId: string): Promise<boolean> {
    const verification = await this.repository.findByOwner(ownerId);
    return verification?.isVerified ?? false;
  }
}
