import { CareAccessGuard } from '@modules/profile/application/ports/care-access.port';
import { CareAccessLevel } from '@modules/profile/domain/care-access-level.enum';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

/**
 * Test double for the care access guard with no circle members: the owner has
 * full access to their own data and anyone else is treated as if the recipient
 * does not exist (a 404), matching the real guard's behaviour.
 */
export function fakeCareAccess(): CareAccessGuard {
  return {
    resolveLevel: (caller, owner) =>
      Promise.resolve(caller === owner ? CareAccessLevel.Full : null),
    assertAccess: (caller, owner) =>
      caller === owner
        ? Promise.resolve()
        : Promise.reject(new NotFoundDomainException('Care recipient not found')),
  };
}
