import { Inject, Injectable } from '@nestjs/common';
import { CaregiverProfile } from '@modules/caregiver-profile/domain/caregiver-profile.entity';
import type { CaregiverProfileFields } from '@modules/caregiver-profile/domain/caregiver-profile.entity';
import {
  CAREGIVER_PROFILE_REPOSITORY,
  CaregiverProfileRepository,
} from '@modules/caregiver-profile/domain/caregiver-profile.repository';
import { AccountRegistrar } from '@modules/identity/application/services/account-registrar.service';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';

export interface ProvisionCaregiverCommand {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  dateOfBirth: Date | null;
  profile: CaregiverProfileFields;
}

export interface ProvisionedCaregiverResult {
  profileId: string;
  userId: string;
  temporaryPassword: string;
}

/**
 * Provision a new caregiver from the admin back office. Creates the identity
 * account out of band (already verified, must change password on first login)
 * and the admin profile overlay keyed to it. The one time temporary password is
 * surfaced so the office can hand it to the caregiver; it is never stored in
 * plaintext. The account creation (uniqueness, hashing, temporary password) lives
 * in the identity {@link AccountRegistrar} so the two signup paths cannot drift.
 */
@Injectable()
export class ProvisionCaregiverUseCase {
  constructor(
    private readonly registrar: AccountRegistrar,
    @Inject(CAREGIVER_PROFILE_REPOSITORY) private readonly profiles: CaregiverProfileRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: ProvisionCaregiverCommand): Promise<ProvisionedCaregiverResult> {
    const { userId, temporaryPassword } = await this.registrar.provisionCaregiver({
      firstName: command.firstName,
      lastName: command.lastName,
      email: command.email,
      phone: command.phone,
      addressLine1: command.addressLine1,
      addressLine2: command.addressLine2,
      city: command.city,
      state: command.state,
      postalCode: command.postalCode,
      country: command.country,
      dateOfBirth: command.dateOfBirth,
    });

    const profile = CaregiverProfile.create({
      id: this.ids.generate(),
      userId,
      fields: command.profile,
      now: this.clock.now(),
    });
    await this.profiles.save(profile);

    return { profileId: profile.id, userId, temporaryPassword };
  }
}
