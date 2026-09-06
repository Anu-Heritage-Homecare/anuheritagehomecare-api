import { Inject, Injectable } from '@nestjs/common';
import { AlertResult } from '@modules/admin-alerts/application/dto/alert.result';
import { AlertSeverity } from '@modules/admin-alerts/domain/alert-severity.enum';
import { AlertType } from '@modules/admin-alerts/domain/alert-type.enum';
import { RaiseAlertUseCase } from '@modules/admin-alerts/application/use-cases/raise-alert.use-case';
import {
  OPERATIONAL_ALERT_REPOSITORY,
  OperationalAlertRepository,
} from '@modules/admin-alerts/domain/operational-alert.repository';
import { ALERT_SEVERITY_RANK } from '@modules/admin-alerts/domain/alert-severity.enum';
import { toAlertResult } from '@modules/admin-alerts/application/dto/alert.result';
import {
  OPERATIONAL_TASK_REPOSITORY,
  OperationalTaskRepository,
} from '@modules/admin-tasks/domain/operational-task.repository';
import {
  CARE_RATING_REPOSITORY,
  CareRatingRepository,
} from '@modules/care-ratings/domain/care-rating.repository';
import {
  CERTIFICATION_REPOSITORY,
  CertificationRepository,
} from '@modules/certifications/domain/certification.repository';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { Visit } from '@modules/visits/domain/visit.entity';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  ActivityItem,
  DashboardResult,
  OperationsSnapshot,
  PerformanceSnapshot,
  ScheduleItem,
} from '../dto/dashboard.result';
import { minuteOfUtcDay, startOfUtcDay } from '../dashboard-date.util';

const LATE_THRESHOLD_MINUTES = 10;
const MISSED_THRESHOLD_MINUTES = 30;
const STARTING_SOON_MINUTES = 60;
const CERT_EXPIRY_WINDOW_DAYS = 7;
const ON_TIME_GRACE_MINUTES = 5;
const ACTIVITY_LIMIT = 8;
const MS_PER_DAY = 86_400_000;

const ACTIVE_STATUSES: ReadonlySet<VisitStatus> = new Set([
  VisitStatus.InProgress,
  VisitStatus.OnBreak,
]);

/**
 * Use case: assemble the whole operations dashboard in one read. It composes the
 * visits, care recipients, identity, alerts, tasks, ratings and certifications
 * contexts through their repositories.
 *
 * Reading the dashboard also runs an idempotent detection sweep that raises Late
 * Caregiver, Missed Clock in and Certification Expiring alerts for problems it
 * finds, deduplicated so a repeated load never creates a second alert for the same
 * problem. This keeps the Critical Alerts section reflecting current reality
 * without a separate scheduled job.
 */
