/**
 * Write port for a task's child records: its checklist lines and its comments.
 * Append only plus a single checklist toggle; there are no cross child invariants,
 * so these live outside the OperationalTask aggregate.
 */
export interface TaskChildStore {
  /** Create the checklist lines for a task, in the given order. */
  createChecklistItems(taskId: string, labels: string[], now: Date): Promise<void>;
  /** The task a checklist item belongs to, or null if the item does not exist. */
  findChecklistItemTaskId(itemId: string): Promise<string | null>;
  /** Tick or untick a checklist item (stamps completedAt when ticked). */
  setChecklistItemDone(itemId: string, done: boolean, now: Date): Promise<void>;
  /** Add a comment to a task (authorAdminId null for a system note). */
  addComment(taskId: string, authorAdminId: string | null, body: string, now: Date): Promise<void>;
}

export const TASK_CHILD_STORE = Symbol('TASK_CHILD_STORE');
