import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { IngestLocationsUseCase } from './application/use-cases/ingest-locations.use-case';
import { LOCATION_PING_REPOSITORY } from './domain/location-ping.repository';
import { LocationPingPrismaRepository } from './infrastructure/persistence/location-ping-prisma.repository';
import { LocationTrackingController } from './presentation/location-tracking.controller';

/**
 * Tracking bounded context composition root. The location ping repository is
 * bound to its Prisma adapter. This context only ingests telemetry; the admin
 * movement audit (path replay, travel time, long stops) is a read model to be
 * added on top of the stored points once the admin module exists.
 */
@Module({
  imports: [PassportModule],
  controllers: [LocationTrackingController],
  providers: [
    IngestLocationsUseCase,
    { provide: LOCATION_PING_REPOSITORY, useClass: LocationPingPrismaRepository },
  ],
})
export class TrackingModule {}
