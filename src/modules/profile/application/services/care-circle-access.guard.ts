import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenDomainException, NotFoundDomainException } from '@shared/domain/domain-exception';
import { CareAccessLevel, accessLevelSatisfies } from '../../domain/care-access-level.enum';
import { CARE_CIRCLE_REPOSITORY, CareCircleRepository } from '../../domain/care-circle.repository';
import { CareAccessGuard } from '../ports/care-access.port';

/**
 * Care circle backed access guard. The owner always has full access to their own
 * data; a care circle member has the level granted on their membership; anyone
 * else has none.
 */
@Injectable()
export class CareCircleAccessGuard implements CareAccessGuard {
  constructor(@Inject(CARE_CIRCLE_REPOSITORY) private readonly members: CareCircleRepository) {}

  async resolveLevel(callerUserId: string, ownerId: string): Promise<CareAccessLevel | null> {
    if (callerUserId === ownerId) {
      return CareAccessLevel.Full;
    }
    const membership = await this.members.findMembership(ownerId, callerUserId);
    return membership === null ? null : membership.accessLevel;
  }

  async assertAccess(
    callerUserId: string,
    ownerId: string,
    required: CareAccessLevel,
  ): Promise<void> {
    const level = await this.resolveLevel(callerUserId, ownerId);
    if (level === null) {
      // Reveal nothing to a non member: behave as if it does not exist.
      throw new NotFoundDomainException('Care recipient not found');
    }
    if (!accessLevelSatisfies(level, required)) {
      throw new ForbiddenDomainException('You do not have access to this information');
    }
  }
}
