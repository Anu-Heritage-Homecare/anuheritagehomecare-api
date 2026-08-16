import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ValidationException } from '@shared/domain/domain-exception';
import { VisitStatus } from '../../domain/visit-status.enum';
import { VISIT_REPOSITORY, VisitRepository } from '../../domain/visit.repository';
import { ageInYears } from '../age.util';
import { ScheduleResult, VisitCardResult } from '../dto/visit-card.result';
import {
  CARE_RECIPIENT_DIRECTORY,
  CareRecipientDirectory,
} from '../ports/care-recipient-directory.port';
import { startOfUtcDay, toIsoDate } from '../schedule-date.util';

/** Widest range a single schedule request may span, to bound the query. */
const MAX_RANGE_DAYS = 62;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface GetCaregiverScheduleQuery {
  caregiverId: string;
  from?: Date;
  to?: Date;
  status?: VisitStatus;
}

/**
 * Use case: a caregiver's schedule for a single day or an inclusive date range.
 *
 * With no range it defaults to today from the clock. Visits are read in one
 * query and their recipients looked up in a single batch (no query per visit),
 * then projected into schedule cards with the recipient's age derived server side
 * so their date of birth never leaves the application layer.
 */
@Injectable()
export class GetCaregiverScheduleUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CARE_RECIPIENT_DIRECTORY) private readonly recipients: CareRecipientDirectory,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: GetCaregiverScheduleQuery): Promise<ScheduleResult> {
    const now = this.clock.now();
    const from = startOfUtcDay(query.from ?? now);
    const to = startOfUtcDay(query.to ?? query.from ?? now);

    if (to.getTime() < from.getTime()) {
      throw new ValidationException('The end date cannot be before the start date');
    }
    if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY_MS) {
      throw new ValidationException(`The schedule range cannot exceed ${MAX_RANGE_DAYS} days`);
    }

    const visits = await this.visits.listForCaregiverInRange(query.caregiverId, from, to);

    const recipientIds = [...new Set(visits.map((visit) => visit.careRecipientId))];
    const snapshots = await this.recipients.lookup(recipientIds);

    const cards: VisitCardResult[] = [];
    for (const visit of visits) {
      if (query.status !== undefined && visit.status !== query.status) {
        continue;
      }
      const recipient = snapshots.get(visit.careRecipientId);
      if (recipient === undefined) {
        continue;
      }
      cards.push({
        id: visit.id,
        status: visit.status,
        date: toIsoDate(visit.scheduledDate),
        startMinute: visit.window.startMinute,
        endMinute: visit.window.endMinute,
        recipient: {
          id: recipient.id,
          name: recipient.name,
          gender: recipient.gender,
          age: ageInYears(recipient.dateOfBirth, now),
          careNeeds: recipient.careNeeds,
          address: recipient.fullAddress,
          photoKey: recipient.photoKey,
        },
      });
    }

    return { from: toIsoDate(from), to: toIsoDate(to), visits: cards };
  }
}
