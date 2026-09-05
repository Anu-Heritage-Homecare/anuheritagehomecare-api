import { Inject, Injectable } from '@nestjs/common';
import { PHOTO_STORAGE, PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { UnauthorizedDomainException } from '@shared/domain/domain-exception';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { UserProfileResult, toUserProfile } from '../dto/user-profile.result';
import { resolvePhotoUrl } from '../resolve-photo-url.util';

export interface GetMyProfileQuery {
  userId: string;
}

/**
 * Use case: return the personal information of the authenticated user.
 *
 * The caller is identified from their access token, so a user can only ever read
 * their own profile. A token whose user no longer exists is treated as
 * unauthorized rather than not found, so a revoked account cannot probe. The
 * projection never carries the password hash or any secret.
 */
@Injectable()
export class GetMyProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PHOTO_STORAGE) private readonly photos: PhotoStorage,
  ) {}

  async execute(query: GetMyProfileQuery): Promise<UserProfileResult> {
    const user = await this.users.findById(query.userId);
    if (user === null) {
      throw new UnauthorizedDomainException();
    }
    return { ...toUserProfile(user), photoUrl: resolvePhotoUrl(this.photos, user.photoKey) };
  }
}
