import { Inject, Injectable } from '@nestjs/common';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { Visit } from '@modules/visits/domain/visit.entity';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import {
  CaregiverTimesheetDirectory,
  TimesheetEntry,
  TimesheetEntryKind,
} from '../../application/ports/caregiver-timesheet.port';

/**
 * Adapter satisfying the earnings CaregiverTimesheetDirectory port by delegating
 * to the visits repository and projecting each visit down to the minutes it
 * contributes. Completed visits are approved and counted from their clocked in and
 * out times (minus breaks); scheduled or in progress visits are pending and
 * counted from their planned window; cancelled and missed visits are dropped. This
 * keeps the earnings application layer decoupled from the visit domain shape.
 */
@Injectable()
export class VisitsCaregiverTimesheet implements CaregiverTimesheetDirectory {
  constructor(@Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository) {}

  async listForPeriod(
    caregiverId: string,
    from: Date,
    toInclusive: Date,
  ): Promise<TimesheetEntry[]> {
    const visits = await this.visits.listForCaregiverInRange(caregiverId, from, toInclusive);
    const entries: TimesheetEntry[] = [];

    for (const visit of visits) {
      const kind = VisitsCaregiverTimesheet.classify(visit.status);
      if (kind === null) {
        continue;
      }
      const minutes =
        kind === TimesheetEntryKind.Approved
          ? VisitsCaregiverTimesheet.workedMinutes(visit)
          : VisitsCaregiverTimesheet.windowMinutes(visit);
      entries.push({ kind, scheduledDate: visit.scheduledDate, minutes });
    }

    return entries;
  }

  private static classify(status: VisitStatus): TimesheetEntryKind | null {
    switch (status) {
      case VisitStatus.Completed:
        return TimesheetEntryKind.Approved;
      case VisitStatus.Scheduled:
      case VisitStatus.InProgress:
      case VisitStatus.OnBreak:
        return TimesheetEntryKind.Pending;
      default:
        return null;
    }
  }

  private static workedMinutes(visit: Visit): number {
    if (visit.clockInAt === null || visit.clockOutAt === null) {
      return VisitsCaregiverTimesheet.windowMinutes(visit);
    }
    const grossMinutes = Math.floor(
      (visit.clockOutAt.getTime() - visit.clockInAt.getTime()) / 60000,
    );
    const breakMinutes = Math.floor(visit.breakSeconds / 60);
    return Math.max(0, grossMinutes - breakMinutes);
  }

  private static windowMinutes(visit: Visit): number {
    return visit.window.endMinute - visit.window.startMinute;
  }
}
