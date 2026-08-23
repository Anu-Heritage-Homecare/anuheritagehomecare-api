import { Coordinates } from '@shared/domain/coordinates.vo';
import { ValidationException } from '@shared/domain/domain-exception';
import { Entity } from '@shared/domain/entity.base';
import { LocationMode } from './location-mode.enum';

interface LocationPingProps {
  caregiverId: string;
  visitId: string | null;
  sosAlertId: string | null;
  position: Coordinates;
  accuracyMeters: number | null;
  mode: LocationMode;
  recordedAt: Date;
  receivedAt: Date;
}

/**
 * A single location breadcrumb reported by a caregiver's device. Append only: it
 * is created, never mutated, and read back later for the admin movement audit.
 * `recordedAt` is the device clock (when the fix was taken); `receivedAt` is the
 * server clock (when it reached us), so a delayed batch keeps an honest ordering.
 */
export class LocationPing extends Entity<string> {
  private readonly props: LocationPingProps;

  private constructor(id: string, props: LocationPingProps) {
    super(id);
    this.props = props;
  }

  public static record(params: {
    id: string;
    caregiverId: string;
    visitId?: string | null;
    sosAlertId?: string | null;
    position: Coordinates;
    accuracyMeters?: number | null;
    mode: LocationMode;
    recordedAt: Date;
    receivedAt: Date;
  }): LocationPing {
    if (Number.isNaN(params.recordedAt.getTime())) {
      throw new ValidationException('The recorded time of a location point is not valid');
    }
    if (
      params.accuracyMeters !== null &&
      params.accuracyMeters !== undefined &&
      (!Number.isFinite(params.accuracyMeters) || params.accuracyMeters < 0)
    ) {
      throw new ValidationException('Accuracy must be a non negative number of metres');
    }

    return new LocationPing(params.id, {
      caregiverId: params.caregiverId,
      visitId: params.visitId ?? null,
      sosAlertId: params.sosAlertId ?? null,
      position: params.position,
      accuracyMeters: params.accuracyMeters ?? null,
      mode: params.mode,
      recordedAt: params.recordedAt,
      receivedAt: params.receivedAt,
    });
  }

  public get caregiverId(): string {
    return this.props.caregiverId;
  }

  public get visitId(): string | null {
    return this.props.visitId;
  }

  public get sosAlertId(): string | null {
    return this.props.sosAlertId;
  }

  public get position(): Coordinates {
    return this.props.position;
  }

  public get accuracyMeters(): number | null {
    return this.props.accuracyMeters;
  }

  public get mode(): LocationMode {
    return this.props.mode;
  }

  public get recordedAt(): Date {
    return this.props.recordedAt;
  }

  public get receivedAt(): Date {
    return this.props.receivedAt;
  }
}
