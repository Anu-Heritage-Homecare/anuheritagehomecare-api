import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { CareAccessLevel } from './care-access-level.enum';
import { CareCircleMemberStatus } from './care-circle-member-status.enum';

interface CareCircleMemberProps {
  ownerId: string;
  /** The app user who is this member; their name and avatar come from identity. */
  memberUserId: string;
  relationship: string;
  accessLevel: CareAccessLevel;
  status: CareCircleMemberStatus;
  createdAt: Date;
}

/**
 * A member of a family owner's care circle: an app user granted access to the
 * owner's care information at a level. The member's name and avatar are read from
 * identity; this entity holds the relationship, the granted access level and the
 * approval status. A member only has access once the owner approves them (status
 * ACTIVE); a PENDING member is a join request that carries no access.
 */
export class CareCircleMember extends Entity<string> {
  private readonly props: CareCircleMemberProps;

  private constructor(id: string, props: CareCircleMemberProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    ownerId: string;
    memberUserId: string;
    relationship: string;
    accessLevel: CareAccessLevel;
    status: CareCircleMemberStatus;
    createdAt: Date;
  }): CareCircleMember {
    const relationship = params.relationship.trim();
    if (relationship.length === 0) {
      throw new ValidationException('A care circle member needs a relationship');
    }
    return new CareCircleMember(params.id, {
      ownerId: params.ownerId,
      memberUserId: params.memberUserId,
      relationship,
      accessLevel: params.accessLevel,
      status: params.status,
      createdAt: params.createdAt,
    });
  }

  public static rehydrate(id: string, props: CareCircleMemberProps): CareCircleMember {
    return new CareCircleMember(id, props);
  }

  /**
   * Approve a pending join request, activating the membership. The owner may set
   * the granted access level in the same step; omitting it keeps the level the
   * request already carries (the least privileged default).
   */
  public approve(accessLevel?: CareAccessLevel): void {
    if (this.props.status !== CareCircleMemberStatus.Pending) {
      throw new ValidationException('This member is not awaiting approval');
    }
    this.props.status = CareCircleMemberStatus.Active;
    if (accessLevel !== undefined) {
      this.props.accessLevel = accessLevel;
    }
  }

  /** Grant the member a different access level (the owner's permission choice). */
  public changeAccessLevel(accessLevel: CareAccessLevel): void {
    this.props.accessLevel = accessLevel;
  }

  /** Correct the member's relationship label. */
  public changeRelationship(relationship: string): void {
    const trimmed = relationship.trim();
    if (trimmed.length === 0) {
      throw new ValidationException('A care circle member needs a relationship');
    }
    this.props.relationship = trimmed;
  }

  public get ownerId(): string {
    return this.props.ownerId;
  }

  public get memberUserId(): string {
    return this.props.memberUserId;
  }

  public get relationship(): string {
    return this.props.relationship;
  }

  public get accessLevel(): CareAccessLevel {
    return this.props.accessLevel;
  }

  public get status(): CareCircleMemberStatus {
    return this.props.status;
  }

  public get isPending(): boolean {
    return this.props.status === CareCircleMemberStatus.Pending;
  }

  public get isActive(): boolean {
    return this.props.status === CareCircleMemberStatus.Active;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
