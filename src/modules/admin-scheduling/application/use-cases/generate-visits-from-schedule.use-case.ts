import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { CareRecipientStatus } from '@modules/care-recipients/domain/care-recipient-status.enum';
import { Weekday } from '@modules/care-recipients/domain/weekday.enum';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { Visit } from '@modules/visits/domain/visit.entity';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { VisitType } from '@modules/visits/domain/visit-type.enum';
import { VisitWindow } from '@modules/visits/domain/value-objects/visit-window.vo';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';

export interface GenerateVisitsCommand {
  careRecipientId: string;
  from: Date;
  to: Date;
  /** The caregiver to staff every generated visit with. Null falls back to the
   * recipient's primary caregiver; if there is none the visits are left
   * Unassigned for the office to assign later. */
  caregiverId: string | null;
}

export interface GenerateVisitsResult {
  created: number;
  skipped: number;
  caregiverId: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
// shortcut: cap the horizon at a quarter so one click cannot create thousands of
// rows; raise this if the office needs to roster further ahead in one pass.
const MAX_RANGE_DAYS = 92;

const WEEKDAY_TO_JS_DAY: Record<Weekday, number> = {
  [Weekday.Sunday]: 0,
  [Weekday.Monday]: 1,
  [Weekday.Tuesday]: 2,
  [Weekday.Wednesday]: 3,
  [Weekday.Thursday]: 4,
  [Weekday.Friday]: 5,
  [Weekday.Saturday]: 6,
};

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Turn a care recipient's recurring care schedule (which weekdays, the start time
 * and how long each visit lasts) into real Visit rows across a date range. The
 * office triggers this after assigning a caregiver rather than it happening
 * automatically, so creating visits stays a deliberate, reviewable step.
 *
 * It is idempotent per day: a date that already has a visit for the recipient is
 * skipped, so re-running over an overlapping range never double books.
 */
@Injectable()
export class GenerateVisitsFromScheduleUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GenerateVisitsCommand): Promise<GenerateVisitsResult> {
    const recipient = await this.recipients.findById(command.careRecipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }
    if (recipient.status !== CareRecipientStatus.Active) {
      throw new ValidationException('Visits can only be generated for an active care recipient');
    }

    const schedule = recipient.schedule;
    if (
      schedule === null ||
      schedule.days.length === 0 ||
      schedule.startMinute === null ||
      schedule.visitDurationMinutes === null
    ) {
      throw new ValidationException(
        'This care recipient has no recurring care schedule (days, start time and visit length) to generate visits from',
      );
    }

    const from = startOfUtcDay(command.from);
    const to = startOfUtcDay(command.to);
    if (to.getTime() < from.getTime()) {
      throw new ValidationException('The end date must not be before the start date');
    }
    const spanDays = Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1;
    if (spanDays > MAX_RANGE_DAYS) {
      throw new ValidationException(`The date range cannot exceed ${MAX_RANGE_DAYS} days`);
    }

    const caregiverId = command.caregiverId ?? recipient.primaryCaregiverId;
    if (caregiverId !== null) {
      const caregiver = await this.users.findById(caregiverId);
      if (caregiver === null || caregiver.userType !== UserType.Caregiver) {
        throw new ValidationException('The assigned user is not a caregiver');
      }
    }

    const existing = await this.visits.listForCareRecipientsInRange([recipient.id], from, to);
    const takenDays = new Set(existing.map((visit) => isoDay(visit.scheduledDate)));
    const wantedJsDays = new Set(schedule.days.map((day) => WEEKDAY_TO_JS_DAY[day]));
    const window = VisitWindow.create(
      schedule.startMinute,
      schedule.startMinute + schedule.visitDurationMinutes,
    );
    const now = this.clock.now();

    let created = 0;
    let skipped = 0;
    for (let t = from.getTime(); t <= to.getTime(); t += DAY_MS) {
      const date = new Date(t);
      if (!wantedJsDays.has(date.getUTCDay())) {
        continue;
      }
      if (takenDays.has(isoDay(date))) {
        skipped += 1;
        continue;
      }

      const id = this.ids.generate();
      const visit =
        caregiverId === null
          ? Visit.scheduleUnassigned({
              id,
              careRecipientId: recipient.id,
              scheduledDate: date,
              window,
              type: VisitType.PersonalCare,
              now,
            })
          : Visit.schedule({
              id,
              caregiverId,
              careRecipientId: recipient.id,
              scheduledDate: date,
              window,
              type: VisitType.PersonalCare,
              now,
            });
      await this.visits.save(visit);
      takenDays.add(isoDay(date));
      created += 1;
    }

    return { created, skipped, caregiverId };
  }
}
