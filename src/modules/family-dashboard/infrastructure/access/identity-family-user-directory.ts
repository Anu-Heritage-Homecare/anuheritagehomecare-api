import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import {
  DashboardUserView,
  FamilyUserDirectory,
} from '../../application/ports/family-dashboard-directories.port';

/**
 * Adapts the identity context to the dashboard's user port. Resolves the owner
 * and any assigned caregivers to their names in a single batched read.
 */
@Injectable()
export class IdentityFamilyUserDirectory implements FamilyUserDirectory {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async findByIds(ids: string[]): Promise<Map<string, DashboardUserView>> {
    const found = await this.users.findByIds(ids);
    return new Map(
      found.map((user) => [
        user.id,
        { id: user.id, firstName: user.name.firstName, lastName: user.name.lastName },
      ]),
    );
  }
}
