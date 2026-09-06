import { Module } from '@nestjs/common';
import { CARE_RATING_REPOSITORY } from './domain/care-rating.repository';
import { CareRatingPrismaRepository } from './infrastructure/persistence/care-rating-prisma.repository';

/**
 * Care ratings bounded context composition root. A read model for now: the
 * repository is bound and exported so the dashboard can read the average
 * satisfaction. The capture surface (the family rating screen) is built later and
 * will add its own use case and controller here.
 */
@Module({
  providers: [{ provide: CARE_RATING_REPOSITORY, useClass: CareRatingPrismaRepository }],
  exports: [CARE_RATING_REPOSITORY],
})
export class CareRatingsModule {}
