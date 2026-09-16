import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { CareRequestStatus } from './care-request-status.enum';

interface AdditionalCareRequestProps {
  ownerId: string;
  careRecipientId: string;
  careType: string;
  requestedDate: Date;
  startMinute: number;
  durationMinutes: number;
  reason: string | null;
  status: CareRequestStatus;
  actionedByAdminId: string | null;
  actionedAt: Date | null;
  decisionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const MINUTES_IN_DAY = 24 * 60;
const MAX_CARE_TYPE_LENGTH = 100;
const MAX_REASON_LENGTH = 1000;
const MAX_DURATION_MINUTES = 12 * 60;

/**
 * A family owner's request for an extra care session for one of their recipients:
 * the type of care, the requested day and start time (minutes from midnight), a
 * duration and an optional reason. Created PENDING for the office to action. All
 * construction goes through the factory so the aggregate is never invalid.
 */
export class AdditionalCareRequest extends AggregateRoot<string> {
  private props: AdditionalCareRequestProps;

  private constructor(id: string, props: AdditionalCareRequestProps) {
    super(id);
    this.props = props;
  }

  public static submit(params: {
    id: string;
    ownerId: string;
    careRecipientId: string;
    careType: string;
    requestedDate: Date;
    startMinute: number;
    durationMinutes: number;
    reason?: string | null;
    now: Date;
  }): AdditionalCareRequest {
    const careType = params.careType.trim();
    if (careType.length === 0) {
      throw new ValidationException('A type of care is required');
    }
    if (careType.length > MAX_CARE_TYPE_LENGTH) {
      throw new ValidationException('The type of care exceeds the maximum length');
    }

    const requestedDay = AdditionalCareRequest.startOfUtcDay(params.requestedDate);
    if (Number.isNaN(requestedDay.getTime())) {
      throw new ValidationException('The requested date is not valid');
    }
    if (requestedDay.getTime() < AdditionalCareRequest.startOfUtcDay(params.now).getTime()) {
      throw new ValidationException('The requested date cannot be in the past');
    }

    if (
      !Number.isInteger(params.startMinute) ||
      params.startMinute < 0 ||
      params.startMinute >= MINUTES_IN_DAY
    ) {
      throw new ValidationException('The start time must be a minute within the day');
    }
    if (
      !Number.isInteger(params.durationMinutes) ||
      params.durationMinutes <= 0 ||
      params.durationMinutes > MAX_DURATION_MINUTES
    ) {
      throw new ValidationException('The duration is out of the accepted range');
    }

    const reason = AdditionalCareRequest.cleanReason(params.reason);

    return new AdditionalCareRequest(params.id, {
      ownerId: params.ownerId,
      careRecipientId: params.careRecipientId,
      careType,
      requestedDate: requestedDay,
      startMinute: params.startMinute,
      durationMinutes: params.durationMinutes,
      reason,
      status: CareRequestStatus.Pending,
      actionedByAdminId: null,
      actionedAt: null,
      decisionNote: null,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: AdditionalCareRequestProps): AdditionalCareRequest {
    return new AdditionalCareRequest(id, props);
  }

  /**
   * Approve a pending request. Records the acting admin and the moment for the
   * audit trail. Creating the resulting visit is a downstream concern (deferred).
   */
  public approve(adminUserId: string, now: Date): void {
    this.assertPending('approved');
    this.props.status = CareRequestStatus.Approved;
    this.props.actionedByAdminId = adminUserId;
    this.props.actionedAt = now;
    this.props.updatedAt = now;
  }

  /** Decline a pending request, recording the acting admin and an optional note. */
  public decline(adminUserId: string, note: string | null | undefined, now: Date): void {
    this.assertPending('declined');
    this.props.status = CareRequestStatus.Declined;
    this.props.actionedByAdminId = adminUserId;
    this.props.actionedAt = now;
    this.props.decisionNote = AdditionalCareRequest.cleanReason(note);
    this.props.updatedAt = now;
  }

  private assertPending(action: string): void {
    if (this.props.status !== CareRequestStatus.Pending) {
      throw new ValidationException(`Only a pending care request can be ${action}`);
    }
  }

  private static cleanReason(raw: string | null | undefined): string | null {
    if (raw === null || raw === undefined) {
      return null;
    }
    const reason = raw.trim();
    if (reason.length === 0) {
      return null;
    }
    if (reason.length > MAX_REASON_LENGTH) {
      throw new ValidationException('The reason exceeds the maximum length');
    }
    return reason;
  }

  private static startOfUtcDay(value: Date): Date {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0),
    );
  }

  public get ownerId(): string {
    return this.props.ownerId;
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get careType(): string {
    return this.props.careType;
  }

  public get requestedDate(): Date {
    return this.props.requestedDate;
  }

  public get startMinute(): number {
    return this.props.startMinute;
  }

  public get durationMinutes(): number {
    return this.props.durationMinutes;
  }

  public get reason(): string | null {
    return this.props.reason;
  }

  public get status(): CareRequestStatus {
    return this.props.status;
  }

  public get actionedByAdminId(): string | null {
    return this.props.actionedByAdminId;
  }

  public get actionedAt(): Date | null {
    return this.props.actionedAt;
  }

  public get decisionNote(): string | null {
    return this.props.decisionNote;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
