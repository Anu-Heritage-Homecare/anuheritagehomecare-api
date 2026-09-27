import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { SCHEDULING_READ_MODEL, SchedulingReadModel } from '../ports/scheduling-read.port';
import {
  SchedulingCalendarDayResult,
  SchedulingConflictResult,
  SchedulingVisitPageResult,
} from '../dto/scheduling.result';
import { detectConflicts, nextUtcDay, startOfUtcDay, toVisitResult } from '../scheduling-view.util';

const DAY_MS = 86_400_000;
const MAX_CALENDAR_DAYS = 62;

/** The Unassigned Visits tab: the day's scheduled visits with no caregiver yet. */
@Injectable()
export class ListUnassignedVisitsUseCase {
  constructor(
    @Inject(SCHEDULING_READ_MODEL) private readonly reads: SchedulingReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: {
    date: Date | null;
    page: number;
    pageSize: number;
  }): Promise<SchedulingVisitPageResult> {
    const day = command.date ?? this.clock.now();
    const view = await this.reads.day(startOfUtcDay(day), nextUtcDay(day));
    const unassigned = view.visits.filter(
      (v) => v.caregiverId === null && v.status === 'SCHEDULED',
    );
    const start = Math.max(0, (command.page - 1) * command.pageSize);
    return {
      total: unassigned.length,
      page: command.page,
      pageSize: command.pageSize,
      rows: unassigned.slice(start, start + command.pageSize).map((v) => toVisitResult(v)),
    };
  }
}

/** The Conflicts and Alerts tab: overlapping visits for a caregiver on the day. */
@Injectable()
export class GetSchedulingConflictsUseCase {
  constructor(
    @Inject(SCHEDULING_READ_MODEL) private readonly reads: SchedulingReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: { date: Date | null }): Promise<SchedulingConflictResult[]> {
    const day = command.date ?? this.clock.now();
    const view = await this.reads.day(startOfUtcDay(day), nextUtcDay(day));
    return detectConflicts(view.visits);
  }
}

/** The Calendar feed: the range's visits grouped by day for the frontend grid. */
@Injectable()
export class GetSchedulingCalendarUseCase {
  constructor(@Inject(SCHEDULING_READ_MODEL) private readonly reads: SchedulingReadModel) {}

  async execute(command: { from: Date; to: Date }): Promise<SchedulingCalendarDayResult[]> {
    const from = startOfUtcDay(command.from);
    const toExclusive = nextUtcDay(command.to);
    const rows = await this.reads.range(from, capRange(from, toExclusive));

    const byDay = new Map<string, SchedulingCalendarDayResult>();
    for (
      let cursor = from.getTime();
      cursor < capRange(from, toExclusive).getTime();
      cursor += DAY_MS
    ) {
      const key = new Date(cursor).toISOString();
      byDay.set(key, { date: key, visits: [] });
    }
    for (const row of rows) {
      const key = startOfUtcDay(row.scheduledDate).toISOString();
      const day = byDay.get(key);
      if (day !== undefined) {
        day.visits.push(toVisitResult(row));
      }
    }
    return [...byDay.values()];
  }
}

/** Cap the calendar to a safe number of days so the read stays bounded. */
function capRange(from: Date, toExclusive: Date): Date {
  const maxEnd = new Date(from.getTime() + MAX_CALENDAR_DAYS * DAY_MS);
  return toExclusive.getTime() > maxEnd.getTime() ? maxEnd : toExclusive;
}
