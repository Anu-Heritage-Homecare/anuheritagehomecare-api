import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { FamilyDirectorySubjectKind } from './family-directory-subject-kind.enum';
import { FamilyMemberStatus } from './family-member-status.enum';

interface FamilyDirectoryEntryProps {
  subjectKind: FamilyDirectorySubjectKind;
  userId: string | null;
  fullName: string;
  phone: string | null;
  email: string | null;
  relationship: string | null;
  primaryRecipientId: string | null;
  status: FamilyMemberStatus;
  quickNotes: string | null;
  emergencyContactVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MAX_NAME = 200;
const MAX_NOTES = 1000;

/**
 * One family member in the admin directory. An account entry links to an identity
 * user (its name, phone and email are composed live from that user); a contact entry
 * captures those details inline. Either way the entry owns the admin managed fields:
 * status, quick notes, the emergency contact verified flag and the primary recipient.
 */
export class FamilyDirectoryEntry extends AggregateRoot<string> {
  private props: FamilyDirectoryEntryProps;

  private constructor(id: string, props: FamilyDirectoryEntryProps) {
    super(id);
    this.props = props;
  }

  public static registerAccount(params: {
    id: string;
    userId: string;
    fullName: string;
    relationship?: string | null;
    primaryRecipientId?: string | null;
    now: Date;
  }): FamilyDirectoryEntry {
    return new FamilyDirectoryEntry(params.id, {
      subjectKind: FamilyDirectorySubjectKind.Account,
      userId: requireId(params.userId, 'A user is required for an account entry'),
      fullName: cleanName(params.fullName),
      phone: null,
      email: null,
      relationship: cleanOptional(params.relationship),
      primaryRecipientId: params.primaryRecipientId ?? null,
      status: FamilyMemberStatus.Active,
      quickNotes: null,
      emergencyContactVerified: false,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static registerContact(params: {
    id: string;
    fullName: string;
    phone?: string | null;
    email?: string | null;
    relationship?: string | null;
    primaryRecipientId?: string | null;
    now: Date;
  }): FamilyDirectoryEntry {
    return new FamilyDirectoryEntry(params.id, {
      subjectKind: FamilyDirectorySubjectKind.Contact,
      userId: null,
      fullName: cleanName(params.fullName),
      phone: cleanOptional(params.phone),
      email: cleanOptional(params.email),
      relationship: cleanOptional(params.relationship),
      primaryRecipientId: params.primaryRecipientId ?? null,
      status: FamilyMemberStatus.PendingVerification,
      quickNotes: null,
      emergencyContactVerified: false,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: FamilyDirectoryEntryProps): FamilyDirectoryEntry {
    return new FamilyDirectoryEntry(id, props);
  }

  public setStatus(status: FamilyMemberStatus, now: Date): void {
    this.props.status = status;
    this.props.updatedAt = now;
  }

  public setQuickNotes(notes: string | null, now: Date): void {
    const clean = cleanOptional(notes);
    if (clean !== null && clean.length > MAX_NOTES) {
      throw new ValidationException('The note exceeds the maximum length');
    }
    this.props.quickNotes = clean;
    this.props.updatedAt = now;
  }

  public setEmergencyContactVerified(verified: boolean, now: Date): void {
    this.props.emergencyContactVerified = verified;
    this.props.updatedAt = now;
  }

  public linkPrimaryRecipient(recipientId: string | null, now: Date): void {
    this.props.primaryRecipientId = recipientId;
    this.props.updatedAt = now;
  }

  /** Revise the captured details of a contact entry (no effect on account fields). */
  public reviseContactDetails(
    fields: {
      fullName?: string;
      phone?: string | null;
      email?: string | null;
      relationship?: string | null;
    },
    now: Date,
  ): void {
    if (fields.fullName !== undefined) {
      this.props.fullName = cleanName(fields.fullName);
    }
    if (fields.phone !== undefined) {
      this.props.phone = cleanOptional(fields.phone);
    }
    if (fields.email !== undefined) {
      this.props.email = cleanOptional(fields.email);
    }
    if (fields.relationship !== undefined) {
      this.props.relationship = cleanOptional(fields.relationship);
    }
    this.props.updatedAt = now;
  }

  public get subjectKind(): FamilyDirectorySubjectKind {
    return this.props.subjectKind;
  }

  public get userId(): string | null {
    return this.props.userId;
  }

  public get fullName(): string {
    return this.props.fullName;
  }

  public get phone(): string | null {
    return this.props.phone;
  }

  public get email(): string | null {
    return this.props.email;
  }

  public get relationship(): string | null {
    return this.props.relationship;
  }

  public get primaryRecipientId(): string | null {
    return this.props.primaryRecipientId;
  }

  public get status(): FamilyMemberStatus {
    return this.props.status;
  }

  public get quickNotes(): string | null {
    return this.props.quickNotes;
  }

  public get emergencyContactVerified(): boolean {
    return this.props.emergencyContactVerified;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}

function requireId(value: string, message: string): string {
  const clean = value.trim();
  if (clean.length === 0) {
    throw new ValidationException(message);
  }
  return clean;
}

function cleanName(raw: string): string {
  const name = raw.trim();
  if (name.length === 0) {
    throw new ValidationException('A name is required');
  }
  if (name.length > MAX_NAME) {
    throw new ValidationException('The name exceeds the maximum length');
  }
  return name;
}

function cleanOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
