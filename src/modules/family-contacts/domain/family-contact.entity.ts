import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { FamilyAccessLevel } from './family-access-level.enum';
import { FamilyContactRole } from './family-contact-role.enum';
import { FamilyPreferredContactMethod } from './family-preferred-contact-method.enum';

interface FamilyContactProps {
  careRecipientId: string;
  name: string;
  /** How they relate to the recipient (free text, for example "Son", "Daughter-in-law"). */
  relationship: string;
  roles: FamilyContactRole[];
  /** A qualifier for the roles (free text, for example "weekends"), or null. */
  roleNote: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  accessLevel: FamilyAccessLevel;
  /** A short scope qualifier for the access badge (for example "All Records"), or null. */
  accessScopeLabel: string | null;
  /** The clinical sections this contact may see, for the permissions matrix. */
  authorizedSectionsLabel: string | null;
  preferredMethod: FamilyPreferredContactMethod | null;
  portalLoginEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MAX_NAME_LENGTH = 200;
const MAX_RELATIONSHIP_LENGTH = 120;
const MAX_SHORT_TEXT = 200;
const MAX_LONG_TEXT = 500;

/**
 * One family member registered against a care recipient, authorised to receive
 * updates, participate in scheduling or manage care. Holds contact details, one or
 * more designated roles, a portal access level and a preferred contact channel.
 * Sensitive personal data; contact details must never be logged.
 */
export class FamilyContact extends AggregateRoot<string> {
  private readonly props: FamilyContactProps;

  private constructor(id: string, props: FamilyContactProps) {
    super(id);
    this.props = props;
  }

  public static register(params: {
    id: string;
    careRecipientId: string;
    name: string;
    relationship: string;
    roles?: FamilyContactRole[] | null;
    roleNote?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    accessLevel?: FamilyAccessLevel;
    accessScopeLabel?: string | null;
    authorizedSectionsLabel?: string | null;
    preferredMethod?: FamilyPreferredContactMethod | null;
    portalLoginEnabled?: boolean;
    now: Date;
  }): FamilyContact {
    return new FamilyContact(params.id, {
      careRecipientId: params.careRecipientId,
      name: FamilyContact.required(params.name, MAX_NAME_LENGTH, 'name'),
      relationship: FamilyContact.required(
        params.relationship,
        MAX_RELATIONSHIP_LENGTH,
        'relationship',
      ),
      roles: FamilyContact.cleanRoles(params.roles),
      roleNote: FamilyContact.optional(params.roleNote, MAX_SHORT_TEXT, 'role note'),
      phone: FamilyContact.optional(params.phone, MAX_SHORT_TEXT, 'phone'),
      email: FamilyContact.optional(params.email, MAX_SHORT_TEXT, 'email'),
      address: FamilyContact.optional(params.address, MAX_LONG_TEXT, 'address'),
      accessLevel: params.accessLevel ?? FamilyAccessLevel.ViewOnly,
      accessScopeLabel: FamilyContact.optional(
        params.accessScopeLabel,
        MAX_SHORT_TEXT,
        'access scope',
      ),
      authorizedSectionsLabel: FamilyContact.optional(
        params.authorizedSectionsLabel,
        MAX_LONG_TEXT,
        'authorized sections',
      ),
      preferredMethod: params.preferredMethod ?? null,
      portalLoginEnabled: params.portalLoginEnabled ?? false,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: FamilyContactProps): FamilyContact {
    return new FamilyContact(id, { ...props, roles: [...props.roles] });
  }

  /** Replace the editable details, roles, access and portal settings wholesale. */
  public revise(params: {
    name: string;
    relationship: string;
    roles?: FamilyContactRole[] | null;
    roleNote?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    accessLevel?: FamilyAccessLevel;
    accessScopeLabel?: string | null;
    authorizedSectionsLabel?: string | null;
    preferredMethod?: FamilyPreferredContactMethod | null;
    portalLoginEnabled?: boolean;
    now: Date;
  }): void {
    this.props.name = FamilyContact.required(params.name, MAX_NAME_LENGTH, 'name');
    this.props.relationship = FamilyContact.required(
      params.relationship,
      MAX_RELATIONSHIP_LENGTH,
      'relationship',
    );
    this.props.roles = FamilyContact.cleanRoles(params.roles);
    this.props.roleNote = FamilyContact.optional(params.roleNote, MAX_SHORT_TEXT, 'role note');
    this.props.phone = FamilyContact.optional(params.phone, MAX_SHORT_TEXT, 'phone');
    this.props.email = FamilyContact.optional(params.email, MAX_SHORT_TEXT, 'email');
    this.props.address = FamilyContact.optional(params.address, MAX_LONG_TEXT, 'address');
    this.props.accessLevel = params.accessLevel ?? this.props.accessLevel;
    this.props.accessScopeLabel = FamilyContact.optional(
      params.accessScopeLabel,
      MAX_SHORT_TEXT,
      'access scope',
    );
    this.props.authorizedSectionsLabel = FamilyContact.optional(
      params.authorizedSectionsLabel,
      MAX_LONG_TEXT,
      'authorized sections',
    );
    this.props.preferredMethod = params.preferredMethod ?? null;
    this.props.portalLoginEnabled = params.portalLoginEnabled ?? this.props.portalLoginEnabled;
    this.props.updatedAt = params.now;
  }

  public hasRole(role: FamilyContactRole): boolean {
    return this.props.roles.includes(role);
  }

  private static cleanRoles(raw: FamilyContactRole[] | null | undefined): FamilyContactRole[] {
    if (raw === null || raw === undefined) {
      return [];
    }
    return [...new Set(raw)];
  }

  private static required(raw: string, max: number, field: string): string {
    const value = raw.trim();
    if (value.length === 0) {
      throw new ValidationException(`A family contact must have a ${field}`);
    }
    if (value.length > max) {
      throw new ValidationException(`A family contact ${field} exceeds the maximum length`);
    }
    return value;
  }

  private static optional(
    raw: string | null | undefined,
    max: number,
    field: string,
  ): string | null {
    if (raw === null || raw === undefined) {
      return null;
    }
    const value = raw.trim();
    if (value.length === 0) {
      return null;
    }
    if (value.length > max) {
      throw new ValidationException(`A family contact ${field} exceeds the maximum length`);
    }
    return value;
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get name(): string {
    return this.props.name;
  }

  public get relationship(): string {
    return this.props.relationship;
  }

  public get roles(): FamilyContactRole[] {
    return [...this.props.roles];
  }

  public get roleNote(): string | null {
    return this.props.roleNote;
  }

  public get phone(): string | null {
    return this.props.phone;
  }

  public get email(): string | null {
    return this.props.email;
  }

  public get address(): string | null {
    return this.props.address;
  }

  public get accessLevel(): FamilyAccessLevel {
    return this.props.accessLevel;
  }

  public get accessScopeLabel(): string | null {
    return this.props.accessScopeLabel;
  }

  public get authorizedSectionsLabel(): string | null {
    return this.props.authorizedSectionsLabel;
  }

  public get preferredMethod(): FamilyPreferredContactMethod | null {
    return this.props.preferredMethod;
  }

  public get portalLoginEnabled(): boolean {
    return this.props.portalLoginEnabled;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
