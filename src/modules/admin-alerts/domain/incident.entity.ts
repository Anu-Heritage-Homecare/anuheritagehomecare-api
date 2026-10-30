import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { AlertSeverity } from './alert-severity.enum';
import { IncidentCategory } from './incident-category.enum';
import { IncidentStatus, isActiveIncidentStatus } from './incident-status.enum';

const MAX_DETAIL_LENGTH = 1000;
const MAX_REPORTER_LENGTH = 160;

interface IncidentProps {
  /** Monotonic display sequence, assigned by the store on insert (null until persisted). */
  sequence: number | null;
  category: IncidentCategory;
  severity: AlertSeverity;
  status: IncidentStatus;
  detail: string | null;
  /** Who reported it (a staff member or caller); null shows as "Unassigned". */
  reporterName: string | null;
  reportedByAdminId: string | null;
  /** The coordinator handling the incident, once assigned. */
  assignedCoordinatorAdminId: string | null;
  relatedVisitId: string | null;
  relatedCaregiverId: string | null;
  relatedCareRecipientId: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedByAdminId: string | null;
}

/**
 * Incident aggregate root: a reportable care event (a fall, a medication concern,
 * a service complaint) filed by staff, distinct from a system raised operational
 * alert. Construction goes through the factory so it is never in an invalid state.
 */
export class Incident extends AggregateRoot<string> {
  private props: IncidentProps;

  private constructor(id: string, props: IncidentProps) {
    super(id);
    this.props = props;
  }

  public static report(params: {
    id: string;
    category: IncidentCategory;
    severity: AlertSeverity;
    detail?: string | null;
    reporterName?: string | null;
    reportedByAdminId?: string | null;
    relatedVisitId?: string | null;
    relatedCaregiverId?: string | null;
    relatedCareRecipientId?: string | null;
    now: Date;
  }): Incident {
    return new Incident(params.id, {
      sequence: null,
      category: params.category,
      severity: params.severity,
      status: IncidentStatus.Open,
      detail: Incident.cleanOptional(params.detail, MAX_DETAIL_LENGTH),
      reporterName: Incident.cleanOptional(params.reporterName, MAX_REPORTER_LENGTH),
      reportedByAdminId: params.reportedByAdminId ?? null,
      assignedCoordinatorAdminId: null,
      relatedVisitId: params.relatedVisitId ?? null,
      relatedCaregiverId: params.relatedCaregiverId ?? null,
      relatedCareRecipientId: params.relatedCareRecipientId ?? null,
      createdAt: params.now,
      resolvedAt: null,
      resolvedByAdminId: null,
    });
  }

  public static rehydrate(id: string, props: IncidentProps): Incident {
    return new Incident(id, props);
  }

  /** A coordinator starts working the incident. From open; assigns them too. */
  public startReview(adminId: string): void {
    if (this.props.status !== IncidentStatus.Open) {
      throw new ValidationException('Only an open incident can move to under review');
    }
    this.props.status = IncidentStatus.UnderReview;
    this.props.assignedCoordinatorAdminId = adminId;
  }

  /** Assign (or reassign) the coordinator handling the incident, without changing status. */
  public assignCoordinator(adminId: string): void {
    if (this.props.status === IncidentStatus.Closed) {
      throw new ValidationException('A closed incident cannot be reassigned');
    }
    this.props.assignedCoordinatorAdminId = adminId;
  }

  /** Escalate the incident, raising its priority to the top. */
  public escalate(): void {
    if (this.props.status === IncidentStatus.Closed) {
      throw new ValidationException('A closed incident cannot be escalated');
    }
    this.props.severity = AlertSeverity.Critical;
  }

  /** Mark the incident actioned. From open or under review. */
  public resolve(adminId: string, now: Date): void {
    this.close(IncidentStatus.Resolved, adminId, now);
  }

  /** Close the incident with no further action. From any non closed state. */
  public closeOut(adminId: string, now: Date): void {
    this.close(IncidentStatus.Closed, adminId, now);
  }

  private close(status: IncidentStatus, adminId: string, now: Date): void {
    if (status === IncidentStatus.Resolved && !isActiveIncidentStatus(this.props.status)) {
      throw new ValidationException('Only an active incident can be resolved');
    }
    if (this.props.status === IncidentStatus.Closed) {
      throw new ValidationException('This incident is already closed');
    }
    this.props.status = status;
    this.props.resolvedByAdminId = adminId;
    this.props.resolvedAt = now;
  }

  private static cleanOptional(value: string | null | undefined, max: number): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed.slice(0, max);
  }

  public get sequence(): number | null {
    return this.props.sequence;
  }

  public get category(): IncidentCategory {
    return this.props.category;
  }

  public get severity(): AlertSeverity {
    return this.props.severity;
  }

  public get status(): IncidentStatus {
    return this.props.status;
  }

  public get active(): boolean {
    return isActiveIncidentStatus(this.props.status);
  }

  public get detail(): string | null {
    return this.props.detail;
  }

  public get reporterName(): string | null {
    return this.props.reporterName;
  }

  public get reportedByAdminId(): string | null {
    return this.props.reportedByAdminId;
  }

  public get assignedCoordinatorAdminId(): string | null {
    return this.props.assignedCoordinatorAdminId;
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
