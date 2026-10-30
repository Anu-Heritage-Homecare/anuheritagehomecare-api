import { TaskStatus } from './task-status.enum';
import { OperationalTask } from './operational-task.entity';

/** Persistence port for operational tasks. */
export interface OperationalTaskRepository {
  save(task: OperationalTask): Promise<void>;
  /** Delete a task (its checklist and comments cascade in the database). */
  delete(id: string): Promise<void>;
  findById(id: string): Promise<OperationalTask | null>;
  /** Load several tasks by id, for bulk operations. */
  findByIds(ids: string[]): Promise<OperationalTask[]>;
  /** Tasks, most recent first, optionally filtered by status, capped at `limit`. */
  list(statusFilter: TaskStatus | null, limit: number): Promise<OperationalTask[]>;
  /** Count of tasks that are not done (OPEN plus IN_PROGRESS), for the dashboard. */
  countOpen(): Promise<number>;
}

export const OPERATIONAL_TASK_REPOSITORY = Symbol('OPERATIONAL_TASK_REPOSITORY');
