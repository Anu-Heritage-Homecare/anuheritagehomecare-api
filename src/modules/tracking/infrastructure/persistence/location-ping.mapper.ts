import {
  LocationPing as PrismaLocationPing,
  LocationMode as PrismaLocationMode,
} from '@prisma/client';
import { LocationMode } from '../../domain/location-mode.enum';
import { LocationPing } from '../../domain/location-ping.entity';

/**
 * Translates a LocationPing entity into its Prisma row. Points are write only in
 * this feature (the admin read model comes later), so only the persistence
 * direction is needed here.
 */
export class LocationPingMapper {
  static toPersistence(ping: LocationPing): PrismaLocationPing {
    return {
      id: ping.id,
      caregiverId: ping.caregiverId,
      visitId: ping.visitId,
      sosAlertId: ping.sosAlertId,
      latitude: ping.position.latitude,
      longitude: ping.position.longitude,
      accuracyMeters: ping.accuracyMeters,
      mode: LocationPingMapper.TO_PERSISTENCE_MODE[ping.mode],
      recordedAt: ping.recordedAt,
      receivedAt: ping.receivedAt,
    };
  }

  private static readonly TO_PERSISTENCE_MODE: Record<LocationMode, PrismaLocationMode> = {
    [LocationMode.Navigation]: 'NAVIGATION',
    [LocationMode.Background]: 'BACKGROUND',
    [LocationMode.Emergency]: 'EMERGENCY',
  };
}
