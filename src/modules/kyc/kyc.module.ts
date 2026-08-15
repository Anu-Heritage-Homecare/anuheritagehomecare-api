import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { KYC_STATUS_SERVICE } from './application/ports/kyc-status.port';
import { KYC_VERIFIER } from './application/ports/kyc-verifier.port';
import { GetKycStatusUseCase } from './application/use-cases/get-kyc-status.use-case';
import { SubmitKycUseCase } from './application/use-cases/submit-kyc.use-case';
import { KYC_VERIFICATION_REPOSITORY } from './domain/kyc-verification.repository';
import { KycVerificationPrismaRepository } from './infrastructure/persistence/kyc-verification-prisma.repository';
import { RepositoryKycStatusService } from './infrastructure/status/repository-kyc-status.service';
import { CompositeKycVerifier } from './infrastructure/verifier/composite-kyc-verifier';
import { QoreIdKycVerifier } from './infrastructure/verifier/qoreid-kyc-verifier';
import { StripeKycVerifier } from './infrastructure/verifier/stripe-kyc-verifier';
import { KycController } from './presentation/kyc.controller';

/**
 * KYC composition root. The provider agnostic KycVerifier port is bound to a
 * composite over the Stripe and QoreID adapters. KYC_STATUS_SERVICE is exported
 * so the payments context can gate checkout on a verified owner.
 */
@Module({
  imports: [PassportModule],
  controllers: [KycController],
  providers: [
    SubmitKycUseCase,
    GetKycStatusUseCase,
    StripeKycVerifier,
    QoreIdKycVerifier,
    { provide: KYC_VERIFIER, useClass: CompositeKycVerifier },
    { provide: KYC_VERIFICATION_REPOSITORY, useClass: KycVerificationPrismaRepository },
    { provide: KYC_STATUS_SERVICE, useClass: RepositoryKycStatusService },
  ],
  exports: [KYC_STATUS_SERVICE],
})
export class KycModule {}
