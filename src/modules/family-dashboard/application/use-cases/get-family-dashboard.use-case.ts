import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ageInYears, startOfUtcDay } from '../dashboard-date.util';
import {
  DashboardRecipientResult,
  DashboardUpdateResult,
  FamilyDashboardResult,
  RecipientCareState,
} from '../dto/family-dashboard.result';
import {
  DashboardRecipientView,
  DashboardUserView,
  DashboardVisitView,
  FAMILY_RECIPIENT_DIRECTORY,
  FAMILY_USER_DIRECTORY,
  FAMILY_VISIT_DIRECTORY,
  FamilyRecipientDirectory,
  FamilyUserDirectory,
  FamilyVisitDirectory,
} from '../ports/family-dashboard-directories.port';

export interface GetFamilyDashboardQuery {
  ownerId: string;
}

const MAX_UPDATES = 10;

interface DashboardEvent {
  at: Date;
  kind: DashboardUpdateResult['kind'];
  label: string;
}

/**
 * Use case: the family owner home dashboard. It aggregates, for the recipients
 * the owner has, today's visit and the care recorded on it: the recipient card,
 * today's progress, the recent activity feed and the assigned caregiver. Every
 * read is scoped to the owner, and the day's visits and caregiver names are each
 * fetched in a single batched query to avoid a query per recipient.
 */
@Injectable()
export class GetFamilyDashboardUseCase {
  constructor(
    @Inject(FAMILY_RECIPIENT_DIRECTORY) private readonly recipients: FamilyRecipientDirectory,
    @Inject(FAMILY_VISIT_DIRECTORY) private readonly visits: FamilyVisitDirectory,
    @Inject(FAMILY_USER_DIRECTORY) private readonly users: FamilyUserDirectory,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: GetFamilyDashboardQuery): Promise<FamilyDashboardResult> {
    const now = this.clock.now();
    const recipients = await this.recipients.listActiveForOwner(query.ownerId);
    const recipientIds = recipients.map((recipient) => recipient.id);

    const day = startOfUtcDay(now);
    const visits =
      recipientIds.length === 0
        ? []
        : await this.visits.listForRecipientsOnDay(recipientIds, day, day);
    const visitByRecipient = this.pickTodaysVisitPerRecipient(visits);

    const caregiverIds = [
      ...new Set(
        [...visitByRecipient.values()]
          .map((visit) => visit.caregiverId)
          .filter((id): id is string => id !== null),
      ),
    ];
    const users = await this.users.findByIds([query.ownerId, ...caregiverIds]);
    const owner = users.get(query.ownerId);

    const recipientResults = recipients.map((recipient) =>
      this.buildRecipient(recipient, visitByRecipient.get(recipient.id), users, now),
    );

    return {
      greeting: {
        ownerFirstName: owner?.firstName ?? '',
        recipientName: recipients[0]?.name ?? null,
      },
      recipients: recipientResults,
    };
  }

  private pickTodaysVisitPerRecipient(
    visits: DashboardVisitView[],
  ): Map<string, DashboardVisitView> {
    const byRecipient = new Map<string, DashboardVisitView>();
    for (const visit of visits) {
      const current = byRecipient.get(visit.careRecipientId);
      if (current === undefined || this.isMoreRelevant(visit, current)) {
        byRecipient.set(visit.careRecipientId, visit);
      }
    }
    return byRecipient;
  }

  /** An in progress visit wins, then a scheduled one, then the earliest start. */
  private isMoreRelevant(candidate: DashboardVisitView, current: DashboardVisitView): boolean {
    const byPriority = this.statusPriority(candidate.status) - this.statusPriority(current.status);
    if (byPriority !== 0) {
      return byPriority > 0;
    }
    return candidate.startMinute < current.startMinute;
  }

  private statusPriority(status: string): number {
    if (status === 'IN_PROGRESS' || status === 'ON_BREAK') {
      return 3;
    }
    if (status === 'SCHEDULED') {
      return 2;
    }
    return 1;
  }

  private buildRecipient(
    recipient: DashboardRecipientView,
    visit: DashboardVisitView | undefined,
    users: Map<string, DashboardUserView>,
    now: Date,
  ): DashboardRecipientResult {
    const base = {
      id: recipient.id,
      name: recipient.name,
      gender: recipient.gender,
      age: ageInYears(recipient.dateOfBirth, now),
      photoKey: recipient.photoKey,
    };

    if (visit === undefined) {
      return { ...base, careState: 'NO_VISIT_TODAY', todayVisit: null, recentUpdates: [] };
    }

    const completed = visit.tasks.filter((task) => task.completed).length;
    const total = visit.tasks.length;
    const caregiver = visit.caregiverId === null ? undefined : users.get(visit.caregiverId);

    return {
      ...base,
      careState: this.careState(visit.status),
      todayVisit: {
        id: visit.id,
        status: visit.status,
        startedAt: visit.clockInAt === null ? null : visit.clockInAt.toISOString(),
        scheduledStartMinute: visit.startMinute,
        estimatedFinishMinute: visit.endMinute,
        progress: {
          completed,
          total,
          percent: total === 0 ? 0 : Math.round((completed / total) * 100),
        },
        tasks: visit.tasks.map((task) => ({ label: task.label, completed: task.completed })),
        caregiver:
          caregiver === undefined
            ? null
            : {
                id: caregiver.id,
                name: `${caregiver.firstName} ${caregiver.lastName}`.trim(),
                photoKey: caregiver.photoKey,
              },
      },
      recentUpdates: this.buildUpdates(recipient, visit),
    };
  }

  private buildUpdates(
    recipient: DashboardRecipientView,
    visit: DashboardVisitView,
  ): DashboardUpdateResult[] {
    const medicationNames = new Map(recipient.medications.map((med) => [med.id, med.name]));
    const events: DashboardEvent[] = [];

    for (const event of visit.medicationEvents) {
      const name = medicationNames.get(event.medicationId) ?? 'Medication';
      events.push({
        at: event.recordedAt,
        kind: 'MEDICATION',
        label: this.medicationLabel(name, event.outcome),
      });
    }
    for (const event of visit.vitalsEvents) {
      events.push({
        at: event.recordedAt,
        kind: 'VITALS',
        label: event.hasBloodPressure ? 'Blood pressure recorded' : 'Vitals recorded',
      });
    }
    for (const task of visit.tasks) {
      if (task.completedAt !== null) {
        events.push({ at: task.completedAt, kind: 'TASK', label: `${task.label} completed` });
      }
    }

    return events
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, MAX_UPDATES)
      .map((event) => ({ at: event.at.toISOString(), kind: event.kind, label: event.label }));
  }

  private medicationLabel(name: string, outcome: string): string {
    switch (outcome) {
      case 'ADMINISTERED':
        return `${name} given`;
      case 'REFUSED':
        return `${name} refused`;
      case 'OUT_OF_STOCK':
        return `${name} out of stock`;
      case 'PATIENT_ASLEEP':
        return `${name} skipped, patient asleep`;
      default:
        return `${name} recorded`;
    }
  }

  private careState(status: string): RecipientCareState {
    switch (status) {
      case 'IN_PROGRESS':
        return 'RECEIVING_CARE';
      case 'ON_BREAK':
        return 'ON_BREAK';
      case 'SCHEDULED':
        return 'SCHEDULED';
      case 'COMPLETED':
        return 'COMPLETED';
      default:
        return 'NO_VISIT_TODAY';
    }
  }
}
