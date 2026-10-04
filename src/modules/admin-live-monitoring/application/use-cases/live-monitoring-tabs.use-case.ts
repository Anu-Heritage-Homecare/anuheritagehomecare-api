import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  LIVE_MONITORING_READ_MODEL,
  LiveMonitoringReadModel,
} from '../ports/live-monitoring-read.port';
import {
  LiveAttentionResult,
  LiveMapResult,
  LiveVisitPageResult,
} from '../dto/live-monitoring.result';
import {
  computeActiveVisits,
  computeAttention,
  computeMap,
  filterVisits,
  LiveFilters,
  nextUtcDay,
  startOfUtcDay,
} from '../live-monitoring.util';

/** The Active Visits tab: a paginated list of the currently active visits. */
@Injectable()
export class ListActiveVisitsUseCase {
  constructor(
    @Inject(LIVE_MONITORING_READ_MODEL) private readonly reads: LiveMonitoringReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(
    command: LiveFilters & { page: number; pageSize: number },
  ): Promise<LiveVisitPageResult> {
    const now = this.clock.now();
    const snapshot = await this.reads.snapshot(startOfUtcDay(now), nextUtcDay(now));
    const rows = computeActiveVisits(filterVisits(snapshot.visits, command), now);
    const start = Math.max(0, (command.page - 1) * command.pageSize);
    return {
      total: rows.length,
      page: command.page,
      pageSize: command.pageSize,
      rows: rows.slice(start, start + command.pageSize),
    };
  }
}

/** The Attention Required tab: the SOS, missed check-in and overdue items. */
@Injectable()
export class ListAttentionUseCase {
  constructor(
    @Inject(LIVE_MONITORING_READ_MODEL) private readonly reads: LiveMonitoringReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(filters: LiveFilters): Promise<LiveAttentionResult[]> {
    const now = this.clock.now();
    const snapshot = await this.reads.snapshot(startOfUtcDay(now), nextUtcDay(now));
    return computeAttention(filterVisits(snapshot.visits, filters), snapshot, now);
  }
}

/** The Map View: active visits and SOS alerts with their coordinates. */
@Injectable()
export class GetMapViewUseCase {
  constructor(
    @Inject(LIVE_MONITORING_READ_MODEL) private readonly reads: LiveMonitoringReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(filters: LiveFilters): Promise<LiveMapResult> {
    const now = this.clock.now();
    const snapshot = await this.reads.snapshot(startOfUtcDay(now), nextUtcDay(now));
    return computeMap(filterVisits(snapshot.visits, filters), snapshot);
  }
}
