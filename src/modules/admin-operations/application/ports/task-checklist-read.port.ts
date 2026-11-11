/**
 * Read port over the existing task templates (owned by the admin-tasks context),
 * surfaced on the Care Operations screen as Standard Task Checklists. This context
 * never writes them; the Task Templates screen remains their editor.
 */
export interface TaskChecklistSummary {
  id: string;
  name: string;
  taskCount: number;
}

export interface TaskChecklistReadPort {
  /** Active task templates, as checklist summaries for the Care Operations screen. */
  listActive(): Promise<TaskChecklistSummary[]>;
}

export const TASK_CHECKLIST_READ_PORT = Symbol('TASK_CHECKLIST_READ_PORT');
