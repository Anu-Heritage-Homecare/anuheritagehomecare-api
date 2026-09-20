import { Inject, Injectable } from '@nestjs/common';
import { CaregiverGender } from '@modules/caregiver-profile/domain/caregiver-gender.enum';
import {
  CAREGIVER_PROFILE_REPOSITORY,
  CaregiverProfileRepository,
} from '@modules/caregiver-profile/domain/caregiver-profile.repository';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { EmailAddress } from '@modules/identity/domain/value-objects/email-address.vo';
import { PersonName } from '@modules/identity/domain/value-objects/person-name.vo';
import { PhoneNumber } from '@modules/identity/domain/value-objects/phone-number.vo';
import { PostalAddress } from '@modules/identity/domain/value-objects/postal-address.vo';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ConflictDomainException, NotFoundDomainException } from '@shared/domain/domain-exception';

export interface EditCaregiverPersonalInfoCommand {
  profileId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  dateOfBirth: Date | null;
  gender: CaregiverGender | null;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
}

/**
 * Edit a caregiver's personal information. Name, phone, postal address, date of
 * birth and email write through to the identity account (the single source of
 * truth, never duplicated), while gender is stored on the admin profile overlay,
 * since the mobile identity does not capture it. The existing address country and
 * second line are preserved; the form only edits the street line, city, state and
 * postal code.
 */
@Injectable()
export class EditCaregiverPersonalInfoUseCase {
  constructor(
    @Inject(CAREGIVER_PROFILE_REPOSITORY) private readonly profiles: CaregiverProfileRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: EditCaregiverPersonalInfoCommand): Promise<void> {
    const profile = await this.profiles.findById(command.profileId);
    if (profile === null || profile.isArchived) {
      throw new NotFoundDomainException('Caregiver not found');
    }
    const user = await this.users.findById(profile.userId);
    if (user === null) {
      throw new NotFoundDomainException('Caregiver account not found');
    }
    const now = this.clock.now();

    user.updateProfile({
      name: PersonName.create(command.firstName, command.lastName),
      phone: PhoneNumber.create(command.phone),
      address: PostalAddress.create({
        line1: command.addressLine1,
        line2: user.address.line2,
        city: command.city,
        state: command.state,
        postalCode: command.postalCode,
        country: String(user.address.country),
      }),
      dateOfBirth: command.dateOfBirth,
      relationshipToRecipient: user.relationshipToRecipient,
      now,
    });

    if (command.email !== null) {
      const email = EmailAddress.create(command.email);
      if (email.value !== user.email.value) {
        if (await this.users.existsByEmail(email.value)) {
          throw new ConflictDomainException('That email is already in use');
        }
        user.changeEmailAddress(email, now);
      }
    }

    profile.setGender(command.gender, now);

    await this.users.save(user);
    await this.profiles.save(profile);
  }
}
