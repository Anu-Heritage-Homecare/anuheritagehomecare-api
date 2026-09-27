import { Inject, Injectable } from '@nestjs/common';
import { CaregiverProfile } from '@modules/caregiver-profile/domain/caregiver-profile.entity';
import {
  CAREGIVER_PROFILE_REPOSITORY,
  CaregiverProfileRepository,
} from '@modules/caregiver-profile/domain/caregiver-profile.repository';
import {
  Certification,
  CredentialDocument,
} from '@modules/certifications/domain/certification.entity';
import { CredentialKind } from '@modules/certifications/domain/credential-kind.enum';
import {
  CERTIFICATION_REPOSITORY,
  CertificationRepository,
} from '@modules/certifications/domain/certification.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

interface CertificationInput {
  name: string;
  kind?: CredentialKind;
  licenseNumber: string | null;
  issuedAt: Date | null;
  expiresAt: Date;
  document?: CredentialDocument;
}

/**
 * Resolve the caregiver's identity user id from the profile id the admin screen
 * works with. Certifications are keyed to the caregiver user, so every write goes
 * through the owning profile first.
 */
async function requireProfile(
  profiles: CaregiverProfileRepository,
  profileId: string,
): Promise<CaregiverProfile> {
  const profile = await profiles.findById(profileId);
  if (profile === null || profile.isArchived) {
    throw new NotFoundDomainException('Caregiver not found');
  }
  return profile;
}

/** Add a certification to a caregiver. */
@Injectable()
export class AddCertificationUseCase {
  constructor(
    @Inject(CAREGIVER_PROFILE_REPOSITORY) private readonly profiles: CaregiverProfileRepository,
    @Inject(CERTIFICATION_REPOSITORY) private readonly certifications: CertificationRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: { profileId: string } & CertificationInput): Promise<{ id: string }> {
    const profile = await requireProfile(this.profiles, command.profileId);
    const certification = Certification.record({
      id: this.ids.generate(),
      caregiverId: profile.userId,
      name: command.name,
      kind: command.kind,
      licenseNumber: command.licenseNumber,
      issuedAt: command.issuedAt,
      expiresAt: command.expiresAt,
      document: command.document,
      now: this.clock.now(),
    });
    await this.certifications.save(certification);
    return { id: certification.id };
  }
}

/** Edit an existing certification of a caregiver. */
@Injectable()
export class EditCertificationUseCase {
  constructor(
    @Inject(CAREGIVER_PROFILE_REPOSITORY) private readonly profiles: CaregiverProfileRepository,
    @Inject(CERTIFICATION_REPOSITORY) private readonly certifications: CertificationRepository,
  ) {}

  async execute(
    command: { profileId: string; certificationId: string } & CertificationInput,
  ): Promise<void> {
    const profile = await requireProfile(this.profiles, command.profileId);
    const certification = await this.certifications.findById(command.certificationId);
    if (certification === null || certification.caregiverId !== profile.userId) {
      throw new NotFoundDomainException('Certification not found');
    }
    certification.revise({
      name: command.name,
      kind: command.kind,
      licenseNumber: command.licenseNumber,
      issuedAt: command.issuedAt,
      expiresAt: command.expiresAt,
      document: command.document,
    });
    await this.certifications.save(certification);
  }
}

/** Remove a certification from a caregiver. */
@Injectable()
export class RemoveCertificationUseCase {
  constructor(
    @Inject(CAREGIVER_PROFILE_REPOSITORY) private readonly profiles: CaregiverProfileRepository,
    @Inject(CERTIFICATION_REPOSITORY) private readonly certifications: CertificationRepository,
  ) {}

  async execute(command: { profileId: string; certificationId: string }): Promise<void> {
    const profile = await requireProfile(this.profiles, command.profileId);
    const certification = await this.certifications.findById(command.certificationId);
    if (certification === null || certification.caregiverId !== profile.userId) {
      throw new NotFoundDomainException('Certification not found');
    }
    await this.certifications.delete(command.certificationId);
  }
}
