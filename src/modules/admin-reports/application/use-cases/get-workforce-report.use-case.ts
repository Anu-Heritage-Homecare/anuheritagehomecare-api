import { Inject, Injectable } from '@nestjs/common';
import { CaregiverEmploymentType } from '@prisma/client';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  CertificationUrgency,
  FlaggedCaregiverResult,
  RatingBand,
  RatingDistributionResult,
  TopCaregiverResult,
  WorkforceReportResult,
} from '../dto/workforce-report.result';
import {
  WORKFORCE_REPORT_READ_MODEL,
  WorkforceCaregiverAggregate,
  WorkforceReportReadModel,
} from '../ports/workforce-report-read.port';

const DEFAULT_RANGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const SECONDS_PER_HOUR = 3600;
const UTILIZATION_TARGET_PERCENT = 85;
const TOP_CAREGIVERS = 10;

const ATTENDANCE_FLAG_PERCENT = 90;
const LATE_ARRIVAL_FLAG_COUNT = 3;
const RATING_FLAG = 3.5;

const OUTSTANDING_MIN = 4.5;
const GOOD_MIN = 4.0;
const SATISFACTORY_MIN = 3.5;

const ACTION_REQUIRED_DAYS = 15;
const GRACE_PERIOD_DAYS = 30;

export interface GetWorkforceReportCommand {
  from: Date | null;
  to: Date | null;
  branch: string | null;
  caregiverId: string | null;
  employmentType: CaregiverEmploymentType | null;
}

/** A caregiver's derived rates, computed once and reused across the cards. */
interface CaregiverMetrics {
  aggregate: WorkforceCaregiverAggregate;
  rating: number | null;
  csat: number | null;
  attendance: number | null;
  onTimeRate: number | null;
  lateArrivals: number;
}

/**
 * Assemble the Workforce Report drill down for a reporting period and the three filters
 * (branch, caregiver and employment type). Every rate is derived from the caregivers in
 * scope: utilization against weekly capacity, attendance as the non missed share, the
 * rating distribution and ranking from care ratings, and the operational review flags.
 */
@Injectable()
export class GetWorkforceReportUseCase {
  constructor(
    @Inject(WORKFORCE_REPORT_READ_MODEL) private readonly reads: WorkforceReportReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetWorkforceReportCommand): Promise<WorkforceReportResult> {
    const now = this.clock.now();
    const to = command.to ?? now;
    const from = command.from ?? new Date(to.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);

    const view = await this.reads.report({
      from,
      to,
      branch: command.branch,
      caregiverId: command.caregiverId,
      employmentType: command.employmentType,
      now,
    });

    const metrics = view.caregivers.map(toMetrics);
    const activeCaregivers = metrics.length;
    const rangeDays = Math.max(1, (to.getTime() - from.getTime()) / DAY_MS);

    const totalLoggedSeconds = sum(metrics, (m) => m.aggregate.loggedSeconds);
    const totalVisits = sum(metrics, (m) => m.aggregate.visitsTotal);
    const totalNonMissed = sum(metrics, (m) => m.aggregate.visitsTotal - m.aggregate.visitsMissed);
    const ratingSum = sum(metrics, (m) => m.aggregate.ratingSum);
    const ratingCount = sum(metrics, (m) => m.aggregate.ratingCount);
    const overdue = metrics.filter((m) => m.aggregate.hasIncompleteTraining).length;
    const compliant = activeCaregivers - overdue;

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      kpis: {
        activeCaregivers,
        staffedPercent: pct(activeCaregivers, view.totalCaregivers),
        utilizationPercent: utilization(totalLoggedSeconds, view.weeklyCapacityHours, rangeDays),
        utilizationTargetPercent: UTILIZATION_TARGET_PERCENT,
        attendancePercent: pct(totalNonMissed, totalVisits),
        avgPerformance: ratingCount === 0 ? null : round1(ratingSum / ratingCount),
        trainingCompliancePercent: pct(compliant, activeCaregivers),
      },
      weeklyUtilization: view.weekly.map((week) => ({
        label: week.label,
        utilizationPercent: utilization(week.loggedSeconds, view.weeklyCapacityHours, week.days),
      })),
      attendanceTrend: view.attendanceDaily.map((day) => ({
        date: day.date.toISOString().slice(0, 10),
        attendancePercent: pct(day.nonMissed, day.total),
      })),
      ratingDistribution: ratingDistribution(metrics),
      topCaregivers: topCaregivers(metrics),
      trainingCompliance: {
        compliant,
        overdue,
        compliantPercent: pct(compliant, activeCaregivers),
      },
      expiringCertifications: view.expiringCertifications.map((cert) => ({
        caregiverId: cert.caregiverId,
        caregiverName: cert.caregiverName,
        credentialName: cert.credentialName,
        expiresAt: cert.expiresAt.toISOString(),
        daysUntilExpiry: cert.daysUntilExpiry,
        status: urgencyOf(cert.daysUntilExpiry),
      })),
      flaggedForReview: flagged(metrics),
    };
  }
}

