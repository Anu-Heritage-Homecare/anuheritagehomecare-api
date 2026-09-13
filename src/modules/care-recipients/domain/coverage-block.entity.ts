import { Entity } from '@shared/domain/entity.base';
import { CoverageSlot } from './coverage-slot.enum';
import { Weekday } from './weekday.enum';

interface CoverageBlockProps {
  careRecipientId: string;
  weekday: Weekday;
  slot: CoverageSlot;
  /** The caregiver covering this block, or null when the slot is open. */
  caregiverId: string | null;
}

/**
 * One block of a care recipient's recurring weekly coverage grid: a weekday and a
 * slot (morning or afternoon) covered by a caregiver, or left open. Office set and
 * replaced wholesale when the coverage template is edited.
 */
export class CoverageBlock extends Entity<string> {
  private readonly props: CoverageBlockProps;

  private constructor(id: string, props: CoverageBlockProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    careRecipientId: string;
    weekday: Weekday;
    slot: CoverageSlot;
    caregiverId?: string | null;
  }): CoverageBlock {
    const caregiverId =
      params.caregiverId === undefined || params.caregiverId === null
        ? null
        : params.caregiverId.trim() || null;
    return new CoverageBlock(params.id, {
      careRecipientId: params.careRecipientId,
      weekday: params.weekday,
      slot: params.slot,
      caregiverId,
    });
  }

  public static rehydrate(id: string, props: CoverageBlockProps): CoverageBlock {
    return new CoverageBlock(id, props);
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get weekday(): Weekday {
    return this.props.weekday;
  }

  public get slot(): CoverageSlot {
    return this.props.slot;
  }

  public get caregiverId(): string | null {
    return this.props.caregiverId;
  }

  public get isAssigned(): boolean {
    return this.props.caregiverId !== null;
  }
}
