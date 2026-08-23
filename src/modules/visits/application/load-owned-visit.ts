import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { Visit } from '../domain/visit.entity';
import { VisitRepository } from '../domain/visit.repository';

/**
 * Load a visit and assert it belongs to the given caregiver. A visit that does
 * not exist or belongs to another caregiver is reported as not found, so an
 * endpoint never discloses another caregiver's visits.
 */
export async function loadOwnedVisit(
  visits: VisitRepository,
  visitId: string,
  caregiverId: string,
): Promise<Visit> {
  const visit = await visits.findById(visitId);
  if (visit === null || visit.caregiverId !== caregiverId) {
    throw new NotFoundDomainException('Visit not found');
  }
  return visit;
}
