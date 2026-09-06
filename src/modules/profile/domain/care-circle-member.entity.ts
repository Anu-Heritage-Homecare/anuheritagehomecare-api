import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { CareAccessLevel } from './care-access-level.enum';

interface CareCircleMemberProps {
  ownerId: string;
  /** The app user who is this member; their name and avatar come from identity. */
  memberUserId: string;
  relationship: string;
  accessLevel: CareAccessLevel;
  createdAt: Date;
}

/**
 * A member of a family owner's care circle: an app user granted access to the
 * owner's care information at a level. The member's name and avatar are read from
 * identity; this entity holds the relationship and the granted access level.
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
      createdAt: params.createdAt,
    });
  }

  public static rehydrate(id: string, props: CareCircleMemberProps): CareCircleMember {
    return new CareCircleMember(id, props);
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

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
