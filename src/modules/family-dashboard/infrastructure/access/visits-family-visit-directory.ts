import { Inject, Injectable } from '@nestjs/common';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import {
  DashboardVisitView,
  FamilyVisitDirectory,
} from '../../application/ports/family-dashboard-directories.port';

/**
 * Adapts the visits context to the dashboard's visit port. Reads the day's visits
 * for the given recipients through the exported repository and projects the visit
 * plus its recorded activity (tasks, medication administrations, vitals).
 */
@Injectable()
export class VisitsFamilyVisitDirectory implements FamilyVisitDirectory {
  constructor(@Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository) {}

  async listForRecipientsOnDay(
    careRecipientIds: string[],
    from: Date,
    to: Date,
  ): Promise<DashboardVisitView[]> {
    const visits = await this.visits.listForCareRecipientsInRange(careRecipientIds, from, to);
    return visits.map((visit) => ({
      id: visit.id,
      careRecipientId: visit.careRecipientId,
      caregiverId: visit.caregiverId,
      status: String(visit.status),
      startMinute: visit.window.startMinute,
      endMinute: visit.window.endMinute,
      clockInAt: visit.clockInAt,
      clockOutAt: visit.clockOutAt,
      tasks: visit.tasks.map((task) => ({
        label: task.label,
        completed: task.completed,
        completedAt: task.completedAt,
      })),
      medicationEvents: visit.medicationAdministrations.map((administration) => ({
        medicationId: administration.medicationId,
        outcome: String(administration.outcome),
        recordedAt: administration.recordedAt,
      })),
      vitalsEvents: visit.vitals.map((reading) => ({
        hasBloodPressure: reading.systolic !== null || reading.diastolic !== null,
        recordedAt: reading.recordedAt,
      })),
    }));
  }
}
