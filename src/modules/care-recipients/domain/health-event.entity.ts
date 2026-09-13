import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { HealthEventCategory } from './health-event-category.enum';

interface HealthEventProps {
  careRecipientId: string;
  category: HealthEventCategory;
  title: string;
  description: string;
  /** Who observed or reported the event (free text), or null. */
  recordedByName: string | null;
  /** The reporter's role (free text, for example Caregiver, Geriatrician), or null. */
  recordedByRole: string | null;
  /** When the event happened; may be in the future for a scheduled appointment. */
  occurredAt: Date;
  /** The admin who entered the event, for attribution. Null for system entries. */
  authorAdminId: string | null;
  createdAt: Date;
}

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_NAME_LENGTH = 120;

/**
 * One entry on a care recipient's health timeline: a vitals summary, an alert, a
 * medication change, an incident, an assessment, an appointment or a care note.
 * Immutable once written. This is sensitive clinical data and must never be logged.
 */
export class HealthEvent extends Entity<string> {
  private readonly props: HealthEventProps;

  private constructor(id: string, props: HealthEventProps) {
    super(id);
    this.props = props;
  }

  public static record(params: {
    id: string;
    careRecipientId: string;
    category: HealthEventCategory;
    title: string;
    description: string;
    recordedByName?: string | null;
    recordedByRole?: string | null;
    occurredAt: Date;
    authorAdminId?: string | null;
    now: Date;
  }): HealthEvent {
    const title = params.title.trim();
    if (title.length === 0) {
      throw new ValidationException('A health event must have a title');
    }
    if (title.length > MAX_TITLE_LENGTH) {
      throw new ValidationException('A health event title exceeds the maximum length');
    }
    const description = params.description.trim();
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      throw new ValidationException('A health event description exceeds the maximum length');
    }
    if (Number.isNaN(params.occurredAt.getTime())) {
      throw new ValidationException('The health event date is not valid');
    }
    return new HealthEvent(params.id, {
      careRecipientId: params.careRecipientId,
      category: params.category,
      title,
      description,
      recordedByName: HealthEvent.cleanName(params.recordedByName),
      recordedByRole: HealthEvent.cleanName(params.recordedByRole),
      occurredAt: params.occurredAt,
      authorAdminId: params.authorAdminId ?? null,
      createdAt: params.now,
    });
  }

  public static rehydrate(id: string, props: HealthEventProps): HealthEvent {
    return new HealthEvent(id, props);
  }

  private static cleanName(raw: string | null | undefined): string | null {
    if (raw === null || raw === undefined) {
      return null;
    }
    const value = raw.trim();
    if (value.length === 0) {
      return null;
    }
    if (value.length > MAX_NAME_LENGTH) {
      throw new ValidationException('A health event name exceeds the maximum length');
    }
    return value;
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get category(): HealthEventCategory {
    return this.props.category;
  }

  public get title(): string {
    return this.props.title;
  }

  public get description(): string {
    return this.props.description;
  }

  public get recordedByName(): string | null {
    return this.props.recordedByName;
  }

  public get recordedByRole(): string | null {
    return this.props.recordedByRole;
  }

  public get occurredAt(): Date {
    return this.props.occurredAt;
  }

  public get authorAdminId(): string | null {
    return this.props.authorAdminId;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
