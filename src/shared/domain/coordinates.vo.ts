import { ValidationException } from './domain-exception';
import { ValueObject } from './value-object.base';

interface CoordinatesProps {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * A geographic point (latitude and longitude in decimal degrees). A shared
 * kernel value object because several contexts reason about location: the care
 * recipient's pinned address, a caregiver's live position, and the arrival
 * geofence check. Distances use the haversine formula, which is accurate enough
 * at the scale of a geofence.
 */
export class Coordinates extends ValueObject<CoordinatesProps> {
  private constructor(props: CoordinatesProps) {
    super(props);
  }

  public static create(latitude: number, longitude: number): Coordinates {
    if (typeof latitude !== 'number' || !Number.isFinite(latitude)) {
      throw new ValidationException('Latitude must be a number');
    }
    if (typeof longitude !== 'number' || !Number.isFinite(longitude)) {
      throw new ValidationException('Longitude must be a number');
    }
    if (latitude < -90 || latitude > 90) {
      throw new ValidationException('Latitude must be between -90 and 90');
    }
    if (longitude < -180 || longitude > 180) {
      throw new ValidationException('Longitude must be between -180 and 180');
    }
    return new Coordinates({ latitude, longitude });
  }

  /** Great circle distance to another point, in metres. */
  public distanceToMeters(other: Coordinates): number {
    const dLat = toRadians(other.latitude - this.latitude);
    const dLon = toRadians(other.longitude - this.longitude);
    const lat1 = toRadians(this.latitude);
    const lat2 = toRadians(other.latitude);

    const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_METERS * c;
  }

  /** Whether another point lies within the given radius (metres) of this one. */
  public isWithinMeters(other: Coordinates, radiusMeters: number): boolean {
    return this.distanceToMeters(other) <= radiusMeters;
  }

  public get latitude(): number {
    return this.props.latitude;
  }

  public get longitude(): number {
    return this.props.longitude;
  }
}
