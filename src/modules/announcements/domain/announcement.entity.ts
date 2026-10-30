import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { AnnouncementAudience } from './announcement-audience.enum';
import { AnnouncementPriority } from './announcement-priority.enum';
import { AnnouncementStatus } from './announcement-status.enum';

interface AnnouncementProps {
  title: string;
  body: string;
  audiences: AnnouncementAudience[];
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  authorAdminId: string;
  scheduledFor: Date | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MAX_TITLE = 200;
const MAX_BODY = 8000;

/**
 * A back office broadcast announcement. Created as a DRAFT, it can be scheduled
 * for a future publish, published immediately, or archived. The aggregate guards
 * the lifecycle transitions so it is never in an invalid state.
 */
export class Announcement extends AggregateRoot<string> {
  private props: AnnouncementProps;

  private constructor(id: string, props: AnnouncementProps) {
    super(id);
    this.props = props;
  }

  /** Author a new announcement as a draft. */
  public static create(params: {
    id: string;
    title: string;
    body: string;
    audiences: AnnouncementAudience[];
    priority?: AnnouncementPriority;
    authorAdminId: string;
    now: Date;
  }): Announcement {
    return new Announcement(params.id, {
      title: cleanTitle(params.title),
      body: cleanBody(params.body),
      audiences: cleanAudiences(params.audiences),
      priority: params.priority ?? AnnouncementPriority.Normal,
      status: AnnouncementStatus.Draft,
      authorAdminId: params.authorAdminId,
      scheduledFor: null,
      publishedAt: null,
      archivedAt: null,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: AnnouncementProps): Announcement {
    return new Announcement(id, props);
  }

  /** Schedule a draft for a future publish time. */
  public schedule(scheduledFor: Date, now: Date): void {
    if (this.props.status !== AnnouncementStatus.Draft) {
      throw new ValidationException('Only a draft announcement can be scheduled');
    }
    if (scheduledFor.getTime() <= now.getTime()) {
      throw new ValidationException('The scheduled time must be in the future');
    }
    this.props.status = AnnouncementStatus.Scheduled;
    this.props.scheduledFor = scheduledFor;
    this.props.updatedAt = now;
  }

  /** Publish a draft or scheduled announcement now. */
  public publish(now: Date): void {
    if (
      this.props.status !== AnnouncementStatus.Draft &&
      this.props.status !== AnnouncementStatus.Scheduled
    ) {
      throw new ValidationException('Only a draft or scheduled announcement can be published');
    }
    this.props.status = AnnouncementStatus.Published;
    this.props.publishedAt = now;
    this.props.updatedAt = now;
  }

  /** Archive the announcement (removes it from the active tabs). */
  public archive(now: Date): void {
    if (this.props.status === AnnouncementStatus.Archived) {
      throw new ValidationException('The announcement is already archived');
    }
    this.props.status = AnnouncementStatus.Archived;
    this.props.archivedAt = now;
    this.props.updatedAt = now;
  }

  /** A fresh draft copy of this announcement, authored by the acting admin. */
  public duplicateAsDraft(id: string, authorAdminId: string, now: Date): Announcement {
    return Announcement.create({
      id,
      title: `${this.props.title} (Copy)`.slice(0, MAX_TITLE),
      body: this.props.body,
      audiences: this.props.audiences,
      priority: this.props.priority,
      authorAdminId,
      now,
    });
  }

  public get title(): string {
    return this.props.title;
  }

  public get body(): string {
    return this.props.body;
  }

  public get audiences(): AnnouncementAudience[] {
    return [...this.props.audiences];
  }

  public get priority(): AnnouncementPriority {
    return this.props.priority;
  }

  public get status(): AnnouncementStatus {
    return this.props.status;
  }

  public get authorAdminId(): string {
    return this.props.authorAdminId;
  }

  public get scheduledFor(): Date | null {
    return this.props.scheduledFor;
  }

  public get publishedAt(): Date | null {
    return this.props.publishedAt;
  }

  public get archivedAt(): Date | null {
    return this.props.archivedAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}

function cleanAudiences(audiences: AnnouncementAudience[]): AnnouncementAudience[] {
  const unique = [...new Set(audiences)];
  if (unique.length === 0) {
    throw new ValidationException('At least one target audience is required');
  }
  return unique;
}

function cleanTitle(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ValidationException('An announcement title is required');
  }
  if (trimmed.length > MAX_TITLE) {
    throw new ValidationException(`An announcement title cannot exceed ${MAX_TITLE} characters`);
  }
  return trimmed;
}

function cleanBody(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ValidationException('An announcement body is required');
  }
  if (trimmed.length > MAX_BODY) {
    throw new ValidationException(`An announcement body cannot exceed ${MAX_BODY} characters`);
  }
  return trimmed;
}
