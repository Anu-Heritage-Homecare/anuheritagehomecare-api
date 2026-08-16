import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { ValidationException } from '@shared/domain/domain-exception';
import { FaceMatchOutcome } from '../../domain/face-match-outcome.enum';
import { ClaimedIdentity, compareIdentity } from '../../domain/identity-matcher';
import { KycDocumentType } from '../../domain/kyc-document-type.enum';
import { KycProvider, kycProviderForCountry } from '../../domain/kyc-provider.enum';
import { KycVerification } from '../../domain/kyc-verification.entity';
import {
  KYC_VERIFICATION_REPOSITORY,
  KycVerificationRepository,
} from '../../domain/kyc-verification.repository';
import { SubmitKycCommand } from '../commands/submit-kyc.command';
import { KycStatusResult, toKycStatusResult } from '../dto/kyc.result';
import { KYC_VERIFIER, KycVerifier } from '../ports/kyc-verifier.port';

/**
 * Use case: submit the family owner's identity for verification.
 *
 * Nigeria (QoreID) is synchronous: the owner sends a document number and a live
 * selfie, QoreID returns the record and a face result, and this use case compares
 * the claimed name and date of birth against the record. If everything matches
 * the owner is verified; if the person is real but a detail or the face does not
 * match, the owner is rejected and the differences are stored for the admin audit.
 *
 * The United States (Stripe Identity) is asynchronous: this opens a document plus
 * selfie session and returns a client secret for the frontend SDK. The comparison
 * and decision happen when the signed webhook arrives.
 *
 * The full document number and the selfie are never stored; only a masked remnant
 * and the outcome. An already verified owner is returned unchanged.
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
    const claimed = SubmitKycUseCase.toClaimedIdentity(command);
    const provider = kycProviderForCountry(command.country);

    const existing = await this.repository.findByOwner(command.ownerId);
    if (existing !== null && existing.isVerified) {
      return toKycStatusResult(existing);
    }

    const now = this.clock.now();
    const id = existing?.id ?? this.ids.generate();

    return provider === KycProvider.QoreId
      ? this.verifyWithQoreId(command, claimed, id, now)
      : this.startStripeSession(command, claimed, id, now);
  }

  /** Nigeria: verify synchronously and decide the outcome now. */
  private async verifyWithQoreId(
    command: SubmitKycCommand,
    claimed: ClaimedIdentity,
    id: string,
    now: Date,
  ): Promise<KycStatusResult> {
    const documentType = SubmitKycUseCase.toDocumentType(command.documentType);
    const idNumber = SubmitKycUseCase.validateIdNumber(command.idNumber, documentType);
    const faceImage = (command.faceImageBase64 ?? '').trim();
    if (faceImage.length === 0) {
      throw new ValidationException('A live photo is required for verification');
    }

    const outcome = await this.verifier.verify({
      provider: KycProvider.QoreId,
      country: command.country,
      claimed,
      documentType,
      idNumber,
      faceImageBase64: faceImage,
    });

    const verification = KycVerification.start({
      id,
      ownerId: command.ownerId,
      country: command.country,
      provider: KycProvider.QoreId,
      documentType,
      claimed,
      now,
    });
    if (outcome.providerReference !== null) {
      verification.recordProviderReference(outcome.providerReference);
    }
    verification.recordVerifiedDocument(
      documentType,
      outcome.maskedReference ?? idNumber.slice(-4),
    );

    if (outcome.state === 'not_found') {
      verification.markFailed(now);
    } else {
      const mismatches = compareIdentity(claimed, outcome.identity ?? {});
      const faceMatch = outcome.faceMatch ?? FaceMatchOutcome.NotAvailable;
      if (mismatches.length === 0 && faceMatch === FaceMatchOutcome.Match) {
        verification.markVerified(now, faceMatch);
      } else {
        verification.markRejected(now, mismatches, faceMatch);
      }
    }

    await this.repository.save(verification);
    return toKycStatusResult(verification);
  }

  /** United States: open a Stripe Identity session; the webhook decides later. */
  private async startStripeSession(
    command: SubmitKycCommand,
    claimed: ClaimedIdentity,
    id: string,
    now: Date,
  ): Promise<KycStatusResult> {
    const outcome = await this.verifier.verify({
      provider: KycProvider.Stripe,
      country: command.country,
      claimed,
    });

    const verification = KycVerification.start({
      id,
      ownerId: command.ownerId,
      country: command.country,
      provider: KycProvider.Stripe,
      documentType: null,
      claimed,
      now,
    });
    if (outcome.providerReference !== null) {
      verification.recordProviderReference(outcome.providerReference);
    }

    await this.repository.save(verification);
    return toKycStatusResult(verification, outcome.clientSecret ?? null);
  }

  private static toClaimedIdentity(command: SubmitKycCommand): ClaimedIdentity {
    const firstName = command.firstName.trim();
    const lastName = command.lastName.trim();
    if (firstName.length === 0 || lastName.length === 0) {
      throw new ValidationException('First and last name are required for verification');
    }
    const dateOfBirth = new Date(command.dateOfBirth);
    if (Number.isNaN(dateOfBirth.getTime())) {
      throw new ValidationException('A valid date of birth is required for verification');
    }
    return { firstName, lastName, dateOfBirth };
  }

  private static toDocumentType(raw: string | undefined): KycDocumentType {
    const normalised = (raw ?? '').trim().toUpperCase();
    const match = Object.values(KycDocumentType).find((type) => String(type) === normalised);
    if (match === undefined) {
      throw new ValidationException(
        'A document type is required (NIN, driver licence or passport)',
      );
    }
    return match;
  }

  private static validateIdNumber(raw: string | undefined, documentType: KycDocumentType): string {
    const value = (raw ?? '').trim();
    if (documentType === KycDocumentType.Nin) {
      if (!/^\d{11}$/.test(value)) {
        throw new ValidationException('A NIN must be eleven digits');
      }
      return value;
    }
    if (!/^[A-Za-z0-9]{5,20}$/.test(value)) {
      throw new ValidationException('The document number is invalid');
    }
    return value.toUpperCase();
  }
}
