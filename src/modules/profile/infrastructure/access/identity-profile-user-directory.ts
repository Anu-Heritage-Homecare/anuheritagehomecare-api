import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import {
  ProfileUser,
  ProfileUserDirectory,
} from '../../application/ports/profile-directories.port';

/** Adapts the identity context to the profile user port. */
@Injectable()
export class IdentityProfileUserDirectory implements ProfileUserDirectory {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async findById(userId: string): Promise<ProfileUser | null> {
    const user = await this.users.findById(userId);
    if (user === null) {
      return null;
    }
    return {
      firstName: user.name.firstName,
      lastName: user.name.lastName,
      userType: String(user.userType),
      isFamilyOwner: user.isFamilyOwner,
      photoKey: user.photoKey,
    };
  }
}
