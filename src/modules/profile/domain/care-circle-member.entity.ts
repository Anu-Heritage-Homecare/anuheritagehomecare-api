import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';

interface CareCircleMemberProps {
  ownerId: string;
  name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  createdAt: Date;
}

/**
 * One person in a family owner's care circle: family and friends around the
 * recipient. A name and relationship are required; phone and email are optional.
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
    name: string;
    relationship: string;
    phone: string | null;
    email: string | null;
    createdAt: Date;
  }): CareCircleMember {
    const name = params.name.trim();
    const relationship = params.relationship.trim();
    if (name.length === 0) {
      throw new ValidationException('A care circle member needs a name');
    }
    if (relationship.length === 0) {
      throw new ValidationException('A care circle member needs a relationship');
    }
    return new CareCircleMember(params.id, {
      ownerId: params.ownerId,
      name,
      relationship,
      phone: CareCircleMember.blankToNull(params.phone),
      email: CareCircleMember.blankToNull(params.email),
      createdAt: params.createdAt,
    });
  }

  public static rehydrate(id: string, props: CareCircleMemberProps): CareCircleMember {
    return new CareCircleMember(id, props);
  }

  private static blankToNull(value: string | null): string | null {
    if (value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  public get ownerId(): string {
    return this.props.ownerId;
  }

  public get name(): string {
    return this.props.name;
  }

  public get relationship(): string {
    return this.props.relationship;
  }

  public get phone(): string | null {
    return this.props.phone;
  }

  public get email(): string | null {
    return this.props.email;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
