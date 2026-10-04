import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { CaregiverEmploymentType } from './caregiver-employment-type.enum';
import { CaregiverGender } from './caregiver-gender.enum';
import { CaregiverNoteKind } from './caregiver-note-kind.enum';
import { CaregiverStatus } from './caregiver-status.enum';

/** One free text note on a caregiver. */
export interface CaregiverNote {
  body: string;
  kind: CaregiverNoteKind;
  authorAdminId: string | null;
  authorName: string | null;
  authorRole: string | null;
  createdAt: Date;
}

interface CaregiverProfileProps {
  userId: string;
  title: string | null;
  gender: CaregiverGender | null;
  branch: string | null;
  supervisorName: string | null;
  employmentType: CaregiverEmploymentType | null;
  experienceYears: number | null;
  joinedAt: Date | null;
  status: CaregiverStatus;
  skills: string[];
  languages: string[];
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactEmail: string | null;
  maxHoursPerWeek: number | null;
  preferredShift: string | null;
  preferencesNote: string | null;
  areasForGrowth: string[];
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MAX_NOTE = 2000;
const MAX_PREFERENCES = 4000;
const MAX_HOURS_PER_WEEK = 168;
const MAX_AREAS_FOR_GROWTH = 20;

export interface CaregiverProfileFields {
  title?: string | null;
  gender?: CaregiverGender | null;
  branch?: string | null;
  supervisorName?: string | null;
  employmentType?: CaregiverEmploymentType | null;
  experienceYears?: number | null;
  joinedAt?: Date | null;
  maxHoursPerWeek?: number | null;
  preferredShift?: string | null;
}

export interface EmergencyContact {
  name: string | null;
  phone: string | null;
  relationship: string | null;
  email: string | null;
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
        gender: fields.gender ?? null,
        branch: cleanOptional(fields.branch),
        supervisorName: cleanOptional(fields.supervisorName),
        employmentType: fields.employmentType ?? null,
        experienceYears: assertYears(fields.experienceYears ?? null),
        joinedAt: fields.joinedAt ?? null,
        status: CaregiverStatus.Active,
        skills: [],
        languages: [],
        emergencyContactName: null,
        emergencyContactPhone: null,
        emergencyContactRelationship: null,
        emergencyContactEmail: null,
        maxHoursPerWeek: assertMaxHours(fields.maxHoursPerWeek ?? null),
        preferredShift: cleanOptional(fields.preferredShift),
        preferencesNote: null,
        areasForGrowth: [],
        archivedAt: null,
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
    if (fields.gender !== undefined) {
      this.props.gender = fields.gender;
    }
    if (fields.branch !== undefined) {
      this.props.branch = cleanOptional(fields.branch);
    }
    if (fields.supervisorName !== undefined) {
      this.props.supervisorName = cleanOptional(fields.supervisorName);
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
    if (fields.maxHoursPerWeek !== undefined) {
      this.props.maxHoursPerWeek = assertMaxHours(fields.maxHoursPerWeek);
    }
    if (fields.preferredShift !== undefined) {
      this.props.preferredShift = cleanOptional(fields.preferredShift);
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
    this.props.emergencyContactEmail = cleanOptional(contact.email);
    this.props.updatedAt = now;
  }

  public setStatus(status: CaregiverStatus, now: Date): void {
    this.props.status = status;
    this.props.updatedAt = now;
  }

  public setGender(gender: CaregiverGender | null, now: Date): void {
    this.props.gender = gender;
    this.props.updatedAt = now;
  }

  /** Set (or clear) the free text internal notes and caregiver preferences. */
  public setPreferencesNote(note: string | null, now: Date): void {
    const clean = cleanOptional(note);
    if (clean !== null && clean.length > MAX_PREFERENCES) {
      throw new ValidationException('The preferences note exceeds the maximum length');
    }
    this.props.preferencesNote = clean;
    this.props.updatedAt = now;
  }

  /** Set (or clear) the office flagged coaching areas for growth. */
  public setAreasForGrowth(areas: string[], now: Date): void {
    this.props.areasForGrowth = dedupeTrimmed(areas).slice(0, MAX_AREAS_FOR_GROWTH);
    this.props.updatedAt = now;
  }

  /**
   * Soft archive the profile so it drops out of the directory and detail reads.
   * The identity account, visits, ratings and history are retained; only the
   * admin overlay is retired. Archiving an already archived profile is a no-op.
   */
  public archive(now: Date): void {
    if (this.props.archivedAt !== null) {
      return;
    }
    this.props.archivedAt = now;
    this.props.updatedAt = now;
  }

  public addNote(params: {
    body: string;
    kind: CaregiverNoteKind;
    authorAdminId: string;
    authorName: string | null;
    authorRole: string | null;
    now: Date;
  }): void {
    const clean = params.body.trim();
    if (clean.length === 0 || clean.length > MAX_NOTE) {
      throw new ValidationException('A note must be within the length limit');
    }
    const note: CaregiverNote = {
      body: clean,
      kind: params.kind,
      authorAdminId: params.authorAdminId,
      authorName: params.authorName,
      authorRole: cleanOptional(params.authorRole),
      createdAt: params.now,
    };
    this.notes.push(note);
    this.pendingNotes.push(note);
    this.props.updatedAt = params.now;
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

  public get gender(): CaregiverGender | null {
    return this.props.gender;
  }

  public get branch(): string | null {
    return this.props.branch;
  }

  public get supervisorName(): string | null {
    return this.props.supervisorName;
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
      email: this.props.emergencyContactEmail,
    };
  }

  public get maxHoursPerWeek(): number | null {
    return this.props.maxHoursPerWeek;
  }

  public get preferredShift(): string | null {
    return this.props.preferredShift;
  }

  public get preferencesNote(): string | null {
    return this.props.preferencesNote;
  }

  public get areasForGrowth(): string[] {
    return [...this.props.areasForGrowth];
  }

  public get archivedAt(): Date | null {
    return this.props.archivedAt;
  }

  public get isArchived(): boolean {
    return this.props.archivedAt !== null;
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

function assertMaxHours(value: number | null): number | null {
  if (value === null) {
    return null;
  }
  if (!Number.isInteger(value) || value < 0 || value > MAX_HOURS_PER_WEEK) {
    throw new ValidationException('Maximum hours per week is out of range');
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
