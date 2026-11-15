import { LocationPing } from './location-ping.entity';

/**
 * Persistence port for location breadcrumbs. Writes arrive in batches, so the
 * port exposes a single bulk insert; there is no update (points are immutable).
 * The insert is idempotent on each point's `(caregiverId, clientId)`, so a
 * replayed batch stores only new points. Returns how many were newly stored.
 */
export interface LocationPingRepository {
  saveMany(pings: LocationPing[]): Promise<number>;
}

export const LOCATION_PING_REPOSITORY = Symbol('LOCATION_PING_REPOSITORY');
