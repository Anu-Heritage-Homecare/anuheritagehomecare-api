import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';

const MAX_NAME = 200;
const MAX_ROLE = 160;
const MAX_PHONE = 40;

interface ContactProps {
  name: string;
  role: string | null;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

/** An organization level emergency contact (medical director, security desk). */
export class OrganizationEmergencyContact extends AggregateRoot<string> {
  private props: ContactProps;

  private constructor(id: string, props: ContactProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    name: string;
    role?: string | null;
    phone: string;
    now: Date;
  }): OrganizationEmergencyContact {
    return new OrganizationEmergencyContact(params.id, {
      name: OrganizationEmergencyContact.cleanRequired(params.name, MAX_NAME, 'Contact name'),
      role: OrganizationEmergencyContact.cleanOptional(params.role, MAX_ROLE, 'Role'),
      phone: OrganizationEmergencyContact.cleanRequired(params.phone, MAX_PHONE, 'Phone number'),
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: ContactProps): OrganizationEmergencyContact {
    return new OrganizationEmergencyContact(id, props);
  }

  public edit(fields: { name?: string; role?: string | null; phone?: string }, now: Date): void {
    if (fields.name !== undefined) {
      this.props.name = OrganizationEmergencyContact.cleanRequired(
        fields.name,
        MAX_NAME,
        'Contact name',
      );
    }
    if (fields.role !== undefined) {
      this.props.role = OrganizationEmergencyContact.cleanOptional(fields.role, MAX_ROLE, 'Role');
    }
    if (fields.phone !== undefined) {
      this.props.phone = OrganizationEmergencyContact.cleanRequired(
        fields.phone,
        MAX_PHONE,
        'Phone number',
      );
    }
    this.props.updatedAt = now;
  }

  private static cleanRequired(value: string, max: number, label: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationException(`${label} is required`);
    }
    if (trimmed.length > max) {
      throw new ValidationException(`${label} exceeds the maximum length`);
    }
    return trimmed;
  }

  private static cleanOptional(
    value: string | null | undefined,
    max: number,
    label: string,
  ): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    if (trimmed.length > max) {
      throw new ValidationException(`${label} exceeds the maximum length`);
    }
    return trimmed;
  }

  public get name(): string {
    return this.props.name;
  }

  public get role(): string | null {
    return this.props.role;
  }

  public get phone(): string {
    return this.props.phone;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
