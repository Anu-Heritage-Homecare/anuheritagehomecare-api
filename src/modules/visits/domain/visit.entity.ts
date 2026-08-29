import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { Coordinates } from '@shared/domain/coordinates.vo';
import { OutsideGeofenceException, ValidationException } from '@shared/domain/domain-exception';
import { MedicationAdministrationOutcome } from './medication-administration-outcome.enum';
import { NoteAudience } from './note-audience.enum';
import { VisitStatus } from './visit-status.enum';
import { MedicationAdministration } from './value-objects/medication-administration.vo';
import { VisitBreak } from './value-objects/visit-break.vo';
import { VisitNote } from './value-objects/visit-note.vo';
import { VisitTask } from './value-objects/visit-task.vo';
import { VisitWindow } from './value-objects/visit-window.vo';
import { VisitObservation } from './value-objects/visit-observation.vo';
import { VitalsReading } from './value-objects/vitals-reading.vo';

interface VisitProps {
  caregiverId: string;
  careRecipientId: string;
  scheduledDate: Date;
  window: VisitWindow;
  status: VisitStatus;
  tasks: VisitTask[];
  specialInstructions: string[];
  medicationAdministrations: MedicationAdministration[];
  vitals: VitalsReading[];
  breaks: VisitBreak[];
  notes: VisitNote[];
  photoKeys: string[];
  observation: VisitObservation;
  clockInAt: Date | null;
  clockOutAt: Date | null;
  arrivalLocation: Coordinates | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A snapshot of which parts of the visit record the caregiver has filled in,
 * surfaced on the pre completion review screen. It reports state, it does not
 * gate completion: a caregiver may still end a visit with optional items unfilled.
 */
export interface VisitCompletionChecklist {
  tasksTotal: number;
  tasksCompleted: number;
  allTasksCompleted: boolean;
  medicationGiven: boolean;
  vitalsRecorded: boolean;
  notesAdded: boolean;
  familyNoteAdded: boolean;
  photosUploaded: boolean;
}

/** Text of a note plus who it is for, as the caregiver adds it to the feed. */
export interface AddNoteInput {
  authorId: string;
  audience: NoteAudience;
  text: string;
  now: Date;
}

const MAX_INSTRUCTION_LENGTH = 300;
const MAX_INSTRUCTIONS = 50;
const MAX_PHOTOS = 20;
const MAX_PHOTO_KEY_LENGTH = 500;

/**
 * Visit aggregate root: one scheduled care session for a care recipient, carried
 * out by a caregiver. It owns its checklist of tasks and its special
 * instructions; the recipient's own details (identity, health, address) live in
 * the care recipients context and are read from there, never duplicated here.
 *
 * The factory creates a SCHEDULED visit; the caregiver then moves it through its
 * lifecycle with the geofenced `clockIn` and the completing `clockOut`. All
 * construction goes through factory methods so the aggregate is never in an
 * invalid state.
 */
export class Visit extends AggregateRoot<string> {
  private props: VisitProps;

  private constructor(id: string, props: VisitProps) {
    super(id);
    this.props = props;
  }

