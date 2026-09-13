import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';

interface MedicationWarningProps {
  careRecipientId: string;
  title: string;
  detail: string;
  position: number;
}

const MAX_TITLE_LENGTH = 200;
const MAX_DETAIL_LENGTH = 1000;

/**
 * One office set medication clinical warning for a recipient (a drug interaction
 * or a food instruction). Free text authored by the office; captured as a set and
 * replaced wholesale, ordered by position. This is sensitive clinical data and
 * must never be logged.
 */
export class MedicationWarning extends Entity<string> {
  private readonly props: MedicationWarningProps;

  private constructor(id: string, props: MedicationWarningProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    careRecipientId: string;
    title: string;
    detail: string;
    position: number;
  }): MedicationWarning {
    const title = params.title.trim();
    if (title.length === 0) {
      throw new ValidationException('A medication warning must have a title');
    }
    if (title.length > MAX_TITLE_LENGTH) {
      throw new ValidationException('A medication warning title exceeds the maximum length');
    }
    const detail = params.detail.trim();
    if (detail.length === 0) {
      throw new ValidationException('A medication warning must have detail');
    }
    if (detail.length > MAX_DETAIL_LENGTH) {
      throw new ValidationException('A medication warning detail exceeds the maximum length');
    }
    return new MedicationWarning(params.id, {
      careRecipientId: params.careRecipientId,
      title,
      detail,
      position: params.position,
    });
  }

  public static rehydrate(id: string, props: MedicationWarningProps): MedicationWarning {
    return new MedicationWarning(id, props);
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get title(): string {
    return this.props.title;
  }

  public get detail(): string {
    return this.props.detail;
  }

  public get position(): number {
    return this.props.position;
  }
}
