import { Inject, Injectable } from '@nestjs/common';
import { VISIT_REPOSITORY, VisitRepository } from '../../domain/visit.repository';
import { VisitReviewResult, toVisitReview } from '../dto/visit-review.result';
import { loadOwnedVisit } from '../load-owned-visit';

export interface GetVisitReviewQuery {
  caregiverId: string;
  visitId: string;
}

/**
 * Use case: the pre completion review of one of the caregiver's own visits. It
 * reports which parts of the record are filled in so the app can render the
 * review checklist before submitting. A visit that does not exist or belongs to
 * another caregiver is reported as not found.
 */
@Injectable()
export class GetVisitReviewUseCase {
  constructor(@Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository) {}

  async execute(query: GetVisitReviewQuery): Promise<VisitReviewResult> {
    const visit = await loadOwnedVisit(this.visits, query.visitId, query.caregiverId);
    return toVisitReview(visit);
  }
}
