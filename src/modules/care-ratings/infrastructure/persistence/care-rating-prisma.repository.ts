import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CareRating } from '../../domain/care-rating.entity';
import { CareRatingRepository, RatingSummary } from '../../domain/care-rating.repository';
import { CareRatingMapper } from './care-rating.mapper';

/** Prisma backed adapter for the CareRatingRepository port. */
@Injectable()
export class CareRatingPrismaRepository implements CareRatingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(rating: CareRating): Promise<void> {
    const row = CareRatingMapper.toPersistence(rating);
    await this.prisma.careRating.upsert({ where: { id: row.id }, create: row, update: {} });
  }

  async summarise(since: Date | null): Promise<RatingSummary> {
    const where: Prisma.CareRatingWhereInput = since === null ? {} : { createdAt: { gte: since } };
    const result = await this.prisma.careRating.aggregate({
      where,
      _avg: { score: true },
      _count: { _all: true },
    });
    return { average: result._avg.score ?? null, count: result._count._all };
  }
}
