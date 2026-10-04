import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  LIVE_MONITORING_READ_MODEL,
  LiveMonitoringReadModel,
} from '../ports/live-monitoring-read.port';
import { LiveOverviewResult } from '../dto/live-monitoring.result';
import {
  computeActiveVisits,
  computeActivity,
  computeAttention,
  computeSummary,
  filterVisits,
  LiveFilters,
  nextUtcDay,
  startOfUtcDay,
} from '../live-monitoring.util';

const OVERVIEW_ACTIVE_LIMIT = 4;

/**
 * The Live Monitoring overview: the six KPI cards, the Active Visit Summary, the
 * Attention Required panel (SOS, missed check-ins and overdue visits) and the
 * Recent Live Activity feed, all derived from the day's live snapshot. Read only.
 */
@Injectable()
export class GetLiveOverviewUseCase {
  constructor(
    @Inject(LIVE_MONITORING_READ_MODEL) private readonly reads: LiveMonitoringReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(filters: LiveFilters): Promise<LiveOverviewResult> {
    const now = this.clock.now();
    const snapshot = await this.reads.snapshot(startOfUtcDay(now), nextUtcDay(now));
    const visits = filterVisits(snapshot.visits, filters);

    const activeVisits = computeActiveVisits(visits, now);
    const attention = computeAttention(visits, snapshot, now);

    return {
      updatedAt: now.toISOString(),
      summary: computeSummary(visits, snapshot, now),
      tabCounts: { activeVisits: activeVisits.length, attention: attention.length },
      activeVisits: activeVisits.slice(0, OVERVIEW_ACTIVE_LIMIT),
      attentionRequired: attention,
      recentActivity: computeActivity(visits, now),
    };
  }
}
