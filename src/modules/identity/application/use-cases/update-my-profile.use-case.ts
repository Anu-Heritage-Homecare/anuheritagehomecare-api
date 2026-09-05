import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { PHOTO_STORAGE, PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { UnauthorizedDomainException, ValidationException } from '@shared/domain/domain-exception';
import { PersonName } from '../../domain/value-objects/person-name.vo';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';
import { PostalAddress } from '../../domain/value-objects/postal-address.vo';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { UpdateMyProfileCommand } from '../commands/update-my-profile.command';
import { UserProfileResult, toUserProfile } from '../dto/user-profile.result';
import { resolvePhotoUrl } from '../resolve-photo-url.util';

/**
 * Use case: update the authenticated user's editable personal information (name,
 * phone and postal address). The email is the login identity and is not changed
 * here. Scoped to the caller from their access token.
 */
@Injectable()
export class UpdateMyProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PHOTO_STORAGE) private readonly photos: PhotoStorage,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateMyProfileCommand): Promise<UserProfileResult> {
    const user = await this.users.findById(command.userId);
    if (user === null) {
      throw new UnauthorizedDomainException();
    }

    const name = PersonName.create(command.firstName, command.lastName);
    const phone = PhoneNumber.create(command.phone);
    const address = PostalAddress.create({
      line1: command.addressLine1,
      line2: command.addressLine2,
      city: command.city,
      state: command.state,
      postalCode: command.postalCode,
      country: command.country,
    });

    user.updateProfile({
      name,
      phone,
      address,
      dateOfBirth: UpdateMyProfileUseCase.toDate(command.dateOfBirth),
      relationshipToRecipient: command.relationshipToRecipient ?? null,
      now: this.clock.now(),
    });
    await this.users.save(user);

    return { ...toUserProfile(user), photoUrl: resolvePhotoUrl(this.photos, user.photoKey) };
  }

  private static toDate(value: string | null | undefined): Date | null {
    if (value === null || value === undefined || value.length === 0) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new ValidationException('Date of birth is not a valid date');
    }
    return date;
  }
}
