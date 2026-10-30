import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { TaskCategory } from './task-category.enum';
import { TaskPriority } from './task-priority.enum';

const MAX_NAME_LENGTH = 160;
const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_ASSIGNEE_LABEL_LENGTH = 160;
const MAX_SCHEDULE_LABEL_LENGTH = 80;
const MAX_CHECKLIST_LABEL_LENGTH = 200;
const MAX_CHECKLIST_ITEMS = 50;

interface Props {
  name: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  defaultAssigneeLabel: string | null;
  checklistItems: string[];
  scheduleLabel: string | null;
  estimatedMinutes: number | null;
  active: boolean;
  createdByAdminId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A reusable task blueprint; instantiating it creates a pre-filled operational task. */
export class TaskTemplate extends Entity<string> {
  private props: Props;

  private constructor(id: string, props: Props) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    name: string;
    title: string;
    description?: string | null;
    category?: TaskCategory;
    priority?: TaskPriority;
    defaultAssigneeLabel?: string | null;
    checklistItems?: string[];
    scheduleLabel?: string | null;
    estimatedMinutes?: number | null;
    createdByAdminId?: string | null;
    now: Date;
  }): TaskTemplate {
    return new TaskTemplate(params.id, {
      name: TaskTemplate.clean(params.name, MAX_NAME_LENGTH, 'Template name'),
      title: TaskTemplate.clean(params.title, MAX_TITLE_LENGTH, 'Task title'),
      description: TaskTemplate.cleanOptional(params.description, MAX_DESCRIPTION_LENGTH),
      category: params.category ?? TaskCategory.Other,
      priority: params.priority ?? TaskPriority.Medium,
      defaultAssigneeLabel: TaskTemplate.cleanOptional(
        params.defaultAssigneeLabel,
        MAX_ASSIGNEE_LABEL_LENGTH,
      ),
      checklistItems: TaskTemplate.cleanChecklist(params.checklistItems),
      scheduleLabel: TaskTemplate.cleanOptional(params.scheduleLabel, MAX_SCHEDULE_LABEL_LENGTH),
      estimatedMinutes: TaskTemplate.cleanEstimate(params.estimatedMinutes),
      active: true,
      createdByAdminId: params.createdByAdminId ?? null,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: Props): TaskTemplate {
    return new TaskTemplate(id, props);
  }

  /** Revise the template's editable fields (only the provided ones change). */
  public edit(
    fields: {
      name?: string;
      title?: string;
      description?: string | null;
      category?: TaskCategory;
      priority?: TaskPriority;
      defaultAssigneeLabel?: string | null;
      checklistItems?: string[];
      scheduleLabel?: string | null;
      estimatedMinutes?: number | null;
    },
    now: Date,
  ): void {
    if (fields.name !== undefined) {
      this.props.name = TaskTemplate.clean(fields.name, MAX_NAME_LENGTH, 'Template name');
    }
    if (fields.title !== undefined) {
      this.props.title = TaskTemplate.clean(fields.title, MAX_TITLE_LENGTH, 'Task title');
    }
    if (fields.description !== undefined) {
      this.props.description = TaskTemplate.cleanOptional(
        fields.description,
        MAX_DESCRIPTION_LENGTH,
      );
    }
    if (fields.category !== undefined) {
      this.props.category = fields.category;
    }
    if (fields.priority !== undefined) {
      this.props.priority = fields.priority;
    }
    if (fields.defaultAssigneeLabel !== undefined) {
      this.props.defaultAssigneeLabel = TaskTemplate.cleanOptional(
        fields.defaultAssigneeLabel,
        MAX_ASSIGNEE_LABEL_LENGTH,
      );
    }
    if (fields.checklistItems !== undefined) {
      this.props.checklistItems = TaskTemplate.cleanChecklist(fields.checklistItems);
    }
    if (fields.scheduleLabel !== undefined) {
      this.props.scheduleLabel = TaskTemplate.cleanOptional(
        fields.scheduleLabel,
        MAX_SCHEDULE_LABEL_LENGTH,
      );
    }
    if (fields.estimatedMinutes !== undefined) {
      this.props.estimatedMinutes = TaskTemplate.cleanEstimate(fields.estimatedMinutes);
    }
    this.props.updatedAt = now;
  }

  public setActive(active: boolean, now: Date): void {
    this.props.active = active;
    this.props.updatedAt = now;
  }

  private static clean(value: string, max: number, label: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationException(`${label} is required`);
    }
    if (trimmed.length > max) {
      throw new ValidationException(`${label} exceeds the maximum length`);
    }
    return trimmed;
  }

  private static cleanOptional(value: string | null | undefined, max: number): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed.slice(0, max);
  }

  private static cleanChecklist(items: string[] | undefined): string[] {
    if (items === undefined) {
      return [];
    }
    return items
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, MAX_CHECKLIST_ITEMS)
      .map((item) => item.slice(0, MAX_CHECKLIST_LABEL_LENGTH));
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

  public get name(): string {
    return this.props.name;
  }

  public get title(): string {
    return this.props.title;
  }

  public get description(): string | null {
    return this.props.description;
  }

  public get category(): TaskCategory {
    return this.props.category;
  }

  public get priority(): TaskPriority {
    return this.props.priority;
  }

  public get defaultAssigneeLabel(): string | null {
    return this.props.defaultAssigneeLabel;
  }

  public get checklistItems(): string[] {
    return [...this.props.checklistItems];
  }

  public get scheduleLabel(): string | null {
    return this.props.scheduleLabel;
  }

  public get estimatedMinutes(): number | null {
    return this.props.estimatedMinutes;
  }

  public get active(): boolean {
    return this.props.active;
  }

  public get createdByAdminId(): string | null {
    return this.props.createdByAdminId;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