  /** Plan a new visit for a caregiver on a given day and time window. */
  public static schedule(params: {
    id: string;
    caregiverId: string;
    careRecipientId: string;
    scheduledDate: Date;
    window: VisitWindow;
    tasks?: VisitTask[];
    specialInstructions?: string[];
    now: Date;
  }): Visit {
    return new Visit(params.id, {
      caregiverId: params.caregiverId,
      careRecipientId: params.careRecipientId,
      scheduledDate: Visit.assertValidDate(params.scheduledDate),
      window: params.window,
      status: VisitStatus.Scheduled,
      tasks: params.tasks ?? [],
      specialInstructions: Visit.cleanInstructions(params.specialInstructions),
      medicationAdministrations: [],
      vitals: [],
      breaks: [],
      notes: [],
      photoKeys: [],
      observation: VisitObservation.empty(),
      clockInAt: null,
      clockOutAt: null,
      arrivalLocation: null,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  /** Rehydrate an existing visit from persistence without emitting events. */
  public static rehydrate(id: string, props: VisitProps): Visit {
    return new Visit(id, props);
  }

  /**
   * Clock in on arrival. The caregiver's current position must fall inside the
   * geofence around the recipient's pinned address, and the visit must not
   * already be under way or finished. On success the visit starts and the server
   * stamps the arrival time and location.
   */
  public clockIn(params: {
    at: Coordinates;
    geofenceCenter: Coordinates;
    radiusMeters: number;
    now: Date;
  }): void {
    if (this.props.status !== VisitStatus.Scheduled) {
      throw new ValidationException('This visit cannot be clocked into');
    }
    if (!params.geofenceCenter.isWithinMeters(params.at, params.radiusMeters)) {
      throw new OutsideGeofenceException();
    }
    this.props.status = VisitStatus.InProgress;
    this.props.clockInAt = params.now;
    this.props.arrivalLocation = params.at;
    this.props.updatedAt = params.now;
  }

  /** Clock out, completing a visit that is under way. */
  public clockOut(now: Date): void {
    if (this.props.status === VisitStatus.OnBreak) {
      throw new ValidationException('End your break before ending the visit');
    }
    if (this.props.status !== VisitStatus.InProgress) {
      throw new ValidationException('You must clock in before clocking out');
    }
    this.props.status = VisitStatus.Completed;
    this.props.clockOutAt = now;
    this.props.updatedAt = now;
  }

  /** Begin a break. The visit must be under way; it moves to ON_BREAK. */
  public startBreak(now: Date): void {
    if (this.props.status !== VisitStatus.InProgress) {
      throw new ValidationException('The visit must be in progress to take a break');
    }
    this.props.breaks = [...this.props.breaks, VisitBreak.open(now)];
    this.props.status = VisitStatus.OnBreak;
    this.props.updatedAt = now;
  }

  /** End the open break, returning the visit to IN_PROGRESS. */
  public endBreak(now: Date): void {
    if (this.props.status !== VisitStatus.OnBreak) {
      throw new ValidationException('The visit is not currently on a break');
    }
    this.props.breaks = this.props.breaks.map((entry) => (entry.isOpen ? entry.close(now) : entry));
    this.props.status = VisitStatus.InProgress;
    this.props.updatedAt = now;
  }

  /**
   * Record what the caregiver did with one scheduled medication. Idempotent per
   * medication: recording the same one again overwrites the previous outcome.
   * The medication id is validated against the recipient's schedule by the use
   * case; the visit only records the reference and the outcome.
   */
  public recordMedication(params: {
    medicationId: string;
    outcome: MedicationAdministrationOutcome;
    note?: string | null;
    now: Date;
  }): MedicationAdministration {
    this.assertInProgress('recording medication');
    const administration = MedicationAdministration.create({
      medicationId: params.medicationId,
      outcome: params.outcome,
      note: params.note,
      recordedAt: params.now,
    });
    this.props.medicationAdministrations = [
      ...this.props.medicationAdministrations.filter(
        (existing) => existing.medicationId !== params.medicationId,
      ),
      administration,
    ];
    this.props.updatedAt = params.now;
    return administration;
  }

  /** Append a set of vital signs recorded during the visit. */
  public recordVitals(reading: VitalsReading, now: Date): void {
    this.assertInProgress('recording vitals');
    this.props.vitals = [...this.props.vitals, reading];
    this.props.updatedAt = now;
  }

  /**
   * Mark a checklist task, identified by its position, complete or not. When
   * completing a task the caregiver may record how long it took in minutes;
   * clearing a task drops any recorded time and duration.
   */
  public setTaskCompletion(
    index: number,
    completed: boolean,
    now: Date,
    durationMinutes: number | null = null,
  ): void {
    this.assertInProgress('updating a task');
    if (!Number.isInteger(index) || index < 0 || index >= this.props.tasks.length) {
      throw new ValidationException('That task does not exist on this visit');
    }
    const current = this.props.tasks[index];
    this.props.tasks = this.props.tasks.map((task, position) =>
      position === index
        ? VisitTask.create(
            current.label,
            completed,
            completed ? now : null,
            completed ? durationMinutes : null,
          )
        : task,
    );
    this.props.updatedAt = now;
  }

  /** Append a note to the visit's notes feed and return it. */
  public addNote(params: AddNoteInput): VisitNote {
    this.assertInProgress('adding a note');
    const note = VisitNote.create({
      authorId: params.authorId,
      audience: params.audience,
      text: params.text,
      createdAt: params.now,
    });
    this.props.notes = [...this.props.notes, note];
    this.props.updatedAt = params.now;
    return note;
  }

  /** Replace the visit's attached photo keys. */
  public savePhotos(params: { photoKeys?: string[]; now: Date }): void {
    this.assertInProgress('saving photos');
    this.props.photoKeys = Visit.cleanPhotoKeys(params.photoKeys);
    this.props.updatedAt = params.now;
  }

  /** Record the caregiver's qualitative observations (replaces the set). */
  public setObservations(observation: VisitObservation, now: Date): void {
    this.assertInProgress('recording observations');
    this.props.observation = observation;
    this.props.updatedAt = now;
  }

  private assertInProgress(action: string): void {
    if (this.props.status !== VisitStatus.InProgress) {
      throw new ValidationException(`The visit must be in progress before ${action}`);
    }
  }

  private static cleanPhotoKeys(raw: string[] | undefined): string[] {
    const keys = raw ?? [];
    if (keys.length > MAX_PHOTOS) {
      throw new ValidationException('Too many photos attached to the visit');
    }
    const cleaned = keys.map((key) => key.trim()).filter((key) => key.length > 0);
    for (const key of cleaned) {
      if (key.length > MAX_PHOTO_KEY_LENGTH) {
        throw new ValidationException('A photo key exceeds the maximum length');
      }
    }
    return cleaned;
  }

  private static assertValidDate(value: Date): Date {
    if (Number.isNaN(value.getTime())) {
      throw new ValidationException('The visit date is not valid');
    }
    return value;
  }

  private static cleanInstructions(raw: string[] | undefined): string[] {
    const items = raw ?? [];
    if (items.length > MAX_INSTRUCTIONS) {
      throw new ValidationException('Too many special instructions');
    }
    const cleaned = items.map((item) => item.trim()).filter((item) => item.length > 0);
    for (const item of cleaned) {
      if (item.length > MAX_INSTRUCTION_LENGTH) {
        throw new ValidationException('A special instruction exceeds the maximum length');
      }
    }
    return cleaned;
  }

  public get caregiverId(): string {
    return this.props.caregiverId;
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get scheduledDate(): Date {
    return this.props.scheduledDate;
  }

  public get window(): VisitWindow {
    return this.props.window;
  }

  public get status(): VisitStatus {
    return this.props.status;
  }

  public get tasks(): VisitTask[] {
    return [...this.props.tasks];
  }

  public get specialInstructions(): string[] {
    return [...this.props.specialInstructions];
  }

  public get medicationAdministrations(): MedicationAdministration[] {
    return [...this.props.medicationAdministrations];
  }

  public get vitals(): VitalsReading[] {
    return [...this.props.vitals];
  }

  public get observation(): VisitObservation {
    return this.props.observation;
  }

  public get notes(): VisitNote[] {
    return [...this.props.notes];
  }

  public get photoKeys(): string[] {
    return [...this.props.photoKeys];
  }

  public get breaks(): VisitBreak[] {
    return [...this.props.breaks];
  }

  /** Total whole seconds spent on closed breaks during the visit. */
  public get breakSeconds(): number {
    return this.props.breaks.reduce((total, entry) => total + entry.durationSeconds, 0);
  }

  /**
   * Whole seconds actively spent on the visit: arrival to departure, less any
   * break time. Null until the visit has both a clock in and a clock out, so it
   * only reads once the visit is completed.
   */
  public get activeSeconds(): number | null {
    if (this.props.clockInAt === null || this.props.clockOutAt === null) {
      return null;
    }
    const elapsed = Math.floor(
      (this.props.clockOutAt.getTime() - this.props.clockInAt.getTime()) / 1000,
    );
    return Math.max(0, elapsed - this.breakSeconds);
  }

  /** Which parts of the visit record are filled in, for the review screen. */
  public get completionChecklist(): VisitCompletionChecklist {
    const tasksTotal = this.props.tasks.length;
    const tasksCompleted = this.props.tasks.filter((task) => task.completed).length;
    return {
      tasksTotal,
      tasksCompleted,
      allTasksCompleted: tasksTotal > 0 && tasksCompleted === tasksTotal,
      medicationGiven: this.props.medicationAdministrations.length > 0,
      vitalsRecorded: this.props.vitals.length > 0,
      notesAdded: this.props.notes.length > 0,
      familyNoteAdded: this.props.notes.some((note) => note.audience === NoteAudience.Family),
      photosUploaded: this.props.photoKeys.length > 0,
    };
  }

  /** When the current open break began, or null if the visit is not on break. */
  public get onBreakSince(): Date | null {
    const open = this.props.breaks.find((entry) => entry.isOpen);
    return open === undefined ? null : open.startedAt;
  }

  public get clockInAt(): Date | null {
    return this.props.clockInAt;
  }

  public get clockOutAt(): Date | null {
    return this.props.clockOutAt;
  }

  public get arrivalLocation(): Coordinates | null {
    return this.props.arrivalLocation;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
