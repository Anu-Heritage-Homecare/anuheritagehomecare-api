import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { PHOTO_STORAGE, PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { UnauthorizedDomainException } from '@shared/domain/domain-exception';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { UserProfileResult, toUserProfile } from '../dto/user-profile.result';
import { resolvePhotoUrl } from '../resolve-photo-url.util';

export interface AcceptConsentCommand {
  userId: string;
}

/**
 * Use case: record that the authenticated user accepted the consent terms.
 *
 * Idempotent: the aggregate keeps the first acceptance timestamp, so re-accepting
 * does not move it. Returns the updated profile so the client reads back
 * `consentAcceptedAt` and knows acceptance is recorded on any device.
 */
@Injectable()
export class AcceptConsentUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PHOTO_STORAGE) private readonly photos: PhotoStorage,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: AcceptConsentCommand): Promise<UserProfileResult> {
    const user = await this.users.findById(command.userId);
    if (user === null) {
      throw new UnauthorizedDomainException();
    }
    user.acceptConsent(this.clock.now());
    await this.users.save(user);
    return { ...toUserProfile(user), photoUrl: resolvePhotoUrl(this.photos, user.photoKey) };
  }
}
