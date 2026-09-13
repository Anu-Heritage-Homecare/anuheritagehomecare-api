import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { CareTeamRole } from './care-team-role.enum';

interface CareTeamAssignmentProps {
  careRecipientId: string;
  caregiverId: string;
  role: CareTeamRole;
  /** The caregiver's specialization for this assignment, office set free text. */
  specialization: string | null;
  /** The caregiver's working schedule, office set free text (for example Mon-Fri, 8AM-5PM). */
  scheduleLabel: string | null;
  assignedAt: Date;
  removedAt: Date | null;
}

const MAX_TEXT_LENGTH = 200;

/**
 * One caregiver's membership on a care recipient's team, in a role (primary,
 * backup or coordinator), with an office set specialization and working schedule.
 * Removed rather than deleted so the assignment history is preserved. Its own
 * entity, not part of the CareRecipient aggregate.
 */
export class CareTeamAssignment extends Entity<string> {
  private readonly props: CareTeamAssignmentProps;

  private constructor(id: string, props: CareTeamAssignmentProps) {
    super(id);
    this.props = props;
  }

  public static assign(params: {
    id: string;
    careRecipientId: string;
    caregiverId: string;
    role: CareTeamRole;
    specialization?: string | null;
    scheduleLabel?: string | null;
    now: Date;
  }): CareTeamAssignment {
    const caregiverId = params.caregiverId.trim();
    if (caregiverId.length === 0) {
      throw new ValidationException('A caregiver is required');
    }
    return new CareTeamAssignment(params.id, {
      careRecipientId: params.careRecipientId,
      caregiverId,
      role: params.role,
      specialization: CareTeamAssignment.clean(params.specialization),
      scheduleLabel: CareTeamAssignment.clean(params.scheduleLabel),
      assignedAt: params.now,
      removedAt: null,
    });
  }

  public static rehydrate(id: string, props: CareTeamAssignmentProps): CareTeamAssignment {
    return new CareTeamAssignment(id, props);
  }

  /** Update the role and office set details in place. */
  public revise(params: {
    role?: CareTeamRole;
    specialization?: string | null;
    scheduleLabel?: string | null;
  }): void {
    if (params.role !== undefined) {
      this.props.role = params.role;
    }
    if (params.specialization !== undefined) {
      this.props.specialization = CareTeamAssignment.clean(params.specialization);
    }
    if (params.scheduleLabel !== undefined) {
      this.props.scheduleLabel = CareTeamAssignment.clean(params.scheduleLabel);
    }
  }

  /** Remove the caregiver from the team, stamping the removal time. */
  public remove(now: Date): void {
    if (this.props.removedAt !== null) {
      throw new ValidationException('The assignment is already removed');
    }
    this.props.removedAt = now;
  }

  private static clean(raw: string | null | undefined): string | null {
    if (raw === null || raw === undefined) {
      return null;
    }
    const value = raw.trim();
    if (value.length === 0) {
      return null;
    }
    if (value.length > MAX_TEXT_LENGTH) {
      throw new ValidationException('A care team detail exceeds the maximum length');
    }
    return value;
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get caregiverId(): string {
    return this.props.caregiverId;
  }

  public get role(): CareTeamRole {
    return this.props.role;
  }

  public get specialization(): string | null {
    return this.props.specialization;
  }

  public get scheduleLabel(): string | null {
    return this.props.scheduleLabel;
  }

  public get assignedAt(): Date {
    return this.props.assignedAt;
  }

  public get removedAt(): Date | null {
    return this.props.removedAt;
  }

  public get isActive(): boolean {
    return this.props.removedAt === null;
  }
}
