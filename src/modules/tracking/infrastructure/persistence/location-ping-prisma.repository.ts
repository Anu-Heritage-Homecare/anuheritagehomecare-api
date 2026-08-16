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

  async saveMany(pings: LocationPing[]): Promise<void> {
    if (pings.length === 0) {
      return;
    }
    await this.prisma.locationPing.createMany({
      data: pings.map((ping) => LocationPingMapper.toPersistence(ping)),
    });
  }
}
