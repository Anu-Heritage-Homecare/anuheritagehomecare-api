export interface TasksKpisResult {
  openTasks: number;
  completedToday: number;
  overdue: number;
  highPriority: number;
  dueToday: number;
  completionRatePercent: number;
}

export interface TasksTabCountsResult {
  all: number;
  today: number;
  overdue: number;
  completed: number;
}

export interface TaskRowResult {
  id: string;
  title: string;
  relatedVisitLabel: string | null;
  assignee: string;
  recipientName: string | null;
  dueAt: string | null;
  dueDateLabel: string | null;
  priority: string;
  priorityLabel: string;
  status: string;
  statusLabel: string;
  category: string;
  categoryLabel: string;
}

export interface TasksScreenResult {
  kpis: TasksKpisResult;
  tabCounts: TasksTabCountsResult;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: TaskRowResult[];
  generatedAt: string;
}
