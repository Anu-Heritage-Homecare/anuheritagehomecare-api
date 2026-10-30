import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';
import { VisitTaskCategory } from './visit-task-category.enum';

interface VisitTaskProps {
  label: string;
  category: VisitTaskCategory;
  completed: boolean;
  completedAt: Date | null;
  startedAt: Date | null;
  durationMinutes: number | null;
  scheduledMinute: number | null;
  note: string | null;
}

const MAX_LABEL_LENGTH = 200;
const MAX_NOTE_LENGTH = 2000;
// A single task cannot sensibly take longer than a full day.
const MAX_DURATION_MINUTES = 24 * 60;
const MINUTES_IN_DAY = 24 * 60;

/**
 * A single item on a visit checklist (for example Blood Pressure, Meal
 * Preparation). The label and category are captured when the visit is planned,
 * along with an optional planned time of day (`scheduledMinute`). As the caregiver
 * works the shift the task moves from pending to started (`startedAt`) to completed
 * (`completed`/`completedAt`), may record how long it took (`durationMinutes`) and a
 * free text `note`. An incomplete task never carries a completion time or duration.
 */
export class VisitTask extends ValueObject<VisitTaskProps> {
  private constructor(props: VisitTaskProps) {
    super(props);
  }

  public static create(params: {
    label: string;
    category?: VisitTaskCategory;
    completed?: boolean;
    completedAt?: Date | null;
    startedAt?: Date | null;
    durationMinutes?: number | null;
    scheduledMinute?: number | null;
    note?: string | null;
  }): VisitTask {
    const cleaned = params.label.trim();
    if (cleaned.length === 0) {
      throw new ValidationException('A visit task must have a label');
    }
    if (cleaned.length > MAX_LABEL_LENGTH) {
      throw new ValidationException('A visit task label exceeds the maximum length');
    }
    const completed = params.completed ?? false;
    const duration = VisitTask.cleanDuration(params.durationMinutes ?? null);
    return new VisitTask({
      label: cleaned,
      category: params.category ?? VisitTaskCategory.General,
      completed,
      completedAt: completed ? (params.completedAt ?? null) : null,
      startedAt: params.startedAt ?? null,
      durationMinutes: completed ? duration : null,
      scheduledMinute: VisitTask.cleanScheduledMinute(params.scheduledMinute ?? null),
      note: VisitTask.cleanNote(params.note ?? null),
    });
  }

  private static cleanDuration(value: number | null): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (!Number.isInteger(value) || value < 0 || value > MAX_DURATION_MINUTES) {
      throw new ValidationException('Task duration must be a whole number of minutes within a day');
    }
    return value;
  }

  private static cleanScheduledMinute(value: number | null): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (!Number.isInteger(value) || value < 0 || value >= MINUTES_IN_DAY) {
      throw new ValidationException('A task scheduled time must be a minute within the day');
    }
    return value;
  }

  private static cleanNote(raw: string | null): string | null {
    if (raw === null || raw === undefined) {
      return null;
    }
    const note = raw.trim();
    if (note.length === 0) {
      return null;
    }
    if (note.length > MAX_NOTE_LENGTH) {
      throw new ValidationException('A task note exceeds the maximum length');
    }
    return note;
  }

  public get label(): string {
    return this.props.label;
  }

  public get category(): VisitTaskCategory {
    return this.props.category;
  }

  public get completed(): boolean {
    return this.props.completed;
  }

  public get completedAt(): Date | null {
    return this.props.completedAt;
  }

  /** When the caregiver started the task, or null while not started. */
  public get startedAt(): Date | null {
    return this.props.startedAt;
  }

  /** How long the task took in whole minutes, or null when not recorded. */
  public get durationMinutes(): number | null {
    return this.props.durationMinutes;
  }

  /** The planned time of day in minutes from midnight, or null. */
  public get scheduledMinute(): number | null {
    return this.props.scheduledMinute;
  }

  /** The caregiver's free text note for this task, or null. */
  public get note(): string | null {
    return this.props.note;
  }
}