function toMetrics(aggregate: WorkforceCaregiverAggregate): CaregiverMetrics {
  return {
    aggregate,
    rating:
      aggregate.ratingCount === 0 ? null : round1(aggregate.ratingSum / aggregate.ratingCount),
    csat: aggregate.csatCount === 0 ? null : round1(aggregate.csatSum / aggregate.csatCount),
    attendance: pct(aggregate.visitsTotal - aggregate.visitsMissed, aggregate.visitsTotal),
    onTimeRate: pct(aggregate.onTime, aggregate.started),
    lateArrivals: aggregate.started - aggregate.onTime,
  };
}

function ratingDistribution(metrics: CaregiverMetrics[]): RatingDistributionResult[] {
  const rated = metrics.filter((m) => m.rating !== null);
  const counts: Record<RatingBand, number> = {
    OUTSTANDING: 0,
    GOOD: 0,
    SATISFACTORY: 0,
    NEEDS_IMPROVEMENT: 0,
  };
  for (const metric of rated) {
    counts[bandOf(metric.rating as number)] += 1;
  }
  const bands: RatingBand[] = ['OUTSTANDING', 'GOOD', 'SATISFACTORY', 'NEEDS_IMPROVEMENT'];
  return bands.map((band) => ({
    band,
    caregivers: counts[band],
    percent: rated.length === 0 ? 0 : round1((counts[band] / rated.length) * 100),
  }));
}

function bandOf(rating: number): RatingBand {
  if (rating >= OUTSTANDING_MIN) {
    return 'OUTSTANDING';
  }
  if (rating >= GOOD_MIN) {
    return 'GOOD';
  }
  if (rating >= SATISFACTORY_MIN) {
    return 'SATISFACTORY';
  }
  return 'NEEDS_IMPROVEMENT';
}

/** Rank by overall rating, then completed visits, then CSAT (the mockup's stack ranking). */
function topCaregivers(metrics: CaregiverMetrics[]): TopCaregiverResult[] {
  return [...metrics]
    .sort((a, b) => {
      const rating = (b.rating ?? -1) - (a.rating ?? -1);
      if (rating !== 0) {
        return rating;
      }
      const visits = b.aggregate.visitsCompleted - a.aggregate.visitsCompleted;
      if (visits !== 0) {
        return visits;
      }
      return (b.csat ?? -1) - (a.csat ?? -1);
    })
    .slice(0, TOP_CAREGIVERS)
    .map((metric, index) => ({
      rank: index + 1,
      caregiverId: metric.aggregate.caregiverId,
      name: metric.aggregate.name,
      photoKey: metric.aggregate.photoKey,
      rating: metric.rating,
      visitsCompleted: metric.aggregate.visitsCompleted,
      onTimeRatePercent: metric.onTimeRate,
      attendancePercent: metric.attendance,
      csatScore: metric.csat,
    }));
}

function flagged(metrics: CaregiverMetrics[]): FlaggedCaregiverResult[] {
  const results: FlaggedCaregiverResult[] = [];
  for (const metric of metrics) {
    const reasons: string[] = [];
    if (metric.attendance !== null && metric.attendance < ATTENDANCE_FLAG_PERCENT) {
      reasons.push(`Attendance rate ${metric.attendance}%`);
    }
    if (metric.lateArrivals >= LATE_ARRIVAL_FLAG_COUNT) {
      reasons.push(`${metric.lateArrivals} late arrivals`);
    }
    if (metric.rating !== null && metric.rating < RATING_FLAG) {
      reasons.push(`Scorecard rating ${metric.rating}`);
    }
    if (reasons.length === 0) {
      continue;
    }
    results.push({
      caregiverId: metric.aggregate.caregiverId,
      name: metric.aggregate.name,
      photoKey: metric.aggregate.photoKey,
      reason: reasons.join('; '),
      attendancePercent: metric.attendance,
      lateArrivals: metric.lateArrivals,
    });
  }
  return results;
}

function urgencyOf(daysUntilExpiry: number): CertificationUrgency {
  if (daysUntilExpiry < ACTION_REQUIRED_DAYS) {
    return 'ACTION_REQUIRED';
  }
  if (daysUntilExpiry < GRACE_PERIOD_DAYS) {
    return 'GRACE_PERIOD';
  }
  return 'SCHEDULED';
}

/** Worked hours over capacity hours (weekly capacity prorated to the window), as a percentage. */
function utilization(
  loggedSeconds: number,
  weeklyCapacityHours: number,
  days: number,
): number | null {
  const capacityHours = (weeklyCapacityHours * days) / 7;
  if (capacityHours <= 0) {
    return null;
  }
  return round1((loggedSeconds / SECONDS_PER_HOUR / capacityHours) * 100);
}

function sum(metrics: CaregiverMetrics[], pick: (m: CaregiverMetrics) => number): number {
  return metrics.reduce((total, metric) => total + pick(metric), 0);
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
