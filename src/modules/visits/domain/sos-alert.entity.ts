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
  dispatchedAt: Date | null;
  cancelledAt: Date | null;
  acknowledgedAt: Date | null;
  acknowledgedByAdminId: string | null;
  assignedTo: string | null;
  resolvedAt: Date | null;
  resolvedByAdminId: string | null;
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
      dispatchedAt: null,
      cancelledAt: null,
      acknowledgedAt: null,
      acknowledgedByAdminId: null,
      assignedTo: null,
      resolvedAt: null,
      resolvedByAdminId: null,
      createdAt: params.now,
    });
  }

  /** Rehydrate an existing alert from persistence. */
  public static rehydrate(id: string, props: SosAlertProps): SosAlert {
    return new SosAlert(id, props);
  }

  /** Cancel an alert raised in error. A no-op once the alert is terminal. */
  public cancel(now: Date): void {
    if (this.props.status !== SosAlertStatus.Active) {
      return;
    }
    this.props.status = SosAlertStatus.Cancelled;
    this.props.cancelledAt = now;
  }

  /**
   * Record that an emergency response has been dispatched from the admin Live
   * Monitoring screen. The alert stays active (help is on the way, not resolved);
   * dispatching an already dispatched or cancelled alert is a no-op.
   */
  public dispatch(now: Date): void {
    if (this.props.status !== SosAlertStatus.Active || this.props.dispatchedAt !== null) {
      return;
    }
    this.props.dispatchedAt = now;
  }

  /**
   * Admin acknowledges the emergency and assigns the response to a responder (for
   * example a regional supervisor). Acknowledging also dispatches it if active, so
   * the Live Monitoring and Alerts screens agree. A cancelled alert cannot be
   * acknowledged.
   */
  public acknowledgeAndAssign(adminId: string, assignedTo: string | null, now: Date): void {
    if (this.props.status === SosAlertStatus.Cancelled) {
      throw new ValidationException('A cancelled alert cannot be acknowledged');
    }
    if (this.props.acknowledgedAt === null) {
      this.props.acknowledgedAt = now;
    }
    this.props.acknowledgedByAdminId = adminId;
    this.props.assignedTo = assignedTo === null ? null : assignedTo.trim().slice(0, 200) || null;
    this.dispatch(now);
  }

  /**
   * The office resolves (closes out) the emergency. Distinct from a caregiver
   * cancellation: a resolution is an outcome, a cancellation is a false alarm. A
   * cancelled alert cannot be resolved; resolving twice keeps the first resolver.
   */
  public resolve(adminId: string, now: Date): void {
    if (this.props.status === SosAlertStatus.Cancelled) {
      throw new ValidationException('A cancelled alert cannot be resolved');
    }
    if (this.props.status === SosAlertStatus.Resolved) {
      return;
    }
    this.props.status = SosAlertStatus.Resolved;
    this.props.resolvedByAdminId = adminId;
    this.props.resolvedAt = now;
  }

  public get dispatchedAt(): Date | null {
    return this.props.dispatchedAt;
  }

  public get resolvedAt(): Date | null {
    return this.props.resolvedAt;
  }

  public get resolvedByAdminId(): string | null {
    return this.props.resolvedByAdminId;
  }

  public get acknowledgedAt(): Date | null {
    return this.props.acknowledgedAt;
  }

  public get acknowledgedByAdminId(): string | null {
    return this.props.acknowledgedByAdminId;
  }

  public get assignedTo(): string | null {
    return this.props.assignedTo;
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
