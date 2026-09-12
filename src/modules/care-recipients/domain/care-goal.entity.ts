import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { CareGoalStatus } from './care-goal-status.enum';

interface CareGoalProps {
  careRecipientId: string;
  label: string;
  achieved: boolean;
  progressPercent: number;
  status: CareGoalStatus;
  position: number;
}

const MAX_LABEL_LENGTH = 200;

/**
 * One office set goal on a care recipient's plan (for example Maintain
 * independence). The label is required and bounded. Progress is a whole percent
 * (0 to 100) and the status is an office judgement of how the goal is tracking;
 * `achieved` stays true when the status is Achieved, so the family care plan can
 * keep showing a simple tick.
 */
export class CareGoal extends Entity<string> {
  private readonly props: CareGoalProps;

  private constructor(id: string, props: CareGoalProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    careRecipientId: string;
    label: string;
    progressPercent: number;
    status: CareGoalStatus;
    position: number;
  }): CareGoal {
    const label = params.label.trim();
    if (label.length === 0) {
      throw new ValidationException('A care goal label is required');
    }
    if (label.length > MAX_LABEL_LENGTH) {
      throw new ValidationException('A care goal label exceeds the maximum length');
    }
    if (
      !Number.isInteger(params.progressPercent) ||
      params.progressPercent < 0 ||
      params.progressPercent > 100
    ) {
      throw new ValidationException('Goal progress must be a whole percent between 0 and 100');
    }
    return new CareGoal(params.id, {
      careRecipientId: params.careRecipientId,
      label,
      achieved: params.status === CareGoalStatus.Achieved,
      progressPercent: params.progressPercent,
      status: params.status,
      position: params.position,
    });
  }

  public static rehydrate(id: string, props: CareGoalProps): CareGoal {
    return new CareGoal(id, props);
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get label(): string {
    return this.props.label;
  }

  public get achieved(): boolean {
    return this.props.achieved;
  }

  public get progressPercent(): number {
    return this.props.progressPercent;
  }

  public get status(): CareGoalStatus {
    return this.props.status;
  }

  public get position(): number {
    return this.props.position;
  }
}
