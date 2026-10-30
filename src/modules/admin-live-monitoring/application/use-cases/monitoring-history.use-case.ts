import { Inject, Injectable } from '@nestjs/common';
import { alertTypeLabel } from '@modules/admin-alerts/application/alert-presenter';
import { incidentNumber } from '@modules/admin-alerts/application/incident-presenter';
import { AlertType } from '@modules/admin-alerts/domain/alert-type.enum';
import {
  INCIDENT_CATEGORY_LABELS,
  IncidentCategory,
} from '@modules/admin-alerts/domain/incident-category.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  CompletedVisitResult,
  PagedResult,
  PastAlertResult,
  PastIncidentResult,
} from '../dto/monitoring-history.result';
import {
  MONITORING_HISTORY_READ_MODEL,
  MonitoringHistoryFilter,
  MonitoringHistoryReadModel,
} from '../ports/monitoring-history-read.port';
import { dayMonthYear, durationLabel, isLate, pageOf } from '../monitoring-history.util';

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
const DEFAULT_DAYS = 30;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
// shortcut: history is bounded to this many filtered rows per tab (paginated in the
// use case); upgrade to database-side pagination if a window ever exceeds it.
const CAP = 2000;

export type CompletedStatusFilter = 'ALL' | 'COMPLETED' | 'COMPLETED_LATE';

interface HistoryQuery {
  days?: number;
  branch?: string | null;
  careRecipientId?: string | null;
  caregiverId?: string | null;
  page?: number;
  pageSize?: number;
}

function filterOf(query: HistoryQuery, now: Date): MonitoringHistoryFilter {
  const days = query.days && query.days > 0 ? query.days : DEFAULT_DAYS;
  return {
    from: new Date(now.getTime() - days * DAY_MS),
    branch: query.branch ?? null,
    careRecipientId: query.careRecipientId ?? null,
    caregiverId: query.caregiverId ?? null,
  };
}

function pageSizeOf(query: HistoryQuery): number {
  const size = query.pageSize ?? DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, size));
}

function pageNumberOf(query: HistoryQuery): number {
  return Math.max(1, query.page ?? 1);
}

/** Monitoring History: Completed Visits tab (duration and on-time/late, paginated). */
@Injectable()
export class GetCompletedVisitsUseCase {
  constructor(
    @Inject(MONITORING_HISTORY_READ_MODEL) private readonly reads: MonitoringHistoryReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(
    query: HistoryQuery & { status?: CompletedStatusFilter },
  ): Promise<PagedResult<CompletedVisitResult>> {
    const now = this.clock.now();
    const rows = await this.reads.completedVisits(filterOf(query, now), CAP);
    const status = query.status ?? 'ALL';

    const mapped = rows
      .map((row) => {
        const late = isLate(row.scheduledDate, row.startMinute, row.clockInAt);
        return { row, late };
      })
      .filter(({ late }) => (status === 'ALL' ? true : status === 'COMPLETED_LATE' ? late : !late))
      .map(({ row, late }): CompletedVisitResult => {
        const ms =
          row.clockInAt !== null && row.clockOutAt !== null
            ? row.clockOutAt.getTime() - row.clockInAt.getTime()
            : (row.endMinute - row.startMinute) * MINUTE_MS;
        return {
          id: row.id,
          reference: `CP-${row.sequence}`,
          recipientName: row.recipientName,
          caregiverName: row.caregiverName,
          dateLabel: dayMonthYear(row.scheduledDate),
          durationLabel: durationLabel(ms),
          status: late ? 'COMPLETED_LATE' : 'COMPLETED',
          statusLabel: late ? 'Completed Late' : 'Completed',
        };
      });

    return paged(mapped, pageNumberOf(query), pageSizeOf(query), now);
  }
}

/** Monitoring History: Past Alerts tab (resolved or dismissed operational alerts). */
@Injectable()
export class GetPastAlertsUseCase {
  constructor(
    @Inject(MONITORING_HISTORY_READ_MODEL) private readonly reads: MonitoringHistoryReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(
    query: HistoryQuery & { severity?: string | null; alertType?: string | null },
  ): Promise<PagedResult<PastAlertResult>> {
    const now = this.clock.now();
    const rows = await this.reads.pastAlerts(
      filterOf(query, now),
      { severity: query.severity ?? null, alertType: query.alertType ?? null },
      CAP,
    );

    const mapped = rows.map((row): PastAlertResult => ({
      id: row.id,
      type: row.type,
      typeLabel: alertTypeLabel(row.type as AlertType),
      severity: row.severity,
      description: row.description,
      source: row.recipientName ?? 'Unknown',
      branch: row.caregiverBranch,
      dateLabel: dayMonthYear(row.createdAt),
      createdAt: row.createdAt.toISOString(),
      resolvedAt: row.resolvedAt.toISOString(),
      resolution: resolutionLabel(row.status, row.resolvedByAdminId),
      statusLabel: row.status === 'DISMISSED' ? 'Dismissed' : 'Resolved',
    }));

    return paged(mapped, pageNumberOf(query), pageSizeOf(query), now);
  }
}

/**
 * How a past alert was resolved. Auto-resolved when the detection sweep closed it (no
 * admin), Coordinator resolved when an admin did, Dismissed when dismissed. Note: an
 * "Escalated then resolved" state is not modelled (alerts carry no escalation signal).
 */
function resolutionLabel(status: string, resolvedByAdminId: string | null): string {
  if (status === 'DISMISSED') {
    return 'Dismissed';
  }
  return resolvedByAdminId === null ? 'Auto-resolved' : 'Coordinator resolved';
}

/** Monitoring History: Past Incidents tab (resolved or closed incidents). */
@Injectable()
export class GetPastIncidentsUseCase {
  constructor(
    @Inject(MONITORING_HISTORY_READ_MODEL) private readonly reads: MonitoringHistoryReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(
    query: HistoryQuery & {
      category?: string | null;
      severity?: string | null;
      status?: string | null;
    },
  ): Promise<PagedResult<PastIncidentResult>> {
    const now = this.clock.now();
    const rows = await this.reads.pastIncidents(
      filterOf(query, now),
      {
        category: query.category ?? null,
        severity: query.severity ?? null,
        status: query.status ?? null,
      },
      CAP,
    );

    const mapped = rows.map((row): PastIncidentResult => ({
      id: row.id,
      reference: incidentNumber(row.sequence, row.createdAt),
      category: row.category,
      categoryLabel: INCIDENT_CATEGORY_LABELS[row.category as IncidentCategory],
      severity: row.severity,
      reporter: row.reporterName ?? row.recipientName ?? 'Unknown',
      dateLabel: dayMonthYear(row.createdAt),
      createdAt: row.createdAt.toISOString(),
      resolvedAt: row.resolvedAt.toISOString(),
      outcome: row.status === 'CLOSED' ? 'Closed' : 'Resolved',
    }));

    return paged(mapped, pageNumberOf(query), pageSizeOf(query), now);
  }
}

function paged<T>(rows: T[], page: number, pageSize: number, now: Date): PagedResult<T> {
  const { slice, total, totalPages } = pageOf(rows, page, pageSize);
  return { page, pageSize, total, totalPages, rows: slice, generatedAt: now.toISOString() };
}
