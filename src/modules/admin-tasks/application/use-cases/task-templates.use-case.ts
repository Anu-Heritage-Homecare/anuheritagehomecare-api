import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { OperationalTask } from '../../domain/operational-task.entity';
import {
  OPERATIONAL_TASK_REPOSITORY,
  OperationalTaskRepository,
} from '../../domain/operational-task.repository';
import { TaskCategory } from '../../domain/task-category.enum';
import { TaskPriority } from '../../domain/task-priority.enum';
import { TaskTemplate } from '../../domain/task-template.entity';
import {
  TASK_TEMPLATE_REPOSITORY,
  TaskTemplateRepository,
} from '../../domain/task-template.repository';
import { TaskResult, toTaskResult } from '../dto/task.result';
import { TaskTemplateResult, toTaskTemplateResult } from '../dto/task-template.result';
import { TASK_CHILD_STORE, TaskChildStore } from '../ports/task-child.store';

export interface CreateTaskTemplateCommand {
  createdByAdminId: string;
  name: string;
  title: string;
  description?: string | null;
  category?: TaskCategory;
  priority?: TaskPriority;
  defaultAssigneeLabel?: string | null;
  checklistItems?: string[];
  scheduleLabel?: string | null;
  estimatedMinutes?: number | null;
}

/** Create a reusable task template. */
@Injectable()
export class CreateTaskTemplateUseCase {
  constructor(
    @Inject(TASK_TEMPLATE_REPOSITORY) private readonly templates: TaskTemplateRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: CreateTaskTemplateCommand): Promise<TaskTemplateResult> {
    const template = TaskTemplate.create({
      id: this.ids.generate(),
      name: command.name,
      title: command.title,
      description: command.description,
      category: command.category,
      priority: command.priority,
      defaultAssigneeLabel: command.defaultAssigneeLabel,
      checklistItems: command.checklistItems,
      scheduleLabel: command.scheduleLabel,
      estimatedMinutes: command.estimatedMinutes,
      createdByAdminId: command.createdByAdminId,
      now: this.clock.now(),
    });
    await this.templates.save(template);
    return toTaskTemplateResult(template);
  }
}

export interface UpdateTaskTemplateCommand {
  templateId: string;
  name?: string;
  title?: string;
  description?: string | null;
  category?: TaskCategory;
  priority?: TaskPriority;
  defaultAssigneeLabel?: string | null;
  checklistItems?: string[];
  scheduleLabel?: string | null;
  estimatedMinutes?: number | null;
}

/** Revise a task template's editable fields. */
@Injectable()
export class UpdateTaskTemplateUseCase {
  constructor(
    @Inject(TASK_TEMPLATE_REPOSITORY) private readonly templates: TaskTemplateRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateTaskTemplateCommand): Promise<TaskTemplateResult> {
    const template = await this.templates.findById(command.templateId);
    if (template === null) {
      throw new NotFoundDomainException('Task template not found');
    }
    const { templateId: _id, ...fields } = command;
    template.edit(fields, this.clock.now());
    await this.templates.save(template);
    return toTaskTemplateResult(template);
  }
}

/** Activate or deactivate a task template. */
@Injectable()
export class SetTaskTemplateActiveUseCase {
  constructor(
    @Inject(TASK_TEMPLATE_REPOSITORY) private readonly templates: TaskTemplateRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(templateId: string, active: boolean): Promise<TaskTemplateResult> {
    const template = await this.templates.findById(templateId);
    if (template === null) {
      throw new NotFoundDomainException('Task template not found');
    }
    template.setActive(active, this.clock.now());
    await this.templates.save(template);
    return toTaskTemplateResult(template);
  }
}

/** Duplicate a template into a fresh active copy ("<name> (Copy)"). */
@Injectable()
export class DuplicateTaskTemplateUseCase {
  constructor(
    @Inject(TASK_TEMPLATE_REPOSITORY) private readonly templates: TaskTemplateRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(templateId: string, createdByAdminId: string): Promise<TaskTemplateResult> {
    const source = await this.templates.findById(templateId);
    if (source === null) {
      throw new NotFoundDomainException('Task template not found');
    }
    const copy = TaskTemplate.create({
      id: this.ids.generate(),
      name: `${source.name} (Copy)`.slice(0, 160),
      title: source.title,
      description: source.description,
      category: source.category,
      priority: source.priority,
      defaultAssigneeLabel: source.defaultAssigneeLabel,
      checklistItems: source.checklistItems,
      scheduleLabel: source.scheduleLabel,
      estimatedMinutes: source.estimatedMinutes,
      createdByAdminId,
      now: this.clock.now(),
    });
    await this.templates.save(copy);
    return toTaskTemplateResult(copy);
  }
}

/** Delete a task template. */
@Injectable()
export class DeleteTaskTemplateUseCase {
  constructor(
    @Inject(TASK_TEMPLATE_REPOSITORY) private readonly templates: TaskTemplateRepository,
  ) {}

  async execute(templateId: string): Promise<void> {
    await this.templates.delete(templateId);
  }
}

export interface InstantiateTemplateCommand {
  templateId: string;
  createdByAdminId: string;
  dueAt?: Date | null;
  assignedToAdminId?: string | null;
  assigneeLabel?: string | null;
  relatedCareRecipientId?: string | null;
  relatedVisitId?: string | null;
}

/** Create a fresh operational task pre-filled from a template. */
@Injectable()
export class InstantiateTaskTemplateUseCase {
  constructor(
    @Inject(TASK_TEMPLATE_REPOSITORY) private readonly templates: TaskTemplateRepository,
    @Inject(OPERATIONAL_TASK_REPOSITORY) private readonly tasks: OperationalTaskRepository,
    @Inject(TASK_CHILD_STORE) private readonly childStore: TaskChildStore,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: InstantiateTemplateCommand): Promise<TaskResult> {
    const template = await this.templates.findById(command.templateId);
    if (template === null) {
      throw new NotFoundDomainException('Task template not found');
    }
    const now = this.clock.now();
    const task = OperationalTask.create({
      id: this.ids.generate(),
      title: template.title,
      description: template.description,
      priority: template.priority,
      category: template.category,
      assignedToAdminId: command.assignedToAdminId,
      assigneeLabel: command.assigneeLabel ?? template.defaultAssigneeLabel,
      createdByAdminId: command.createdByAdminId,
      relatedCareRecipientId: command.relatedCareRecipientId,
      relatedVisitId: command.relatedVisitId,
      dueAt: command.dueAt,
      recurrenceLabel: template.scheduleLabel,
      estimatedMinutes: template.estimatedMinutes,
      now,
    });
    await this.tasks.save(task);

    if (template.checklistItems.length > 0) {
      await this.childStore.createChecklistItems(task.id, template.checklistItems, now);
    }
    return toTaskResult(task);
  }
}
