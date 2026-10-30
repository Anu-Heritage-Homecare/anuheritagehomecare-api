import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { TASKS_READ_MODEL, TaskListRow, TasksReadModel, TasksTab } from '../ports/tasks-read.port';
import { TaskRowResult, TasksScreenResult } from '../dto/tasks-screen.result';
import {
  categoryLabel,
  completionRatePercent,
  dueDateLabel,
  priorityLabel,
  relatedVisitLabel,
  statusLabel,
} from '../tasks.presenter';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

export interface GetTasksScreenQuery {
  tab?: TasksTab;
  search?: string | null;
  assignedToAdminId?: string | null;
  assigneeLabel?: string | null;
  priority?: string | null;
  category?: string | null;
  status?: string | null;
  page?: number;
  pageSize?: number;
}

/** The Tasks screen: KPIs, tab counts and the filtered, paginated, enriched task list. */
@Injectable()
export class GetTasksScreenUseCase {
  constructor(
    @Inject(TASKS_READ_MODEL) private readonly reads: TasksReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: GetTasksScreenQuery): Promise<TasksScreenResult> {
    const now = this.clock.now();
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));

    const [kpis, tabCounts, list] = await Promise.all([
      this.reads.kpis(now),
      this.reads.tabCounts(now),
      this.reads.listTasks(
        {
          now,
          tab: query.tab ?? 'ALL',
          search: query.search ?? null,
          assignedToAdminId: query.assignedToAdminId ?? null,
          assigneeLabel: query.assigneeLabel ?? null,
          priority: query.priority ?? null,
          category: query.category ?? null,
          status: query.status ?? null,
        },
        page,
        pageSize,
      ),
    ]);

    return {
      kpis: {
        openTasks: kpis.openTasks,
        completedToday: kpis.completedToday,
        overdue: kpis.overdue,
        highPriority: kpis.highPriority,
        dueToday: kpis.dueToday,
        completionRatePercent: completionRatePercent(kpis.completedTotal, kpis.totalTasks),
      },
      tabCounts,
      page,
      pageSize,
      total: list.total,
      totalPages: Math.max(1, Math.ceil(list.total / pageSize)),
      rows: list.rows.map((row) => this.toRow(row, now)),
      generatedAt: now.toISOString(),
    };
  }

  private toRow(row: TaskListRow, now: Date): TaskRowResult {
    return {
      id: row.id,
      title: row.title,
      relatedVisitLabel: relatedVisitLabel(row.visitType),
      assignee: row.assigneeName ?? row.assigneeLabel ?? 'Unassigned',
      recipientName: row.recipientName,
      dueAt: row.dueAt === null ? null : row.dueAt.toISOString(),
      dueDateLabel: dueDateLabel(row.dueAt, now),
      priority: row.priority,
      priorityLabel: priorityLabel(row.priority),
      status: row.status,
      statusLabel: statusLabel(row.status, row.dueAt, now),
      category: row.category,
      categoryLabel: categoryLabel(row.category),
    };
  }
}
