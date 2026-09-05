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
    return user === null ? null : IdentityProfileUserDirectory.toView(user);
  }

  async findByIds(userIds: string[]): Promise<ProfileUser[]> {
    if (userIds.length === 0) {
      return [];
    }
    const users = await this.users.findByIds(userIds);
    return users.map((user) => IdentityProfileUserDirectory.toView(user));
  }

  private static toView(user: {
    id: string;
    name: { firstName: string; lastName: string };
    email: { value: string };
    userType: unknown;
    isFamilyOwner: boolean;
    photoKey: string | null;
  }): ProfileUser {
    return {
      id: user.id,
      firstName: user.name.firstName,
      lastName: user.name.lastName,
      email: user.email.value,
      userType: String(user.userType),
      isFamilyOwner: user.isFamilyOwner,
      photoKey: user.photoKey,
    };
  }
}
