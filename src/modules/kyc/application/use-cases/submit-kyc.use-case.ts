import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { ValidationException } from '@shared/domain/domain-exception';
import { KycDocumentType } from '../../domain/kyc-document-type.enum';
import { kycProviderForCountry } from '../../domain/kyc-provider.enum';
import { KycVerification } from '../../domain/kyc-verification.entity';
import {
  KYC_VERIFICATION_REPOSITORY,
  KycVerificationRepository,
} from '../../domain/kyc-verification.repository';
import { SubmitKycCommand } from '../commands/submit-kyc.command';
import { KycStatusResult, toKycStatusResult } from '../dto/kyc.result';
import { KYC_VERIFIER, KycVerifier } from '../ports/kyc-verifier.port';

/**
 * Use case: submit the family owner's identity for verification. Validates the
 * document against the owner's market, sends it to the provider, and records the
 * outcome. Only a masked remnant (last four) is persisted, never the full number.
 * An already verified owner is returned unchanged without re verifying.
 */
@Injectable()
export class SubmitKycUseCase {
  constructor(
    @Inject(KYC_VERIFICATION_REPOSITORY) private readonly repository: KycVerificationRepository,
    @Inject(KYC_VERIFIER) private readonly verifier: KycVerifier,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: SubmitKycCommand): Promise<KycStatusResult> {
    const documentType = SubmitKycUseCase.toDocumentType(command.documentType);
    SubmitKycUseCase.assertDocumentAllowed(command.country, documentType);

    const fullName = command.fullName.trim();
    if (fullName.length === 0) {
      throw new ValidationException('Full name is required for verification');
    }

    const documentValue = SubmitKycUseCase.extractDocumentValue(command, documentType);
    const provider = kycProviderForCountry(command.country);

    const existing = await this.repository.findByOwner(command.ownerId);
    if (existing !== null && existing.isVerified) {
      return toKycStatusResult(existing);
    }

    const outcome = await this.verifier.verify({
      provider,
      country: command.country,
      documentType,
      fullName,
      documentValue,
    });

    const now = this.clock.now();
    const verification = KycVerification.start({
      id: existing?.id ?? this.ids.generate(),
      ownerId: command.ownerId,
      country: command.country,
      provider,
      documentType,
      maskedReference: documentValue.slice(-4),
      now,
    });
    if (outcome.providerReference !== null) {
      verification.recordProviderReference(outcome.providerReference);
    }
    if (outcome.outcome === 'verified') {
      verification.markVerified(now);
    } else if (outcome.outcome === 'failed') {
      verification.markFailed(now);
    }

    await this.repository.save(verification);
    return toKycStatusResult(verification);
  }

  private static toDocumentType(raw: string): KycDocumentType {
    const normalised = raw.trim().toUpperCase();
    const match = Object.values(KycDocumentType).find((type) => String(type) === normalised);
    if (match === undefined) {
      throw new ValidationException(`Unknown document type: ${raw}`);
    }
    return match;
  }

  private static assertDocumentAllowed(country: string, documentType: KycDocumentType): void {
    const code = country.trim().toUpperCase();
    if (code === 'US' && documentType !== KycDocumentType.SsnLast4) {
      throw new ValidationException('United States verification uses the last four of an SSN');
    }
    if (
      code === 'NG' &&
      documentType !== KycDocumentType.Nin &&
      documentType !== KycDocumentType.Passport
    ) {
      throw new ValidationException('Nigeria verification uses a NIN or an international passport');
    }
  }

  private static extractDocumentValue(
    command: SubmitKycCommand,
    documentType: KycDocumentType,
  ): string {
    if (documentType === KycDocumentType.SsnLast4) {
      const value = (command.ssnLast4 ?? '').trim();
      if (!/^\d{4}$/.test(value)) {
        throw new ValidationException('The SSN last four must be exactly four digits');
      }
      return value;
    }

    const value = (command.idNumber ?? '').trim();
    if (documentType === KycDocumentType.Nin) {
      if (!/^\d{11}$/.test(value)) {
        throw new ValidationException('A NIN must be eleven digits');
      }
      return value;
    }
    if (!/^[A-Za-z0-9]{5,20}$/.test(value)) {
      throw new ValidationException('An international passport number is invalid');
    }
    return value.toUpperCase();
  }
}
