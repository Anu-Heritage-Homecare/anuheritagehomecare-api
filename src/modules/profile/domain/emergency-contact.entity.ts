import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';

interface EmergencyContactProps {
  name: string;
  phone: string;
  relationship: string;
  updatedAt: Date;
}

/**
 * The family owner's emergency contact, keyed by their user id (one per owner).
 * A distinct person to reach in an emergency, separate from the owner's own
 * account details.
 */
export class EmergencyContact extends Entity<string> {
  private props: EmergencyContactProps;

  private constructor(userId: string, props: EmergencyContactProps) {
    super(userId);
    this.props = props;
  }

  public static create(params: {
    userId: string;
    name: string;
    phone: string;
    relationship: string;
    now: Date;
  }): EmergencyContact {
    const name = params.name.trim();
    const phone = params.phone.trim();
    const relationship = params.relationship.trim();
    if (name.length === 0) {
      throw new ValidationException('An emergency contact needs a name');
    }
    if (phone.length === 0) {
      throw new ValidationException('An emergency contact needs a phone number');
    }
    if (relationship.length === 0) {
      throw new ValidationException('An emergency contact needs a relationship');
    }
    return new EmergencyContact(params.userId, {
      name,
      phone,
      relationship,
      updatedAt: params.now,
    });
  }

  public static rehydrate(userId: string, props: EmergencyContactProps): EmergencyContact {
    return new EmergencyContact(userId, props);
  }

  public get name(): string {
    return this.props.name;
  }

  public get phone(): string {
    return this.props.phone;
  }

  public get relationship(): string {
    return this.props.relationship;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
