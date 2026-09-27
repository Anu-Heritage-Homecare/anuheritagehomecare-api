import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  SCHEDULING_READ_MODEL,
  SchedulingDayView,
  SchedulingReadModel,
  SchedulingVisitRow,
} from '../ports/scheduling-read.port';
import {
  SchedulingConsoleResult,
  SchedulingSummaryResult,
  SchedulingVisitPageResult,
} from '../dto/scheduling.result';
import { detectConflicts, nextUtcDay, startOfUtcDay, toVisitResult } from '../scheduling-view.util';

const BUSY_STATUSES = new Set(['IN_PROGRESS', 'ON_BREAK']);

export interface GetSchedulingConsoleCommand {
  date: Date | null;
  status: string | null;
  priority: string | null;
  search: string | null;
  page: number;
  pageSize: number;
}

/**
 * The Scheduling console: the six KPI cards, the tab counts and the paginated
 * Today's Schedule table. Read only; every figure is derived server side from the
 * day's visits. Filtering and pagination run over the bounded set of a single day.
 */
@Injectable()
export class GetSchedulingConsoleUseCase {
  constructor(
    @Inject(SCHEDULING_READ_MODEL) private readonly reads: SchedulingReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetSchedulingConsoleCommand): Promise<SchedulingConsoleResult> {
    const day = command.date ?? this.clock.now();
    const dayStart = startOfUtcDay(day);
    const view = await this.reads.day(dayStart, nextUtcDay(day));

    const conflicts = detectConflicts(view.visits);
    const unassigned = view.visits.filter(
      (v) => v.caregiverId === null && v.status === 'SCHEDULED',
    ).length;

    const filtered = this.filter(view.visits, command);

    return {
      date: dayStart.toISOString(),
      summary: this.summary(view, conflicts.length),
      tabCounts: { unassigned, conflicts: conflicts.length },
      visits: this.paginate(filtered, command.page, command.pageSize),
    };
  }

  private summary(view: SchedulingDayView, conflicts: number): SchedulingSummaryResult {
    const visits = view.visits;
    const busy = new Set(
      visits
        .filter((v) => BUSY_STATUSES.has(v.status) && v.caregiverId !== null)
        .map((v) => v.caregiverId),
    );
    return {
      todaysVisits: visits.length,
      upcomingVisits: visits.filter((v) => v.status === 'SCHEDULED').length,
      availableCaregivers: Math.max(0, view.activeCaregivers - busy.size),
      unassignedVisits: visits.filter((v) => v.caregiverId === null && v.status === 'SCHEDULED')
        .length,
      scheduleConflicts: conflicts,
      completedVisits: visits.filter((v) => v.status === 'COMPLETED').length,
    };
  }

  private filter(
    visits: SchedulingVisitRow[],
    command: GetSchedulingConsoleCommand,
  ): SchedulingVisitRow[] {
    const search = command.search === null ? null : command.search.trim().toLowerCase();
    return visits.filter((v) => {
      if (command.status !== null && v.status !== command.status) {
        return false;
      }
      if (command.priority !== null && v.priority !== command.priority) {
        return false;
      }
      if (search !== null && search.length > 0) {
        const haystack = `${v.recipientName} ${v.caregiverName ?? ''}`.toLowerCase();
        if (!haystack.includes(search)) {
          return false;
        }
      }
      return true;
    });
  }

  private paginate(
    visits: SchedulingVisitRow[],
    page: number,
    pageSize: number,
  ): SchedulingVisitPageResult {
    const start = Math.max(0, (page - 1) * pageSize);
    const rows = visits.slice(start, start + pageSize).map((v) => toVisitResult(v));
    return { total: visits.length, page, pageSize, rows };
  }
}
