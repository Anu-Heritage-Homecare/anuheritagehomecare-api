export interface TaskChecklistItemRead {
  id: string;
  label: string;
  done: boolean;
  completedAt: Date | null;
}

export interface TaskCommentRead {
  id: string;
  authorAdminId: string | null;
  authorName: string | null;
  body: string;
  createdAt: Date;
}

export interface RelatedVisitRead {
  id: string;
  sequence: number;
  visitType: string;
  scheduledDate: Date;
  startMinute: number;
  endMinute: number;
  status: string;
  caregiverName: string | null;
  recipientName: string | null;
  location: string | null;
}

export interface RelatedTaskRead {
  id: string;
  title: string;
  status: string;
  dueAt: Date | null;
}

/** The task detail screen's data, hydrated with names, visit, checklist and comments. */
export interface TaskDetailRead {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string;
  assignedToAdminId: string | null;
  assigneeName: string | null;
  assigneeLabel: string | null;
  createdByName: string | null;
  relatedCareRecipientId: string | null;
  recipientName: string | null;
  recurrenceLabel: string | null;
  estimatedMinutes: number | null;
  dueAt: Date | null;
  startedAt: Date | null;
  assignedAt: Date | null;
  createdAt: Date;
  completedAt: Date | null;
  checklist: TaskChecklistItemRead[];
  comments: TaskCommentRead[];
  relatedVisit: RelatedVisitRead | null;
  relatedTasks: RelatedTaskRead[];
}

/**
 * Read model for the task detail screen. Loads the task and composes the related
 * visit, recipient, assignee and creator names, checklist, comments and a few
 * related tasks, querying the other contexts' tables directly (the established
 * read model pattern). Returns null when the task does not exist.
 */
export interface TaskDetailReadModel {
  load(taskId: string): Promise<TaskDetailRead | null>;
}

export const TASK_DETAIL_READ_MODEL = Symbol('TASK_DETAIL_READ_MODEL');
