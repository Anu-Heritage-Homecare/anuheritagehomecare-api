import { Inject, Injectable } from '@nestjs/common';
import { VisitStatus, VisitType } from '@prisma/client';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { LocationTrend, OperationsReportResult } from '../dto/operations-report.result';
import {
  OPERATIONS_REPORT_READ_MODEL,
  OperationsReportReadModel,
  OpsLocationBucket,
} from '../ports/operations-report-read.port';

const DEFAULT_RANGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Completion rate gap (percentage points) within which a location counts as flat. */
const TREND_EPSILON = 0.5;

export interface GetOperationsReportCommand {
  from: Date | null;
  to: Date | null;
  visitType: VisitType | null;
  caregiverId: string | null;
  status: VisitStatus | null;
  city: string | null;
}

/**
 * Assemble the Operations Report drill down for a reporting period and the four filters
 * (service type, caregiver, status and branch/city). Visit completion and cancellation
 * are measured over total visits in the period; the location trend compares each city's
 * completion rate against the equal length window just before.
 */
@Injectable()
export class GetOperationsReportUseCase {
  constructor(
    @Inject(OPERATIONS_REPORT_READ_MODEL) private readonly reads: OperationsReportReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetOperationsReportCommand): Promise<OperationsReportResult> {
    const now = this.clock.now();
    const to = command.to ?? now;
    const from = command.from ?? new Date(to.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);

    const view = await this.reads.report({
      from,
      to,
      visitType: command.visitType,
      caregiverId: command.caregiverId,
      status: command.status,
      city: command.city,
    });

    const current = view.current;
    const cancellationTotal = view.cancellationReasons.reduce((sum, r) => sum + r.count, 0);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      visitPerformance: {
        totalVisits: current.total,
        totalVisitsDeltaPercent: percentChange(current.total, view.previousTotal),
        completed: current.completed,
        completedPercent: pct(current.completed, current.total),
        cancelled: current.cancelled,
        cancelledPercent: pct(current.cancelled, current.total),
        avgVisitDurationMinutes: avgMinutes(current.loggedSeconds, current.durationCount),
      },
      dailyTrend: view.daily.map((point) => ({
        date: point.date.toISOString().slice(0, 10),
        visits: point.visits,
      })),
      weeklyCompletion: view.weekly.map((week) => ({
        label: week.label,
        completionPercent: pct(week.completed, week.total),
      })),
      cancellationReasons: view.cancellationReasons.map((reason) => ({
        reason: reason.reason,
        count: reason.count,
        percent: cancellationTotal === 0 ? 0 : round1((reason.count / cancellationTotal) * 100),
      })),
      topServiceTypes: view.serviceTypes.map((service) => ({
        type: service.type,
        count: service.count,
      })),
      locationPerformance: view.locations.map((location) => toLocationRow(location)),
    };
  }
}

function toLocationRow(
  location: OpsLocationBucket,
): OperationsReportResult['locationPerformance'][number] {
  const completionPercent = pct(location.completed, location.total);
  return {
    location: location.city,
    totalVisits: location.total,
    completionPercent,
    avgVisitDurationMinutes: avgMinutes(location.loggedSeconds, location.durationCount),
    satisfactionAvg:
      location.satisfactionCount === 0
        ? null
        : round1(location.satisfactionSum / location.satisfactionCount),
    trend: trendOf(completionPercent, location.previousCompletionRate),
  };
}

/** Up when the completion rate rose beyond the epsilon, down when it fell, else flat. */
function trendOf(current: number | null, previous: number | null): LocationTrend {
  if (current === null || previous === null) {
    return 'FLAT';
  }
  if (current > previous + TREND_EPSILON) {
    return 'UP';
  }
  if (current < previous - TREND_EPSILON) {
    return 'DOWN';
  }
  return 'FLAT';
}

function avgMinutes(loggedSeconds: number, count: number): number | null {
  return count === 0 ? null : Math.round(loggedSeconds / count / 60);
}

/** Percentage change from a baseline, null when the baseline was zero. */
function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }
  return round1(((current - previous) / previous) * 100);
}

/** A part over a whole as a percentage (1 dp), null when the whole is zero. */
function pct(part: number, whole: number): number | null {
  if (whole <= 0) {
    return null;
  }
  return round1((part / whole) * 100);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
