import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  LIVE_MONITORING_READ_MODEL,
  LiveMonitoringReadModel,
} from '../ports/live-monitoring-read.port';
import { LiveOverviewResult } from '../dto/live-monitoring.result';
import {
  buildAttention,
  computeActiveVisits,
  computeActivity,
  computeSummary,
  filterVisits,
  LiveFilters,
  nextUtcDay,
  startOfUtcDay,
} from '../live-monitoring.util';
import { SweepLiveAlertsUseCase } from './sweep-live-alerts.use-case';

const OVERVIEW_ACTIVE_LIMIT = 4;

/**
 * The Live Monitoring overview: the six KPI cards, the Active Visit Summary, the
 * Attention Required panel (active SOS alerts plus the open operational alerts) and
 * the Recent Live Activity feed. A detection sweep first raises any missing alerts.
 */
@Injectable()
export class GetLiveOverviewUseCase {
  constructor(
    @Inject(LIVE_MONITORING_READ_MODEL) private readonly reads: LiveMonitoringReadModel,
    private readonly sweep: SweepLiveAlertsUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(filters: LiveFilters): Promise<LiveOverviewResult> {
    const now = this.clock.now();
    const snapshot = await this.reads.snapshot(startOfUtcDay(now), nextUtcDay(now));
    await this.sweep.execute(snapshot, now);
    const alerts = await this.reads.openAlerts();

    const attention = buildAttention(snapshot, alerts, now);
    const visits = filterVisits(snapshot.visits, filters);
    const activeVisits = computeActiveVisits(visits, now);

    return {
      updatedAt: now.toISOString(),
      summary: computeSummary(visits, attention, now),
      tabCounts: { activeVisits: activeVisits.length, attention: attention.length },
      activeVisits: activeVisits.slice(0, OVERVIEW_ACTIVE_LIMIT),
      attentionRequired: attention,
      recentActivity: computeActivity(visits, now),
    };
  }
}
