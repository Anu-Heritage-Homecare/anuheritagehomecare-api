import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { CaregiverEmploymentType } from './caregiver-employment-type.enum';
import { CaregiverStatus } from './caregiver-status.enum';

/** One free text note on a caregiver. */
export interface CaregiverNote {
  body: string;
  authorAdminId: string | null;
  authorName: string | null;
  createdAt: Date;
}

interface CaregiverProfileProps {
  userId: string;
  title: string | null;
  branch: string | null;
  employmentType: CaregiverEmploymentType | null;
  experienceYears: number | null;
  joinedAt: Date | null;
  status: CaregiverStatus;
  skills: string[];
  languages: string[];
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const MAX_NOTE = 2000;

export interface CaregiverProfileFields {
  title?: string | null;
  branch?: string | null;
  employmentType?: CaregiverEmploymentType | null;
  experienceYears?: number | null;
  joinedAt?: Date | null;
}

export interface EmergencyContact {
  name: string | null;
  phone: string | null;
  relationship: string | null;
}

/**
 * The admin operational profile for one caregiver, keyed to the caregiver's identity
 * user. Holds the admin managed employment details, skills, languages, emergency
 * contact and notes; the personal details (name, phone, email, address, date of
 * birth) are read live from the user, never duplicated. Reference renders as
 * CG-{sequence}.
 */
export class CaregiverProfile extends AggregateRoot<string> {
  private props: CaregiverProfileProps;
  private readonly notes: CaregiverNote[];
  private readonly pendingNotes: CaregiverNote[] = [];

  private constructor(id: string, props: CaregiverProfileProps, notes: CaregiverNote[]) {
    super(id);
    this.props = props;
    this.notes = notes;
  }

  public static create(params: {
    id: string;
    userId: string;
    fields?: CaregiverProfileFields;
    now: Date;
  }): CaregiverProfile {
    const fields = params.fields ?? {};
    return new CaregiverProfile(
      params.id,
      {
        userId: requireId(params.userId, 'A caregiver user is required'),
        title: cleanOptional(fields.title),
        branch: cleanOptional(fields.branch),
        employmentType: fields.employmentType ?? null,
        experienceYears: assertYears(fields.experienceYears ?? null),
        joinedAt: fields.joinedAt ?? null,
        status: CaregiverStatus.Active,
        skills: [],
        languages: [],
        emergencyContactName: null,
        emergencyContactPhone: null,
        emergencyContactRelationship: null,
        createdAt: params.now,
        updatedAt: params.now,
      },
      [],
    );
  }

  public static rehydrate(
    id: string,
    props: CaregiverProfileProps,
    notes: CaregiverNote[],
  ): CaregiverProfile {
    return new CaregiverProfile(id, props, notes);
  }

  public reviseProfile(fields: CaregiverProfileFields, now: Date): void {
    if (fields.title !== undefined) {
      this.props.title = cleanOptional(fields.title);
    }
    if (fields.branch !== undefined) {
      this.props.branch = cleanOptional(fields.branch);
    }
    if (fields.employmentType !== undefined) {
      this.props.employmentType = fields.employmentType;
    }
    if (fields.experienceYears !== undefined) {
      this.props.experienceYears = assertYears(fields.experienceYears);
    }
    if (fields.joinedAt !== undefined) {
      this.props.joinedAt = fields.joinedAt;
    }
    this.props.updatedAt = now;
  }

  public setSkills(skills: string[], now: Date): void {
    this.props.skills = dedupeTrimmed(skills);
    this.props.updatedAt = now;
  }

  public setLanguages(languages: string[], now: Date): void {
    this.props.languages = dedupeTrimmed(languages);
    this.props.updatedAt = now;
  }

  public setEmergencyContact(contact: EmergencyContact, now: Date): void {
    this.props.emergencyContactName = cleanOptional(contact.name);
    this.props.emergencyContactPhone = cleanOptional(contact.phone);
    this.props.emergencyContactRelationship = cleanOptional(contact.relationship);
    this.props.updatedAt = now;
  }

  public setStatus(status: CaregiverStatus, now: Date): void {
    this.props.status = status;
    this.props.updatedAt = now;
  }

  public addNote(body: string, authorAdminId: string, authorName: string | null, now: Date): void {
    const clean = body.trim();
    if (clean.length === 0 || clean.length > MAX_NOTE) {
      throw new ValidationException('A note must be within the length limit');
    }
    const note: CaregiverNote = { body: clean, authorAdminId, authorName, createdAt: now };
    this.notes.push(note);
    this.pendingNotes.push(note);
    this.props.updatedAt = now;
  }

  public pullPendingNotes(): CaregiverNote[] {
    const notes = [...this.pendingNotes];
    this.pendingNotes.length = 0;
    return notes;
  }

  public get userId(): string {
    return this.props.userId;
  }

  public get title(): string | null {
    return this.props.title;
  }

  public get branch(): string | null {
    return this.props.branch;
  }

  public get employmentType(): CaregiverEmploymentType | null {
    return this.props.employmentType;
  }

  public get experienceYears(): number | null {
    return this.props.experienceYears;
  }

  public get joinedAt(): Date | null {
    return this.props.joinedAt;
  }

  public get status(): CaregiverStatus {
    return this.props.status;
  }

  public get skills(): string[] {
    return [...this.props.skills];
  }

  public get languages(): string[] {
    return [...this.props.languages];
  }

  public get emergencyContact(): EmergencyContact {
    return {
      name: this.props.emergencyContactName,
      phone: this.props.emergencyContactPhone,
      relationship: this.props.emergencyContactRelationship,
    };
  }

  public get noteLog(): CaregiverNote[] {
    return [...this.notes];
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

function assertYears(value: number | null): number | null {
  if (value === null) {
    return null;
  }
  if (!Number.isInteger(value) || value < 0 || value > 80) {
    throw new ValidationException('Experience years is out of range');
  }
  return value;
}

function cleanOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function dedupeTrimmed(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}
