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
  buildAttention,
  computeActiveWorkload,
  computeMap,
  filterVisits,
  LiveFilters,
  LiveStatusFilter,
  matchesStatusFilter,
  nextUtcDay,
  startOfUtcDay,
} from '../live-monitoring.util';
import { SweepLiveAlertsUseCase } from './sweep-live-alerts.use-case';

/**
 * The Active Visits tab: the day's live workload (clocked in plus scheduled pending),
 * with the pill counts, optionally narrowed to one status pill and paginated.
 */
@Injectable()
export class ListActiveVisitsUseCase {
  constructor(
    @Inject(LIVE_MONITORING_READ_MODEL) private readonly reads: LiveMonitoringReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(
    command: LiveFilters & { status: LiveStatusFilter | null; page: number; pageSize: number },
  ): Promise<LiveVisitPageResult> {
    const now = this.clock.now();
    const snapshot = await this.reads.snapshot(startOfUtcDay(now), nextUtcDay(now));
    const { counts, items } = computeActiveWorkload(filterVisits(snapshot.visits, command), now);
    const status = command.status;
    const filtered =
      status === null ? items : items.filter((i) => matchesStatusFilter(i.bucket, status));
    const start = Math.max(0, (command.page - 1) * command.pageSize);
    return {
      total: filtered.length,
      page: command.page,
      pageSize: command.pageSize,
      counts,
      rows: filtered.slice(start, start + command.pageSize).map((i) => i.row),
    };
  }
}

/** The Attention Required tab: active SOS alerts and the open operational alerts. */
@Injectable()
export class ListAttentionUseCase {
  constructor(
    @Inject(LIVE_MONITORING_READ_MODEL) private readonly reads: LiveMonitoringReadModel,
    private readonly sweep: SweepLiveAlertsUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(): Promise<LiveAttentionResult[]> {
    const now = this.clock.now();
    const snapshot = await this.reads.snapshot(startOfUtcDay(now), nextUtcDay(now));
    await this.sweep.execute(snapshot, now);
    const alerts = await this.reads.openAlerts();
    return buildAttention(snapshot, alerts, now);
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
    return computeMap(filterVisits(snapshot.visits, filters), snapshot, now);
  }
}
