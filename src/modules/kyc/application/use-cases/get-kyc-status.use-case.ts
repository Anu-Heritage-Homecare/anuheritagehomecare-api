import { Inject, Injectable } from '@nestjs/common';
import {
  KYC_VERIFICATION_REPOSITORY,
  KycVerificationRepository,
} from '../../domain/kyc-verification.repository';
import { KycStatusResult, toKycStatusResult } from '../dto/kyc.result';

/** Use case: read the family owner's current KYC state. */
@Injectable()
export class GetKycStatusUseCase {
  constructor(
    @Inject(KYC_VERIFICATION_REPOSITORY) private readonly repository: KycVerificationRepository,
  ) {}

  async execute(params: { ownerId: string }): Promise<KycStatusResult> {
    const verification = await this.repository.findByOwner(params.ownerId);
    return toKycStatusResult(verification);
  }
}
