import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { AlertSeverity } from './alert-severity.enum';
import { AlertStatus, isActiveStatus } from './alert-status.enum';
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
  acknowledgedAt: Date | null;
  acknowledgedByAdminId: string | null;
  acknowledgeNote: string | null;
  escalatedAt: Date | null;
  escalatedByAdminId: string | null;
  escalationLevel: string | null;
  escalationAssignee: string | null;
  escalationReason: string | null;
  escalationNote: string | null;
  resolvedAt: Date | null;
  resolvedByAdminId: string | null;
  resolutionCategory: string | null;
  resolutionActionTaken: string | null;
  resolutionInternalNote: string | null;
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
      acknowledgedAt: null,
      acknowledgedByAdminId: null,
      acknowledgeNote: null,
      escalatedAt: null,
      escalatedByAdminId: null,
      escalationLevel: null,
      escalationAssignee: null,
      escalationReason: null,
      escalationNote: null,
      resolvedAt: null,
      resolvedByAdminId: null,
      resolutionCategory: null,
      resolutionActionTaken: null,
      resolutionInternalNote: null,
    });
  }

  public static rehydrate(id: string, props: OperationalAlertProps): OperationalAlert {
    return new OperationalAlert(id, props);
  }

  /**
   * A coordinator has seen the alert. Only an open alert can be acknowledged. The
   * acknowledging coordinator and an optional note are captured when supplied (the
   * Live Monitoring modal); the Alerts screen progress call supplies neither.
   */
  public acknowledge(
    adminId: string | null = null,
    note: string | null = null,
    now: Date | null = null,
  ): void {
    this.transitionActive(AlertStatus.Acknowledged, [AlertStatus.Open]);
    this.props.acknowledgedByAdminId = adminId;
    this.props.acknowledgeNote = OperationalAlert.cleanOptional(note, MAX_DESCRIPTION_LENGTH);
    this.props.acknowledgedAt = now;
  }

  /** A coordinator is working the alert. From open or acknowledged. */
  public investigate(): void {
    this.transitionActive(AlertStatus.Investigating, [AlertStatus.Open, AlertStatus.Acknowledged]);
  }

  /**
   * Escalate the alert to a higher level, assigning it and recording the reason and
   * an optional note. Moves an active alert to Investigating (being worked). The
   * level, assignee and reason are free text (the dropdown values).
   */
  public escalate(params: {
    adminId: string;
    level: string;
    assignee?: string | null;
    reason?: string | null;
    note?: string | null;
    now: Date;
  }): void {
    if (!isActiveStatus(this.props.status)) {
      throw new ValidationException('A closed alert cannot be escalated');
    }
    this.props.status = AlertStatus.Investigating;
    this.props.escalatedAt = params.now;
    this.props.escalatedByAdminId = params.adminId;
    this.props.escalationLevel = OperationalAlert.clean(
      params.level,
      MAX_COORDINATOR_LENGTH,
      'Escalation level',
    );
    this.props.escalationAssignee = OperationalAlert.cleanOptional(
      params.assignee,
      MAX_COORDINATOR_LENGTH,
    );
    this.props.escalationReason = OperationalAlert.cleanOptional(
      params.reason,
      MAX_COORDINATOR_LENGTH,
    );
    this.props.escalationNote = OperationalAlert.cleanOptional(params.note, MAX_DESCRIPTION_LENGTH);
  }

  /**
   * Mark the alert actioned by a coordinator. Allowed from any active state. The
   * Resolve Alert modal supplies a resolution category, the action taken and an
   * optional internal note; the simple resolve call supplies none.
   */
  public resolve(
    adminId: string,
    now: Date,
    details: {
      category?: string | null;
      actionTaken?: string | null;
      internalNote?: string | null;
    } = {},
  ): void {
    this.close(AlertStatus.Resolved, adminId, now);
    this.props.resolutionCategory = OperationalAlert.cleanOptional(
      details.category,
      MAX_COORDINATOR_LENGTH,
    );
    this.props.resolutionActionTaken = OperationalAlert.cleanOptional(
      details.actionTaken,
      MAX_DESCRIPTION_LENGTH,
    );
    this.props.resolutionInternalNote = OperationalAlert.cleanOptional(
      details.internalNote,
      MAX_DESCRIPTION_LENGTH,
    );
  }

  /** Dismiss the alert as not needing action. Allowed from any active state. */
  public dismiss(adminId: string, now: Date): void {
    this.close(AlertStatus.Dismissed, adminId, now);
  }

  private transitionActive(next: AlertStatus, allowedFrom: AlertStatus[]): void {
    if (!allowedFrom.includes(this.props.status)) {
      throw new ValidationException(`An alert cannot move to ${next} from ${this.props.status}`);
    }
    this.props.status = next;
  }

  private close(status: AlertStatus, adminId: string, now: Date): void {
    if (!isActiveStatus(this.props.status)) {
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

  public get acknowledgedAt(): Date | null {
    return this.props.acknowledgedAt;
  }

  public get acknowledgedByAdminId(): string | null {
    return this.props.acknowledgedByAdminId;
  }

  public get acknowledgeNote(): string | null {
    return this.props.acknowledgeNote;
  }

  public get escalatedAt(): Date | null {
    return this.props.escalatedAt;
  }

  public get escalatedByAdminId(): string | null {
    return this.props.escalatedByAdminId;
  }

  public get escalationLevel(): string | null {
    return this.props.escalationLevel;
  }

  public get escalationAssignee(): string | null {
    return this.props.escalationAssignee;
  }

  public get escalationReason(): string | null {
    return this.props.escalationReason;
  }

  public get escalationNote(): string | null {
    return this.props.escalationNote;
  }

  public get resolutionCategory(): string | null {
    return this.props.resolutionCategory;
  }

  public get resolutionActionTaken(): string | null {
    return this.props.resolutionActionTaken;
  }

  public get resolutionInternalNote(): string | null {
    return this.props.resolutionInternalNote;
  }
}
