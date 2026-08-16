import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { Coordinates } from '@shared/domain/coordinates.vo';
import { OutsideGeofenceException, ValidationException } from '@shared/domain/domain-exception';
import { VisitStatus } from './visit-status.enum';
import { VisitTask } from './value-objects/visit-task.vo';
import { VisitWindow } from './value-objects/visit-window.vo';

interface VisitProps {
  caregiverId: string;
  careRecipientId: string;
  scheduledDate: Date;
  window: VisitWindow;
  status: VisitStatus;
  tasks: VisitTask[];
  specialInstructions: string[];
  clockInAt: Date | null;
  clockOutAt: Date | null;
  arrivalLocation: Coordinates | null;
  createdAt: Date;
  updatedAt: Date;
}

const MAX_INSTRUCTION_LENGTH = 300;
const MAX_INSTRUCTIONS = 50;

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
    if (this.props.status !== VisitStatus.InProgress) {
      throw new ValidationException('You must clock in before clocking out');
    }
    this.props.status = VisitStatus.Completed;
    this.props.clockOutAt = now;
    this.props.updatedAt = now;
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
