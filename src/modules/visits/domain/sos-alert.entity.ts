import { Coordinates } from '@shared/domain/coordinates.vo';
import { ValidationException } from '@shared/domain/domain-exception';
import { Entity } from '@shared/domain/entity.base';
import { SosAlertStatus } from './sos-alert-status.enum';

/** Snapshot of the care recipient captured on the alert, for the responder. */
export interface SosRecipientSnapshot {
  careRecipientId: string;
  name: string | null;
  address: string | null;
  location: Coordinates | null;
}

interface SosAlertProps {
  caregiverId: string;
  visitId: string;
  position: Coordinates | null;
  recipient: SosRecipientSnapshot;
  status: SosAlertStatus;
  cancelledAt: Date | null;
  createdAt: Date;
}

/**
 * An emergency alert a caregiver raises from an active shift (the SOS button). It
 * captures the caregiver's current position and a snapshot of the care recipient
 * so a responder can act without a live join. It can be cancelled by the caregiver
 * who raised it, which keeps the record for the audit rather than deleting it. The
 * position, recipient name and address are sensitive and must never be logged.
 */
export class SosAlert extends Entity<string> {
  private props: SosAlertProps;

  private constructor(id: string, props: SosAlertProps) {
    super(id);
    this.props = props;
  }

  public static raise(params: {
    id: string;
    caregiverId: string;
    visitId: string;
    position: Coordinates | null;
    recipient: SosRecipientSnapshot;
    now: Date;
  }): SosAlert {
    if (Number.isNaN(params.now.getTime())) {
      throw new ValidationException('The time the alert was raised is not valid');
    }
    return new SosAlert(params.id, {
      caregiverId: params.caregiverId,
      visitId: params.visitId,
      position: params.position,
      recipient: params.recipient,
      status: SosAlertStatus.Active,
      cancelledAt: null,
      createdAt: params.now,
    });
  }

  /** Rehydrate an existing alert from persistence. */
  public static rehydrate(id: string, props: SosAlertProps): SosAlert {
    return new SosAlert(id, props);
  }

  /** Cancel an alert raised in error. Idempotent: cancelling twice is a no-op. */
  public cancel(now: Date): void {
    if (this.props.status === SosAlertStatus.Cancelled) {
      return;
    }
    this.props.status = SosAlertStatus.Cancelled;
    this.props.cancelledAt = now;
  }

  public get caregiverId(): string {
    return this.props.caregiverId;
  }

  public get visitId(): string {
    return this.props.visitId;
  }

  public get position(): Coordinates | null {
    return this.props.position;
  }

  public get recipient(): SosRecipientSnapshot {
    return this.props.recipient;
  }

  public get status(): SosAlertStatus {
    return this.props.status;
  }

  public get cancelledAt(): Date | null {
    return this.props.cancelledAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
