import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  CAREGIVER_READ_MODEL,
  CaregiverReadModel,
  CaregiverScheduleTabView,
  CaregiverScheduleVisitView,
} from '../ports/caregiver-read.port';
import {
  CaregiverScheduleResult,
  CaregiverScheduleVisitResult,
} from '../dto/caregiver-schedule.result';

const DAY_MS = 86_400_000;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const UPCOMING_LIMIT = 5;
const BASIS_POINTS = 10_000;
/** A scheduled visit renders as "Confirmed" on this screen; other states show as is. */
const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Confirmed',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  MISSED: 'Missed',
};

interface GetCaregiverScheduleCommand {
  profileId: string;
  /** Any instant within the week to show; the week is normalised to its Monday. */
  weekOf: Date | null;
}

/**
 * The caregiver Schedule tab: the week's calendar of visits, the summary cards
 * (hours this week against the target load, visits scheduled, weekly availability),
 * the upcoming visits list and the availability settings. Read only; every figure
 * is derived server side from the visits, availability and pay rate.
 */
@Injectable()
export class GetCaregiverScheduleUseCase {
  constructor(
    @Inject(CAREGIVER_READ_MODEL) private readonly reads: CaregiverReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetCaregiverScheduleCommand): Promise<CaregiverScheduleResult> {
    const now = this.clock.now();
    const weekStart = startOfUtcWeek(command.weekOf ?? now);
    const view = await this.reads.scheduleTab(command.profileId, weekStart, now, UPCOMING_LIMIT);
    if (view === null) {
      throw new NotFoundDomainException('Caregiver not found');
    }

    const days = this.buildDays(view);
    const scheduledMinutes = view.weekVisits
      .filter((v) => v.status !== 'CANCELLED' && v.status !== 'MISSED')
      .reduce((sum, v) => sum + Math.max(0, v.endMinute - v.startMinute), 0);
    const availabilityDays = this.buildAvailability(view);
    const activeDays = availabilityDays.filter((d) => d.available);

    return {
      weekStart: view.weekStart.toISOString(),
      weekEnd: view.weekEnd.toISOString(),
      summary: {
        hoursScheduled: round1(scheduledMinutes / 60),
        targetHours: view.maxHoursPerWeek,
        loadPercent:
          view.maxHoursPerWeek === null || view.maxHoursPerWeek === 0
            ? null
            : Math.round((scheduledMinutes / 60 / view.maxHoursPerWeek) * 100),
        visitsScheduled: view.weekVisits.filter((v) => v.status !== 'CANCELLED').length,
        allConfirmed: view.weekVisits
          .filter((v) => v.status !== 'CANCELLED')
          .every((v) => v.status === 'SCHEDULED'),
        availabilityDayRange:
          activeDays.length === 0
            ? null
            : `${activeDays[0].dayLabel} - ${activeDays[activeDays.length - 1].dayLabel}`,
        standardWindow: standardWindow(availabilityDays),
      },
      days,
      upcomingVisits: view.upcomingVisits.map((v) => this.toUpcoming(v)),
      availabilitySettings: {
        days: availabilityDays,
        maxHoursPerWeek: view.maxHoursPerWeek,
        preferredShift: view.preferredShift,
        overtimeEligible:
          view.overtimeMultiplierBps !== null && view.overtimeMultiplierBps > BASIS_POINTS,
        overtimeRate:
          view.overtimeMultiplierBps === null
            ? null
            : round1(view.overtimeMultiplierBps / BASIS_POINTS),
      },
    };
  }

  private buildDays(view: CaregiverScheduleTabView): CaregiverScheduleResult['days'] {
    const byDay = new Map<number, CaregiverScheduleVisitView[]>();
    for (const visit of view.weekVisits) {
      const index = dayIndex(visit.scheduledDate, view.weekStart);
      const bucket = byDay.get(index) ?? [];
      bucket.push(visit);
      byDay.set(index, bucket);
    }
    return DAYS.map((label, index) => {
      const visits = byDay.get(index) ?? [];
      return {
        dayLabel: label,
        date: new Date(view.weekStart.getTime() + index * DAY_MS).toISOString(),
        offDuty: visits.length === 0,
        visits: visits.map((v) => ({
          time: formatMinute(v.startMinute),
          endTime: formatMinute(v.endMinute),
          recipientName: v.recipientName,
          visitType: v.visitType,
          status: STATUS_LABELS[v.status] ?? v.status,
        })),
      };
    });
  }

  private buildAvailability(
    view: CaregiverScheduleTabView,
  ): CaregiverScheduleResult['availabilitySettings']['days'] {
    const byDay = new Map(
      view.availability.map((day) => [dayIndex(day.date, view.weekStart), day]),
    );
    return DAYS.map((label, index) => {
      const day = byDay.get(index);
      const slots = day?.slots ?? [];
      return {
        dayLabel: label,
        available: slots.length > 0,
        window:
          slots.length === 0
            ? null
            : slots
                .map((s) => `${formatMinute(s.startMinute)} - ${formatMinute(s.endMinute)}`)
                .join(', '),
      };
    });
  }

  private toUpcoming(visit: CaregiverScheduleVisitView): CaregiverScheduleVisitResult {
    return {
      date: visit.scheduledDate.toISOString(),
      time: formatMinute(visit.startMinute),
      recipientName: visit.recipientName,
      visitType: visit.visitType,
      durationHours: round1(Math.max(0, visit.endMinute - visit.startMinute) / 60),
      status: STATUS_LABELS[visit.status] ?? visit.status,
    };
  }
}

/** Index in the Mon..Sun week for a date, relative to the week start. */
function dayIndex(date: Date, weekStart: Date): number {
  return Math.floor((startOfUtcDay(date).getTime() - weekStart.getTime()) / DAY_MS);
}

/** The most common availability window across the week, for the "standard" summary. */
function standardWindow(days: { available: boolean; window: string | null }[]): string | null {
  const counts = new Map<string, number>();
  for (const day of days) {
    if (day.window !== null) {
      counts.set(day.window, (counts.get(day.window) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [window, count] of counts) {
    if (count > bestCount) {
      best = window;
      bestCount = count;
    }
  }
  return best;
}

/** Midnight (UTC) of the day the instant falls on. */
function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

/** Monday (UTC) of the week the instant falls in. */
function startOfUtcWeek(value: Date): Date {
  const day = startOfUtcDay(value);
  const weekday = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - weekday * DAY_MS);
}

/** Format minutes from midnight as a 12 hour time, e.g. 480 -> 8:00 AM. */
function formatMinute(minute: number): string {
  const hour24 = Math.floor(minute / 60);
  const minutes = minute % 60;
  const period = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/** Round to one decimal place. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
