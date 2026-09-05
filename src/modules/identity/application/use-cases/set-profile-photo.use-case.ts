import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { PHOTO_STORAGE, PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { UnauthorizedDomainException } from '@shared/domain/domain-exception';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { UserProfileResult, toUserProfile } from '../dto/user-profile.result';
import { resolvePhotoUrl } from '../resolve-photo-url.util';

export interface SetProfilePhotoCommand {
  userId: string;
  /** The object store key from a completed upload, or null to clear the photo. */
  photoKey: string | null;
}

/**
 * Use case: persist the profile photo key after the client has uploaded the image
 * to the object store, or clear it. Scoped to the caller from their access token.
 */
@Injectable()
export class SetProfilePhotoUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PHOTO_STORAGE) private readonly photos: PhotoStorage,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SetProfilePhotoCommand): Promise<UserProfileResult> {
    const user = await this.users.findById(command.userId);
    if (user === null) {
      throw new UnauthorizedDomainException();
    }

    const key =
      command.photoKey !== null && command.photoKey.trim().length > 0 ? command.photoKey : null;
    user.setPhotoKey(key, this.clock.now());
    await this.users.save(user);

    return { ...toUserProfile(user), photoUrl: resolvePhotoUrl(this.photos, user.photoKey) };
  }
}
