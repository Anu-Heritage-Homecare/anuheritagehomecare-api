export type TasksTab = 'ALL' | 'TODAY' | 'OVERDUE' | 'COMPLETED';

/** Structured filters for the Tasks screen list. */
export interface TasksListFilter {
  now: Date;
  tab: TasksTab;
  search: string | null;
  assignedToAdminId: string | null;
  assigneeLabel: string | null;
  priority: string | null;
  category: string | null;
  status: string | null;
}

/** One task row, hydrated with the resolved assignee, recipient and visit. */
export interface TaskListRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  assignedToAdminId: string | null;
  assigneeLabel: string | null;
  assigneeName: string | null;
  relatedCareRecipientId: string | null;
  recipientName: string | null;
  relatedVisitId: string | null;
  visitSequence: number | null;
  visitType: string | null;
  dueAt: Date | null;
  completedAt: Date | null;
}

export interface TasksKpiCounts {
  openTasks: number;
  completedToday: number;
  overdue: number;
  highPriority: number;
  dueToday: number;
  totalTasks: number;
  completedTotal: number;
}

export interface TasksTabCounts {
  all: number;
  today: number;
  overdue: number;
  completed: number;
}

/**
 * Read model for the Tasks screen. Applies the filters and pagination in the
 * database and returns rows hydrated with the assignee, recipient and related visit;
 * the KPIs and tab counts are aggregate counts. Queries other contexts' tables
 * directly for the enrichment (the established read model pattern).
 */
export interface TasksReadModel {
  listTasks(
    filter: TasksListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ rows: TaskListRow[]; total: number }>;
  kpis(now: Date): Promise<TasksKpiCounts>;
  tabCounts(now: Date): Promise<TasksTabCounts>;
}

export const TASKS_READ_MODEL = Symbol('TASKS_READ_MODEL');
