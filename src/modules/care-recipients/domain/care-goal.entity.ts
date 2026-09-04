import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';

interface CareGoalProps {
  careRecipientId: string;
  label: string;
  achieved: boolean;
  position: number;
}

const MAX_LABEL_LENGTH = 200;

/**
 * One office set goal on a care recipient's plan (for example Maintain
 * independence). The label is required and bounded; whether it has been achieved
 * is a simple flag surfaced with a tick on the family care plan.
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
    achieved: boolean;
    position: number;
  }): CareGoal {
    const label = params.label.trim();
    if (label.length === 0) {
      throw new ValidationException('A care goal label is required');
    }
    if (label.length > MAX_LABEL_LENGTH) {
      throw new ValidationException('A care goal label exceeds the maximum length');
    }
    return new CareGoal(params.id, {
      careRecipientId: params.careRecipientId,
      label,
      achieved: params.achieved,
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

  public get position(): number {
    return this.props.position;
  }
}
