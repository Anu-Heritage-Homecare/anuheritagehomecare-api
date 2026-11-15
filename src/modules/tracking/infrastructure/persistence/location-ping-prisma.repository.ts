import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { LocationPing } from '../../domain/location-ping.entity';
import { LocationPingRepository } from '../../domain/location-ping.repository';
import { LocationPingMapper } from './location-ping.mapper';

/**
 * Prisma backed adapter for the LocationPingRepository port. Writes the whole
 * batch in a single insert, which is the hot path for this high volume feature.
 */
@Injectable()
export class LocationPingPrismaRepository implements LocationPingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveMany(pings: LocationPing[]): Promise<number> {
    if (pings.length === 0) {
      return 0;
    }
    // skipDuplicates makes a replayed batch idempotent: a point whose
    // (caregiverId, clientId) is already stored is ignored, never duplicated.
    const { count } = await this.prisma.locationPing.createMany({
      data: pings.map((ping) => LocationPingMapper.toPersistence(ping)),
      skipDuplicates: true,
    });
    return count;
  }
}
