import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';

interface CarePlanRevisionProps {
  careRecipientId: string;
  description: string;
  /** The admin who made the change, for attribution. Null for system entries. */
  authorAdminId: string | null;
  createdAt: Date;
}

const MAX_DESCRIPTION_LENGTH = 300;

/**
 * One append only entry in a care plan's revision history (for example Evening
 * medication schedule adjusted). Recorded whenever a section of the plan is
 * edited, attributed to the admin who made the change. Immutable once written.
 */
export class CarePlanRevision extends Entity<string> {
  private readonly props: CarePlanRevisionProps;

  private constructor(id: string, props: CarePlanRevisionProps) {
    super(id);
    this.props = props;
  }

  public static record(params: {
    id: string;
    careRecipientId: string;
    description: string;
    authorAdminId?: string | null;
    now: Date;
  }): CarePlanRevision {
    const description = params.description.trim();
    if (description.length === 0) {
      throw new ValidationException('A revision description is required');
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      throw new ValidationException('A revision description exceeds the maximum length');
    }
    return new CarePlanRevision(params.id, {
      careRecipientId: params.careRecipientId,
      description,
      authorAdminId: params.authorAdminId ?? null,
      createdAt: params.now,
    });
  }

  public static rehydrate(id: string, props: CarePlanRevisionProps): CarePlanRevision {
    return new CarePlanRevision(id, props);
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get description(): string {
    return this.props.description;
  }

  public get authorAdminId(): string | null {
    return this.props.authorAdminId;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
