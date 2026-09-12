import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';

interface CarePlanScheduleBlockProps {
  careRecipientId: string;
  startMinute: number;
  title: string;
  description: string;
  position: number;
}

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 500;
const MINUTES_IN_DAY = 24 * 60;

/**
 * One block of a care recipient's daily care schedule (for example 07:00
 * Wake up and Morning Hygiene). The time is minutes from midnight, timezone free.
 * Office set and replaced wholesale when the schedule is edited.
 */
export class CarePlanScheduleBlock extends Entity<string> {
  private readonly props: CarePlanScheduleBlockProps;

  private constructor(id: string, props: CarePlanScheduleBlockProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    careRecipientId: string;
    startMinute: number;
    title: string;
    description: string;
    position: number;
  }): CarePlanScheduleBlock {
    if (
      !Number.isInteger(params.startMinute) ||
      params.startMinute < 0 ||
      params.startMinute >= MINUTES_IN_DAY
    ) {
      throw new ValidationException('The block time must be minutes from midnight (0 to 1439)');
    }
    const title = params.title.trim();
    if (title.length === 0) {
      throw new ValidationException('A schedule block title is required');
    }
    if (title.length > MAX_TITLE_LENGTH) {
      throw new ValidationException('A schedule block title exceeds the maximum length');
    }
    const description = params.description.trim();
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      throw new ValidationException('A schedule block description exceeds the maximum length');
    }
    return new CarePlanScheduleBlock(params.id, {
      careRecipientId: params.careRecipientId,
      startMinute: params.startMinute,
      title,
      description,
      position: params.position,
    });
  }

  public static rehydrate(id: string, props: CarePlanScheduleBlockProps): CarePlanScheduleBlock {
    return new CarePlanScheduleBlock(id, props);
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get startMinute(): number {
    return this.props.startMinute;
  }

  public get title(): string {
    return this.props.title;
  }

  public get description(): string {
    return this.props.description;
  }

  public get position(): number {
    return this.props.position;
  }
}
