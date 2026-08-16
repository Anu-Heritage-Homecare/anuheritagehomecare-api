import { LocationMode } from '../../domain/location-mode.enum';

/** One reported location point. `recordedAt` is the device clock (ISO string). */
export interface LocationPointInput {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  mode: LocationMode;
  recordedAt: string;
  visitId?: string | null;
}

/**
 * Command to ingest a batch of location points for the authenticated caregiver.
 * `caregiverId` comes from the access token, never from the request body.
 */
export interface IngestLocationsCommand {
  caregiverId: string;
  points: LocationPointInput[];
}
