import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { TaskCategory } from './task-category.enum';
import { TaskPriority } from './task-priority.enum';
import { TaskStatus } from './task-status.enum';

const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_ASSIGNEE_LABEL_LENGTH = 160;

interface OperationalTaskProps {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  assignedToAdminId: string | null;
  assigneeLabel: string | null;
  createdByAdminId: string | null;
  relatedCareRecipientId: string | null;
  relatedVisitId: string | null;
  dueAt: Date | null;
  recurrenceLabel: string | null;
  estimatedMinutes: number | null;
  startedAt: Date | null;
  assignedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

const MAX_RECURRENCE_LABEL_LENGTH = 80;

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
    category?: TaskCategory;
    assignedToAdminId?: string | null;
    assigneeLabel?: string | null;
    createdByAdminId?: string | null;
    relatedCareRecipientId?: string | null;
    relatedVisitId?: string | null;
    dueAt?: Date | null;
    recurrenceLabel?: string | null;
    estimatedMinutes?: number | null;
    now: Date;
  }): OperationalTask {
    const assignedToAdminId = params.assignedToAdminId ?? null;
    const assigneeLabel = OperationalTask.cleanLabel(params.assigneeLabel);
    const assigned = assignedToAdminId !== null || assigneeLabel !== null;
    return new OperationalTask(params.id, {
      title: OperationalTask.cleanTitle(params.title),
      description: OperationalTask.cleanDescription(params.description),
      status: TaskStatus.Open,
      priority: params.priority ?? TaskPriority.Medium,
      category: params.category ?? TaskCategory.Other,
      assignedToAdminId,
      assigneeLabel,
      createdByAdminId: params.createdByAdminId ?? null,
      relatedCareRecipientId: params.relatedCareRecipientId ?? null,
      relatedVisitId: params.relatedVisitId ?? null,
      dueAt: params.dueAt ?? null,
      recurrenceLabel: OperationalTask.cleanRecurrence(params.recurrenceLabel),
      estimatedMinutes: OperationalTask.cleanEstimate(params.estimatedMinutes),
      startedAt: null,
      assignedAt: assigned ? params.now : null,
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
    this.props.startedAt = now;
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

  /** Assign (or clear) the coordinator or team responsible for the task. */
  public assignTo(adminId: string | null, label: string | null, now: Date): void {
    this.props.assignedToAdminId = adminId;
    this.props.assigneeLabel = OperationalTask.cleanLabel(label);
    this.props.assignedAt = now;
    this.props.updatedAt = now;
  }

  /** Revise the task's editable fields (only the provided ones change). */
  public edit(
    fields: {
      title?: string;
      description?: string | null;
      priority?: TaskPriority;
      category?: TaskCategory;
      assignedToAdminId?: string | null;
      assigneeLabel?: string | null;
      relatedCareRecipientId?: string | null;
      relatedVisitId?: string | null;
      dueAt?: Date | null;
      recurrenceLabel?: string | null;
      estimatedMinutes?: number | null;
    },
    now: Date,
  ): void {
    if (fields.title !== undefined) {
      this.props.title = OperationalTask.cleanTitle(fields.title);
    }
    if (fields.description !== undefined) {
      this.props.description = OperationalTask.cleanDescription(fields.description);
    }
    if (fields.priority !== undefined) {
      this.props.priority = fields.priority;
    }
    if (fields.category !== undefined) {
      this.props.category = fields.category;
    }
    if (fields.assignedToAdminId !== undefined) {
      this.props.assignedToAdminId = fields.assignedToAdminId;
    }
    if (fields.assigneeLabel !== undefined) {
      this.props.assigneeLabel = OperationalTask.cleanLabel(fields.assigneeLabel);
    }
    if (fields.relatedCareRecipientId !== undefined) {
      this.props.relatedCareRecipientId = fields.relatedCareRecipientId;
    }
    if (fields.relatedVisitId !== undefined) {
      this.props.relatedVisitId = fields.relatedVisitId;
    }
    if (fields.dueAt !== undefined) {
      this.props.dueAt = fields.dueAt;
    }
    if (fields.recurrenceLabel !== undefined) {
      this.props.recurrenceLabel = OperationalTask.cleanRecurrence(fields.recurrenceLabel);
    }
    if (fields.estimatedMinutes !== undefined) {
      this.props.estimatedMinutes = OperationalTask.cleanEstimate(fields.estimatedMinutes);
    }
    if (fields.assignedToAdminId !== undefined || fields.assigneeLabel !== undefined) {
      this.props.assignedAt = now;
    }
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

  private static cleanLabel(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed.slice(0, MAX_ASSIGNEE_LABEL_LENGTH);
  }

  private static cleanRecurrence(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed.slice(0, MAX_RECURRENCE_LABEL_LENGTH);
  }

  private static cleanEstimate(value: number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (!Number.isInteger(value) || value <= 0) {
      throw new ValidationException('Estimated minutes must be a positive whole number');
    }
    return value;
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

  public get category(): TaskCategory {
    return this.props.category;
  }

  public get assignedToAdminId(): string | null {
    return this.props.assignedToAdminId;
  }

  public get assigneeLabel(): string | null {
    return this.props.assigneeLabel;
  }

  public get createdByAdminId(): string | null {
    return this.props.createdByAdminId;
  }

  public get relatedCareRecipientId(): string | null {
    return this.props.relatedCareRecipientId;
  }

  public get relatedVisitId(): string | null {
    return this.props.relatedVisitId;
  }

  public get dueAt(): Date | null {
    return this.props.dueAt;
  }

  public get recurrenceLabel(): string | null {
    return this.props.recurrenceLabel;
  }

  public get estimatedMinutes(): number | null {
    return this.props.estimatedMinutes;
  }

  public get startedAt(): Date | null {
    return this.props.startedAt;
  }

  public get assignedAt(): Date | null {
    return this.props.assignedAt;
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
