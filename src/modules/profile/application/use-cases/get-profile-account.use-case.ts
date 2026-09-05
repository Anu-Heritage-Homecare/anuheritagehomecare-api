import { Inject, Injectable } from '@nestjs/common';
import { PHOTO_STORAGE, PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  PROFILE_PLAN_DIRECTORY,
  PROFILE_USER_DIRECTORY,
  ProfilePlanDirectory,
  ProfileUser,
  ProfileUserDirectory,
} from '../ports/profile-directories.port';

export interface GetProfileAccountQuery {
  userId: string;
}

export interface ProfileAccountResult {
  name: string;
  role: string;
  planName: string | null;
  photoUrl: string | null;
}

/**
 * Use case: the profile account card. It composes the user's name, a role label
 * and avatar (identity) with the badge for their active plan (bookings and the
 * catalog). Read only and scoped to the authenticated user.
 */
@Injectable()
export class GetProfileAccountUseCase {
  constructor(
    @Inject(PROFILE_USER_DIRECTORY) private readonly users: ProfileUserDirectory,
    @Inject(PROFILE_PLAN_DIRECTORY) private readonly plans: ProfilePlanDirectory,
    @Inject(PHOTO_STORAGE) private readonly photos: PhotoStorage,
  ) {}

  async execute(query: GetProfileAccountQuery): Promise<ProfileAccountResult> {
    const user = await this.users.findById(query.userId);
    if (user === null) {
      throw new NotFoundDomainException('Profile not found');
    }

    const planName = await this.plans.activePlanNameForOwner(query.userId);
    const photoUrl = GetProfileAccountUseCase.photoUrl(user, this.photos);

    return {
      name: `${user.firstName} ${user.lastName}`.trim(),
      role: GetProfileAccountUseCase.role(user),
      planName,
      photoUrl,
    };
  }

  private static role(user: ProfileUser): string {
    if (user.isFamilyOwner) {
      return 'Primary Family Member';
    }
    if (user.userType === 'CAREGIVER') {
      return 'Caregiver';
    }
    return 'Family Member';
  }

  private static photoUrl(user: ProfileUser, photos: PhotoStorage): string | null {
    if (user.photoKey === null) {
      return null;
    }
    const url = photos.urlFor(user.photoKey);
    return url.length === 0 ? null : url;
  }
}
