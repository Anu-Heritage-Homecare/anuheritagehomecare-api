import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import {
  OwnerContact,
  OwnerContactDirectory,
} from '../../application/ports/owner-contact-directory.port';

/**
 * Adapter satisfying the visits OwnerContactDirectory port from the identity
 * context. The emergency contact is the family owner who set up the recipient's
 * care, so this reads their account's name and phone. If a distinct emergency
 * contact is captured later, only this adapter changes.
 */
@Injectable()
export class IdentityOwnerContactDirectory implements OwnerContactDirectory {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async findContact(ownerId: string): Promise<OwnerContact | null> {
    const owner = await this.users.findById(ownerId);
    if (owner === null) {
      return null;
    }
    return {
      name: `${owner.name.firstName} ${owner.name.lastName}`,
      phone: owner.phone.value,
    };
  }
}
