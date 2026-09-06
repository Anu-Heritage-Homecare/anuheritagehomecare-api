import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { AlertSeverity } from './alert-severity.enum';
import { AlertStatus } from './alert-status.enum';
import { AlertType } from './alert-type.enum';

const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_COORDINATOR_LENGTH = 120;

interface OperationalAlertProps {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  /** The coordinator or team responsible for actioning this alert, for display. */
  coordinatorName: string | null;
  status: AlertStatus;
  relatedVisitId: string | null;
  relatedCaregiverId: string | null;
  relatedCareRecipientId: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedByAdminId: string | null;
}

/**
 * OperationalAlert aggregate root: a system flagged abnormality that a coordinator
 * must act on (a late caregiver, a missed clock in, an expiring certification, a
 * medication discrepancy). Raised by the operations subsystems, listed on the
 * dashboard, and closed when a coordinator resolves or dismisses it. Construction
 * goes through the factory so an alert is never in an invalid state.
 */
export class OperationalAlert extends AggregateRoot<string> {
  private props: OperationalAlertProps;

  private constructor(id: string, props: OperationalAlertProps) {
    super(id);
    this.props = props;
  }

  public static raise(params: {
    id: string;
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    description: string;
    coordinatorName?: string | null;
    relatedVisitId?: string | null;
    relatedCaregiverId?: string | null;
    relatedCareRecipientId?: string | null;
    now: Date;
  }): OperationalAlert {
    return new OperationalAlert(params.id, {
      type: params.type,
      severity: params.severity,
      title: OperationalAlert.clean(params.title, MAX_TITLE_LENGTH, 'Title'),
      description: OperationalAlert.clean(
        params.description,
        MAX_DESCRIPTION_LENGTH,
        'Description',
      ),
      coordinatorName: OperationalAlert.cleanOptional(
        params.coordinatorName,
        MAX_COORDINATOR_LENGTH,
      ),
      status: AlertStatus.Open,
      relatedVisitId: params.relatedVisitId ?? null,
      relatedCaregiverId: params.relatedCaregiverId ?? null,
      relatedCareRecipientId: params.relatedCareRecipientId ?? null,
      createdAt: params.now,
      resolvedAt: null,
      resolvedByAdminId: null,
    });
  }

  public static rehydrate(id: string, props: OperationalAlertProps): OperationalAlert {
    return new OperationalAlert(id, props);
  }

  /** Mark the alert actioned by a coordinator. Only an open alert can be closed. */
  public resolve(adminId: string, now: Date): void {
    this.close(AlertStatus.Resolved, adminId, now);
  }

  /** Acknowledge the alert as not needing action. Only an open alert can be closed. */
  public dismiss(adminId: string, now: Date): void {
    this.close(AlertStatus.Dismissed, adminId, now);
  }

  private close(status: AlertStatus, adminId: string, now: Date): void {
    if (this.props.status !== AlertStatus.Open) {
      throw new ValidationException('This alert has already been closed');
    }
    this.props.status = status;
    this.props.resolvedByAdminId = adminId;
    this.props.resolvedAt = now;
  }

  private static clean(value: string, max: number, label: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationException(`${label} is required`);
    }
    if (trimmed.length > max) {
      throw new ValidationException(`${label} exceeds the maximum length`);
    }
    return trimmed;
  }

  private static cleanOptional(value: string | null | undefined, max: number): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed.slice(0, max);
  }

  public get type(): AlertType {
    return this.props.type;
  }

  public get severity(): AlertSeverity {
    return this.props.severity;
  }

  public get title(): string {
    return this.props.title;
  }

  public get description(): string {
    return this.props.description;
  }

  public get coordinatorName(): string | null {
    return this.props.coordinatorName;
  }

  public get status(): AlertStatus {
    return this.props.status;
  }

  public get relatedVisitId(): string | null {
    return this.props.relatedVisitId;
  }

  public get relatedCaregiverId(): string | null {
    return this.props.relatedCaregiverId;
  }

  public get relatedCareRecipientId(): string | null {
    return this.props.relatedCareRecipientId;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get resolvedAt(): Date | null {
    return this.props.resolvedAt;
  }

  public get resolvedByAdminId(): string | null {
    return this.props.resolvedByAdminId;
  }
}
