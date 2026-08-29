import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';

interface VisitTaskProps {
  label: string;
  completed: boolean;
  completedAt: Date | null;
  durationMinutes: number | null;
}

const MAX_LABEL_LENGTH = 200;
// A single task cannot sensibly take longer than a full day.
const MAX_DURATION_MINUTES = 24 * 60;

/**
 * A single item on a visit checklist (for example Blood Pressure, Meal
 * Preparation). The label is free text captured when the visit is planned; the
 * completed flag reflects whether the caregiver has carried it out, and
 * `completedAt` records when, so an activity feed can place it on a timeline.
 * `durationMinutes` optionally records how long the task took. An incomplete task
 * never carries a completion time or a duration.
 */
export class VisitTask extends ValueObject<VisitTaskProps> {
  private constructor(props: VisitTaskProps) {
    super(props);
  }

  public static create(
    label: string,
    completed = false,
    completedAt: Date | null = null,
    durationMinutes: number | null = null,
  ): VisitTask {
    const cleaned = label.trim();
    if (cleaned.length === 0) {
      throw new ValidationException('A visit task must have a label');
    }
    if (cleaned.length > MAX_LABEL_LENGTH) {
      throw new ValidationException('A visit task label exceeds the maximum length');
    }
    const duration = VisitTask.cleanDuration(durationMinutes);
    return new VisitTask({
      label: cleaned,
      completed,
      completedAt: completed ? completedAt : null,
      durationMinutes: completed ? duration : null,
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

  public get label(): string {
    return this.props.label;
  }

  public get completed(): boolean {
    return this.props.completed;
  }

  public get completedAt(): Date | null {
    return this.props.completedAt;
  }

  /** How long the task took in whole minutes, or null when not recorded. */
  public get durationMinutes(): number | null {
    return this.props.durationMinutes;
  }
}
