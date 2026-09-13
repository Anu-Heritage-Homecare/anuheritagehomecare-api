import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { CareTeamAction } from './care-team-action.enum';

interface CareTeamAssignmentEventProps {
  careRecipientId: string;
  caregiverId: string;
  action: CareTeamAction;
  reason: string;
  /** The admin who made the change, for attribution. Null for system entries. */
  byAdminId: string | null;
  createdAt: Date;
}

const MAX_REASON_LENGTH = 500;

/**
 * One append only entry in a recipient's caregiver assignment history (a caregiver
 * assigned to or removed from the team, with the reason), attributed to the admin
 * who made the change. Immutable once written.
 */
export class CareTeamAssignmentEvent extends Entity<string> {
  private readonly props: CareTeamAssignmentEventProps;

  private constructor(id: string, props: CareTeamAssignmentEventProps) {
    super(id);
    this.props = props;
  }

  public static record(params: {
    id: string;
    careRecipientId: string;
    caregiverId: string;
    action: CareTeamAction;
    reason: string;
    byAdminId?: string | null;
    now: Date;
  }): CareTeamAssignmentEvent {
    const reason = params.reason.trim();
    if (reason.length > MAX_REASON_LENGTH) {
      throw new ValidationException('An assignment reason exceeds the maximum length');
    }
    return new CareTeamAssignmentEvent(params.id, {
      careRecipientId: params.careRecipientId,
      caregiverId: params.caregiverId,
      action: params.action,
      reason,
      byAdminId: params.byAdminId ?? null,
      createdAt: params.now,
    });
  }

  public static rehydrate(
    id: string,
    props: CareTeamAssignmentEventProps,
  ): CareTeamAssignmentEvent {
    return new CareTeamAssignmentEvent(id, props);
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get caregiverId(): string {
    return this.props.caregiverId;
  }

  public get action(): CareTeamAction {
    return this.props.action;
  }

  public get reason(): string {
    return this.props.reason;
  }

  public get byAdminId(): string | null {
    return this.props.byAdminId;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
