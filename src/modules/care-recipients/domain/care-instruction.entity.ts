import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { CareInstructionCategory, CareInstructionSeverity } from './care-instruction.enums';

interface CareInstructionProps {
  careRecipientId: string;
  category: CareInstructionCategory;
  text: string;
  severity: CareInstructionSeverity;
  position: number;
}

const MAX_TEXT_LENGTH = 300;

/**
 * One care instruction on the plan: a medical need (for example Blood pressure
 * check twice daily) or a behavioral note/protocol (for example Prefers female
 * caregivers). A severity flags how prominently caregivers should see it. Office
 * set and replaced wholesale when the instructions are edited.
 */
export class CareInstruction extends Entity<string> {
  private readonly props: CareInstructionProps;

  private constructor(id: string, props: CareInstructionProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    careRecipientId: string;
    category: CareInstructionCategory;
    text: string;
    severity: CareInstructionSeverity;
    position: number;
  }): CareInstruction {
    const text = params.text.trim();
    if (text.length === 0) {
      throw new ValidationException('A care instruction is required');
    }
    if (text.length > MAX_TEXT_LENGTH) {
      throw new ValidationException('A care instruction exceeds the maximum length');
    }
    return new CareInstruction(params.id, {
      careRecipientId: params.careRecipientId,
      category: params.category,
      text,
      severity: params.severity,
      position: params.position,
    });
  }

  public static rehydrate(id: string, props: CareInstructionProps): CareInstruction {
    return new CareInstruction(id, props);
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get category(): CareInstructionCategory {
    return this.props.category;
  }

  public get text(): string {
    return this.props.text;
  }

  public get severity(): CareInstructionSeverity {
    return this.props.severity;
  }

  public get position(): number {
    return this.props.position;
  }
}
