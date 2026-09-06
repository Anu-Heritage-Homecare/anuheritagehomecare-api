import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { TaskPriority } from './task-priority.enum';
import { TaskStatus } from './task-status.enum';

const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 1000;

interface OperationalTaskProps {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToAdminId: string | null;
  createdByAdminId: string | null;
  relatedCareRecipientId: string | null;
  dueAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

/**
 * OperationalTask aggregate root: a unit of back office work (follow up a
 * complaint, chase a document, arrange cover). Coordinators create tasks, move
 * them through their lifecycle and complete them. The dashboard counts the ones
 * that are not done as Open Tasks.
 */
export class OperationalTask extends AggregateRoot<string> {
  private props: OperationalTaskProps;

  private constructor(id: string, props: OperationalTaskProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    title: string;
    description?: string | null;
    priority?: TaskPriority;
    assignedToAdminId?: string | null;
    createdByAdminId?: string | null;
    relatedCareRecipientId?: string | null;
    dueAt?: Date | null;
    now: Date;
  }): OperationalTask {
    return new OperationalTask(params.id, {
      title: OperationalTask.cleanTitle(params.title),
      description: OperationalTask.cleanDescription(params.description),
      status: TaskStatus.Open,
      priority: params.priority ?? TaskPriority.Medium,
      assignedToAdminId: params.assignedToAdminId ?? null,
      createdByAdminId: params.createdByAdminId ?? null,
      relatedCareRecipientId: params.relatedCareRecipientId ?? null,
      dueAt: params.dueAt ?? null,
      createdAt: params.now,
      updatedAt: params.now,
      completedAt: null,
    });
  }

  public static rehydrate(id: string, props: OperationalTaskProps): OperationalTask {
    return new OperationalTask(id, props);
  }

  /** Move an open task to in progress. */
  public start(now: Date): void {
    if (this.props.status !== TaskStatus.Open) {
      throw new ValidationException('Only an open task can be started');
    }
    this.props.status = TaskStatus.InProgress;
    this.props.updatedAt = now;
  }

  /** Complete a task that is not already done. */
  public complete(now: Date): void {
    if (this.props.status === TaskStatus.Done) {
      throw new ValidationException('This task is already done');
    }
    this.props.status = TaskStatus.Done;
    this.props.completedAt = now;
    this.props.updatedAt = now;
  }

  /** Assign (or clear) the coordinator responsible for the task. */
  public assignTo(adminId: string | null, now: Date): void {
    this.props.assignedToAdminId = adminId;
    this.props.updatedAt = now;
  }

  /** Whether the task still counts as open work (not done). */
  public get isOpen(): boolean {
    return this.props.status !== TaskStatus.Done;
  }

  private static cleanTitle(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationException('Title is required');
    }
    if (trimmed.length > MAX_TITLE_LENGTH) {
      throw new ValidationException('Title exceeds the maximum length');
    }
    return trimmed;
  }

  private static cleanDescription(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
      throw new ValidationException('Description exceeds the maximum length');
    }
    return trimmed;
  }

  public get title(): string {
    return this.props.title;
  }

  public get description(): string | null {
    return this.props.description;
  }

  public get status(): TaskStatus {
    return this.props.status;
  }

  public get priority(): TaskPriority {
    return this.props.priority;
  }

  public get assignedToAdminId(): string | null {
    return this.props.assignedToAdminId;
  }

  public get createdByAdminId(): string | null {
    return this.props.createdByAdminId;
  }

  public get relatedCareRecipientId(): string | null {
    return this.props.relatedCareRecipientId;
  }

  public get dueAt(): Date | null {
    return this.props.dueAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public get completedAt(): Date | null {
    return this.props.completedAt;
  }
}
