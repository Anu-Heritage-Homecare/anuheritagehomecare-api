import { TaskTemplate } from './task-template.entity';

/** Persistence port for reusable task templates. */
export interface TaskTemplateRepository {
  save(template: TaskTemplate): Promise<void>;
  findById(id: string): Promise<TaskTemplate | null>;
  /** All templates, most recent first. */
  list(): Promise<TaskTemplate[]>;
  delete(id: string): Promise<void>;
}

export const TASK_TEMPLATE_REPOSITORY = Symbol('TASK_TEMPLATE_REPOSITORY');
