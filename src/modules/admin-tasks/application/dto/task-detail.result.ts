export interface TaskChecklistItemResult {
  id: string;
  label: string;
  done: boolean;
}

export interface TaskProgressResult {
  completed: number;
  total: number;
  percent: number;
}

export interface TaskCommentResult {
  id: string;
  authorName: string;
  body: string;
  at: string;
}

/** A derived lifecycle event for the Activity History panel. */
export interface TaskActivityEntryResult {
  kind: 'CREATED' | 'ASSIGNED' | 'STARTED' | 'COMPLETED';
  label: string;
  at: string;
}

export interface TaskRelatedVisitResult {
  id: string;
  visitLabel: string;
  dateLabel: string;
  timeRange: string;
  statusLabel: string;
  caregiverName: string | null;
  recipientName: string | null;
  location: string | null;
}

export interface TaskRelatedTaskResult {
  id: string;
  title: string;
  statusLabel: string;
  dueDateLabel: string | null;
}

/** Everything the task detail screen renders. */
export interface TaskDetailResult {
  id: string;
  title: string;
  description: string | null;
  status: string;
  statusLabel: string;
  priority: string;
  priorityLabel: string;
  category: string;
  categoryLabel: string;
  assigneeName: string | null;
  recipientName: string | null;
  createdByLabel: string;
  recurrenceLabel: string | null;
  estimatedMinutes: number | null;
  dueAt: string | null;
  dueDateLabel: string | null;
  createdAt: string;
  completedAt: string | null;
  progress: TaskProgressResult;
  checklist: TaskChecklistItemResult[];
  comments: TaskCommentResult[];
  activity: TaskActivityEntryResult[];
  relatedVisit: TaskRelatedVisitResult | null;
  relatedTasks: TaskRelatedTaskResult[];
}
