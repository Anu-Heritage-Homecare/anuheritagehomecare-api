import { Inject, Injectable } from '@nestjs/common';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { BookedSlot, BookedSlotsDirectory } from '../../application/ports/booked-slots.directory';

/** A cancelled or missed visit no longer occupies the caregiver's time. */
const BLOCKING_STATUSES: readonly VisitStatus[] = [
  VisitStatus.Scheduled,
  VisitStatus.InProgress,
  VisitStatus.OnBreak,
  VisitStatus.Completed,
];

/** Adapter that reads a caregiver's committed visits from the visits context. */
@Injectable()
export class VisitsBookedSlotsDirectory implements BookedSlotsDirectory {
  constructor(@Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository) {}

  async forCaregiverOnDay(caregiverId: string, day: Date): Promise<BookedSlot[]> {
    const visits = await this.visits.listForCaregiverInRange(caregiverId, day, day);
    return visits
      .filter((visit) => BLOCKING_STATUSES.includes(visit.status))
      .map((visit) => ({
        startMinute: visit.window.startMinute,
        endMinute: visit.window.endMinute,
      }))
      .sort((a, b) => a.startMinute - b.startMinute);
  }
}
