import { LocationPing } from './location-ping.entity';

/**
 * Persistence port for location breadcrumbs. Writes arrive in batches, so the
 * port exposes a single bulk insert; there is no update (points are immutable).
 */
export interface LocationPingRepository {
  saveMany(pings: LocationPing[]): Promise<void>;
}

export const LOCATION_PING_REPOSITORY = Symbol('LOCATION_PING_REPOSITORY');