@Injectable()
export class GetAdminDashboardUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(OPERATIONAL_ALERT_REPOSITORY) private readonly alerts: OperationalAlertRepository,
    @Inject(OPERATIONAL_TASK_REPOSITORY) private readonly tasks: OperationalTaskRepository,
    @Inject(CARE_RATING_REPOSITORY) private readonly ratings: CareRatingRepository,
    @Inject(CERTIFICATION_REPOSITORY) private readonly certifications: CertificationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly raiseAlert: RaiseAlertUseCase,
  ) {}

  async execute(): Promise<DashboardResult> {
    const now = this.clock.now();
    const today = startOfUtcDay(now);
    const nowMinute = minuteOfUtcDay(now);

    const visits = await this.visits.listForDateRange(today, today);

    const recipientIds = [...new Set(visits.map((visit) => visit.careRecipientId))];
    const caregiverIds = [
      ...new Set(
        visits.map((visit) => visit.caregiverId).filter((id): id is string => id !== null),
      ),
    ];

    const [recipientRows, caregiverRows, totalCaregivers] = await Promise.all([
      this.recipients.findByIds(recipientIds),
      this.users.findByIds(caregiverIds),
      this.users.countByType(UserType.Caregiver),
    ]);

    const recipientName = new Map(recipientRows.map((r) => [r.id, r.profile.name]));
    const caregiverName = new Map(caregiverRows.map((u) => [u.id, u.name.fullName]));

    await this.detectAlerts(visits, nowMinute, now, recipientName, caregiverName);

    const [openAlerts, openTasks, ratingSummary] = await Promise.all([
      this.alerts.listOpen(50),
      this.tasks.countOpen(),
      this.ratings.summarise(null),
    ]);

    const criticalAlerts: AlertResult[] = openAlerts
      .sort((a, b) => {
        const bySeverity = ALERT_SEVERITY_RANK[b.severity] - ALERT_SEVERITY_RANK[a.severity];
        return bySeverity !== 0 ? bySeverity : b.createdAt.getTime() - a.createdAt.getTime();
      })
      .map(toAlertResult);

    return {
      operations: this.buildOperations(
        visits,
        nowMinute,
        totalCaregivers,
        criticalAlerts.length,
        ratingSummary.average,
        today,
      ),
      todaysSchedule: this.buildSchedule(visits, recipientName, caregiverName),
      criticalAlerts,
      activityTimeline: this.buildActivity(visits, recipientName, caregiverName),
      performance: this.buildPerformance(
        visits,
        today,
        ratingSummary.average,
        ratingSummary.count,
        openTasks,
      ),
    };
  }

  private buildOperations(
    visits: Visit[],
    nowMinute: number,
    totalCaregivers: number,
    criticalAlerts: number,
    ratingAverage: number | null,
    today: Date,
  ): OperationsSnapshot {
    const total = visits.length;
    const completed = visits.filter((v) => v.status === VisitStatus.Completed).length;
    const active = visits.filter((v) => ACTIVE_STATUSES.has(v.status)).length;
    const busyCaregivers = new Set(
      visits
        .filter((v) => ACTIVE_STATUSES.has(v.status) && v.caregiverId !== null)
        .map((v) => v.caregiverId),
    ).size;
    const startingSoon = visits.filter(
      (v) =>
        v.status === VisitStatus.Scheduled &&
        v.window.startMinute > nowMinute &&
        v.window.startMinute - nowMinute <= STARTING_SOON_MINUTES,
    ).length;

    return {
      activeHomeVisits: active,
      scheduledToday: total,
      scheduledCompletionPercent: total === 0 ? 0 : Math.round((completed / total) * 100),
      availableCaregivers: Math.max(0, totalCaregivers - busyCaregivers),
      totalCaregivers,
      visitsStartingSoon: startingSoon,
      criticalAlerts,
      careQualityScore: this.careQualityScore(visits, today, ratingAverage),
    };
  }

  private buildSchedule(
    visits: Visit[],
    recipientName: Map<string, string>,
    caregiverName: Map<string, string>,
  ): ScheduleItem[] {
    return [...visits]
      .sort((a, b) => a.window.startMinute - b.window.startMinute)
      .map((visit) => ({
        visitId: visit.id,
        startMinute: visit.window.startMinute,
        endMinute: visit.window.endMinute,
        recipientName: recipientName.get(visit.careRecipientId) ?? 'Unknown recipient',
        caregiverName:
          visit.caregiverId === null ? null : (caregiverName.get(visit.caregiverId) ?? null),
        visitType: String(visit.type),
        status: String(visit.status),
        priority: String(visit.priority),
      }));
  }

  private buildActivity(
    visits: Visit[],
    recipientName: Map<string, string>,
    caregiverName: Map<string, string>,
  ): ActivityItem[] {
    const items: ActivityItem[] = [];
    for (const visit of visits) {
      const recipient = recipientName.get(visit.careRecipientId) ?? 'a recipient';
      const caregiver =
        visit.caregiverId === null ? null : (caregiverName.get(visit.caregiverId) ?? null);

      if (visit.assignedAt !== null && caregiver !== null) {
        items.push({
          type: 'CAREGIVER_ASSIGNED',
          description: `${caregiver} assigned to ${recipient}.`,
          occurredAt: visit.assignedAt,
        });
      }
      if (visit.clockInAt !== null && caregiver !== null) {
        items.push({
          type: 'VISIT_STARTED',
          description: `${caregiver} began the visit for ${recipient}.`,
          occurredAt: visit.clockInAt,
        });
      }
      for (const administration of visit.medicationAdministrations) {
        items.push({
          type: 'MEDICATION_RECORDED',
          description: `Medication recorded for ${recipient}.`,
          occurredAt: administration.recordedAt,
        });
      }
      if (visit.status === VisitStatus.Completed && visit.clockOutAt !== null) {
        items.push({
          type: 'VISIT_COMPLETED',
          description: `${caregiver ?? 'A caregiver'} finished the visit for ${recipient}.`,
          occurredAt: visit.clockOutAt,
        });
      }
    }
    return items
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, ACTIVITY_LIMIT);
  }

  private buildPerformance(
    visits: Visit[],
    today: Date,
    ratingAverage: number | null,
    ratingCount: number,
    openTasks: number,
  ): PerformanceSnapshot {
    const total = visits.length;
    const completed = visits.filter((v) => v.status === VisitStatus.Completed).length;
    const deltas = this.arrivalDeltas(visits, today);
    const averageArrival =
      deltas.length === 0
        ? null
        : Math.round(deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length);

    return {
      completionRatePercent: total === 0 ? 0 : Math.round((completed / total) * 100),
      averageArrivalDeltaMinutes: averageArrival,
      clientSatisfaction: ratingAverage === null ? null : Math.round(ratingAverage * 10) / 10,
      clientSatisfactionCount: ratingCount,
      openTasks,
      // Deferred: multi currency, cannot be summed into one figure. See the DTO.
      revenueTodayMinor: null,
    };
  }

  /** Arrival delta in minutes for each clocked in visit; negative is early. */
  private arrivalDeltas(visits: Visit[], today: Date): number[] {
    const deltas: number[] = [];
    for (const visit of visits) {
      if (visit.clockInAt === null) {
        continue;
      }
      const scheduledStart = today.getTime() + visit.window.startMinute * 60_000;
      deltas.push(Math.round((visit.clockInAt.getTime() - scheduledStart) / 60_000));
    }
    return deltas;
  }

  /**
   * A composite quality score (0 to 100) blending today's completion rate, on time
   * arrival rate and client satisfaction. Only the components with data contribute,
   * reweighted; null when nothing is measurable yet.
   */
  private careQualityScore(
    visits: Visit[],
    today: Date,
    ratingAverage: number | null,
  ): number | null {
    const components: { weight: number; fraction: number }[] = [];

    const total = visits.length;
    if (total > 0) {
      const completed = visits.filter((v) => v.status === VisitStatus.Completed).length;
      components.push({ weight: 0.4, fraction: completed / total });
    }

    const deltas = this.arrivalDeltas(visits, today);
    if (deltas.length > 0) {
      const onTime = deltas.filter((delta) => delta <= ON_TIME_GRACE_MINUTES).length;
      components.push({ weight: 0.3, fraction: onTime / deltas.length });
    }

    if (ratingAverage !== null) {
      components.push({ weight: 0.3, fraction: ratingAverage / 5 });
    }

    if (components.length === 0) {
      return null;
    }
    const weightSum = components.reduce((sum, c) => sum + c.weight, 0);
    const weighted = components.reduce((sum, c) => sum + c.weight * c.fraction, 0);
    return Math.round((weighted / weightSum) * 100);
  }

  /** Idempotently raise late, missed and certification alerts for current problems. */
  private async detectAlerts(
    visits: Visit[],
    nowMinute: number,
    now: Date,
    recipientName: Map<string, string>,
    caregiverName: Map<string, string>,
  ): Promise<void> {
    for (const visit of visits) {
      if (visit.status !== VisitStatus.Scheduled || visit.caregiverId === null) {
        continue;
      }
      const lateBy = nowMinute - visit.window.startMinute;
      if (lateBy < LATE_THRESHOLD_MINUTES) {
        continue;
      }
      const caregiver = caregiverName.get(visit.caregiverId) ?? 'The caregiver';
      const recipient = recipientName.get(visit.careRecipientId) ?? 'a recipient';

      if (lateBy >= MISSED_THRESHOLD_MINUTES) {
        if (!(await this.alerts.existsOpenForVisit(AlertType.MissedClockIn, visit.id))) {
          await this.raiseAlert.execute({
            type: AlertType.MissedClockIn,
            severity: AlertSeverity.Critical,
            title: 'Missed clock in',
            description: `${caregiver} has not clocked in for the ${recipient} visit.`,
            relatedVisitId: visit.id,
            relatedCaregiverId: visit.caregiverId,
            relatedCareRecipientId: visit.careRecipientId,
          });
        }
      } else if (!(await this.alerts.existsOpenForVisit(AlertType.LateCaregiver, visit.id))) {
        await this.raiseAlert.execute({
          type: AlertType.LateCaregiver,
          severity: AlertSeverity.High,
          title: 'Late caregiver',
          description: `${caregiver} is ${lateBy} min late for the ${recipient} visit.`,
          relatedVisitId: visit.id,
          relatedCaregiverId: visit.caregiverId,
          relatedCareRecipientId: visit.careRecipientId,
        });
      }
    }

    const cutoff = new Date(now.getTime() + CERT_EXPIRY_WINDOW_DAYS * MS_PER_DAY);
    const expiring = await this.certifications.listExpiringBefore(cutoff);
    for (const certification of expiring) {
      const days = certification.daysUntilExpiry(now);
      if (days < 0) {
        continue;
      }
      if (
        await this.alerts.existsOpenForCaregiver(
          AlertType.CertificationExpiring,
          certification.caregiverId,
        )
      ) {
        continue;
      }
      await this.raiseAlert.execute({
        type: AlertType.CertificationExpiring,
        severity: AlertSeverity.Medium,
        title: 'Certification expiring',
        description: `${certification.name} certification expires in ${days} day${days === 1 ? '' : 's'}.`,
        relatedCaregiverId: certification.caregiverId,
      });
    }
  }
}
