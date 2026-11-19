import { Inject, Injectable } from '@nestjs/common';
import { CareFrequency } from '@modules/care-recipients/domain/care-frequency.enum';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { Weekday } from '@modules/care-recipients/domain/weekday.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { VisitWindow } from '../../domain/value-objects/visit-window.vo';
import { Visit } from '../../domain/visit.entity';
import { VISIT_REPOSITORY, VisitRepository } from '../../domain/visit.repository';
import { VisitType } from '../../domain/visit-type.enum';
import {
  OneOffVisitDetails,
  SubscriptionVisitDetails,
  VisitScheduler,
} from '../ports/visit-scheduler.port';

const MINUTES_IN_DAY = 1440;
/** Fallbacks when the care schedule leaves the time open: 09:00 for four hours. */
const DEFAULT_START_MINUTE = 9 * 60;
const DEFAULT_DURATION_MINUTES = 4 * 60;
/**
 * How far ahead a newly active subscription generates visits. Rolling renewal
 * (generating the next window as each billing period comes due) is a scheduled
 * job that does not exist yet, so for now one activation seeds the first window.
 * shortcut: fixed 28 day horizon; replace with rolling generation when a
 * scheduler context exists.
 */
const SUBSCRIPTION_HORIZON_DAYS = 28;

// JS Date.getUTCDay(): 0 = Sunday .. 6 = Saturday.
const WEEKDAY_BY_INDEX: readonly Weekday[] = [
  Weekday.Sunday,
  Weekday.Monday,
  Weekday.Tuesday,
  Weekday.Wednesday,
  Weekday.Thursday,
  Weekday.Friday,
  Weekday.Saturday,
];

type Recurrence =
  | { kind: 'everyDay' }
  | { kind: 'weekdays'; days: Set<Weekday> }
  | { kind: 'once' }
  | { kind: 'none' };

/**
 * Turns a paid booking or an activated subscription into Unassigned visits. The
 * caregiver is left unset so the office assigns one through the admin Caregivers
 * panel; the recipient's identity, health and address are read live from the
 * care recipients context on the schedule reads, never duplicated here.
 */
@Injectable()
export class VisitSchedulerService implements VisitScheduler {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async scheduleOneOff(details: OneOffVisitDetails): Promise<void> {
    const window = this.windowFrom(details.startMinute, details.endMinute);
    if (window === null) {
      return;
    }
    await this.visits.save(this.unassignedVisit(details.careRecipientId, details.date, window));
  }

  async scheduleForSubscription(details: SubscriptionVisitDetails): Promise<void> {
    const recipient = await this.recipients.findById(details.careRecipientId);
    const schedule = recipient?.schedule ?? null;
    if (schedule === null) {
      // The office must set a care schedule before recurring visits can be derived.
      return;
    }

    const startMinute = schedule.startMinute ?? DEFAULT_START_MINUTE;
    const window = this.windowFrom(
      startMinute,
      startMinute + (schedule.visitDurationMinutes ?? DEFAULT_DURATION_MINUTES),
    );
    if (window === null) {
      return;
    }

    const recurrence = this.recurrenceFrom(schedule.frequency, schedule.days);
    const start = startOfUtcDay(details.startDate);

    if (recurrence.kind === 'none') {
      return;
    }
    if (recurrence.kind === 'once') {
      await this.visits.save(this.unassignedVisit(details.careRecipientId, start, window));
      return;
    }

    for (let offset = 0; offset < SUBSCRIPTION_HORIZON_DAYS; offset++) {
      const date = addUtcDays(start, offset);
      const include =
        recurrence.kind === 'everyDay' || recurrence.days.has(WEEKDAY_BY_INDEX[date.getUTCDay()]);
      if (include) {
        // shortcut: sequential saves (at most 28 on a one time activation); use a
        // batch insert if the horizon grows large.
        await this.visits.save(this.unassignedVisit(details.careRecipientId, date, window));
      }
    }
  }

  private recurrenceFrom(frequency: CareFrequency, days: Weekday[]): Recurrence {
    switch (frequency) {
      case CareFrequency.Daily:
      case CareFrequency.LiveInCare:
        return { kind: 'everyDay' };
      case CareFrequency.Weekly:
        return days.length === 0 ? { kind: 'none' } : { kind: 'weekdays', days: new Set(days) };
      case CareFrequency.OneTimeVisit:
        return { kind: 'once' };
      default:
        return { kind: 'none' };
    }
  }

  private windowFrom(startMinute: number, endMinute: number): VisitWindow | null {
    // A visit does not cross midnight in this model, so clamp the end to the day.
    const end = Math.min(endMinute, MINUTES_IN_DAY);
    if (startMinute < 0 || startMinute >= end) {
      return null;
    }
    return VisitWindow.create(startMinute, end);
  }

  private unassignedVisit(careRecipientId: string, date: Date, window: VisitWindow): Visit {
    return Visit.scheduleUnassigned({
      id: this.ids.generate(),
      careRecipientId,
      scheduledDate: date,
      window,
      type: VisitType.PersonalCare,
      now: this.clock.now(),
    });
  }
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MINUTES_IN_DAY * 60 * 1000);
}
