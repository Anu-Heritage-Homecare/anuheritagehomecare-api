import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';

interface VisitTaskProps {
  label: string;
  completed: boolean;
  completedAt: Date | null;
}

const MAX_LABEL_LENGTH = 200;

/**
 * A single item on a visit checklist (for example Blood Pressure, Meal
 * Preparation). The label is free text captured when the visit is planned; the
 * completed flag reflects whether the caregiver has carried it out, and
 * `completedAt` records when, so an activity feed can place it on a timeline. An
 * incomplete task never carries a completion time.
 */
export class VisitTask extends ValueObject<VisitTaskProps> {
  private constructor(props: VisitTaskProps) {
    super(props);
  }

  public static create(
    label: string,
    completed = false,
    completedAt: Date | null = null,
  ): VisitTask {
    const cleaned = label.trim();
    if (cleaned.length === 0) {
      throw new ValidationException('A visit task must have a label');
    }
    if (cleaned.length > MAX_LABEL_LENGTH) {
      throw new ValidationException('A visit task label exceeds the maximum length');
    }
    return new VisitTask({
      label: cleaned,
      completed,
      completedAt: completed ? completedAt : null,
    });
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
}
