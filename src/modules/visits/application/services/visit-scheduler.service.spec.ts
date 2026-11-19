import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { CareSchedule } from '@modules/care-recipients/domain/value-objects/care-schedule.vo';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { Visit } from '../../domain/visit.entity';
import { VisitRepository } from '../../domain/visit.repository';
import { VisitStatus } from '../../domain/visit-status.enum';
import { VisitSchedulerService } from './visit-scheduler.service';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const clock: Clock = { now: () => NOW };

function sequentialIds(): IdGenerator {
  let n = 0;
  return { generate: () => `visit-${++n}` };
}

function visitRepo(): VisitRepository & { saved: Visit[] } {
  const saved: Visit[] = [];
  return {
    saved,
    save: (v) => {
      saved.push(v);
      return Promise.resolve();
    },
    findById: () => Promise.resolve(null),
    listForCaregiverInRange: () => Promise.resolve([]),
    listForCareRecipientsInRange: () => Promise.resolve([]),
    listForDateRange: () => Promise.resolve([]),
    findCurrentForCareRecipient: () => Promise.resolve(null),
    listCompletedForCareRecipient: () => Promise.resolve({ visits: [], total: 0 }),
  };
}

function recipientRepo(schedule: CareSchedule | null): CareRecipientRepository {
  const recipient = { schedule } as unknown as CareRecipient;
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(schedule === null ? null : recipient),
    findByIds: () => Promise.resolve([]),
    listByOwner: () => Promise.resolve([]),
  };
}

function schedule(frequency: string, days: string[]): CareSchedule {
  return CareSchedule.create({
    frequency,
    estimatedStartDate: new Date('2026-01-05T00:00:00.000Z'),
    expectedDuration: '1 month',
    days,
    startMinute: 540,
    visitDurationMinutes: 240,
  });
}

// 2026-01-05 is a Monday (getUTCDay() === 1).
const MONDAY_START = new Date('2026-01-05T00:00:00.000Z');

describe('VisitSchedulerService', () => {
  describe('scheduleForBooking', () => {
    it('creates one unassigned scheduled visit on the service date and window', async () => {
      const visits = visitRepo();
      const service = new VisitSchedulerService(
        visits,
        recipientRepo(null),
        clock,
        sequentialIds(),
      );

      await service.scheduleForBooking({
        careRecipientId: 'care-1',
        serviceDate: MONDAY_START,
        startMinute: 540,
        endMinute: 900,
      });

      expect(visits.saved).toHaveLength(1);
      const visit = visits.saved[0];
      expect(visit.caregiverId).toBeNull();
      expect(visit.status).toBe(VisitStatus.Scheduled);
      expect(visit.careRecipientId).toBe('care-1');
      expect(visit.window.startMinute).toBe(540);
      expect(visit.window.endMinute).toBe(900);
    });

    it('clamps a window that would cross midnight to the end of the day', async () => {
      const visits = visitRepo();
      const service = new VisitSchedulerService(
        visits,
        recipientRepo(null),
        clock,
        sequentialIds(),
      );

      await service.scheduleForBooking({
        careRecipientId: 'care-1',
        serviceDate: MONDAY_START,
        startMinute: 1380,
        endMinute: 1620,
      });

      expect(visits.saved[0].window.endMinute).toBe(1440);
    });
  });

  describe('scheduleForSubscription', () => {
    it('generates weekly visits only on the scheduled weekdays across the horizon', async () => {
      const visits = visitRepo();
      const service = new VisitSchedulerService(
        visits,
        recipientRepo(schedule('WEEKLY', ['MONDAY', 'WEDNESDAY', 'FRIDAY'])),
        clock,
        sequentialIds(),
      );

      await service.scheduleForSubscription({ careRecipientId: 'care-1', startDate: MONDAY_START });

      // 28 day horizon from a Monday: 4 each of Mon, Wed, Fri.
      expect(visits.saved).toHaveLength(12);
      const weekdays = new Set(visits.saved.map((v) => v.scheduledDate.getUTCDay()));
      expect([...weekdays].sort()).toEqual([1, 3, 5]);
      expect(visits.saved.every((v) => v.caregiverId === null)).toBe(true);
      expect(visits.saved[0].window.startMinute).toBe(540);
      expect(visits.saved[0].window.endMinute).toBe(780);
    });

    it('generates a daily visit for every day of the horizon', async () => {
      const visits = visitRepo();
      const service = new VisitSchedulerService(
        visits,
        recipientRepo(schedule('DAILY', [])),
        clock,
        sequentialIds(),
      );

      await service.scheduleForSubscription({ careRecipientId: 'care-1', startDate: MONDAY_START });

      expect(visits.saved).toHaveLength(28);
    });

    it('generates nothing when the recipient has no care schedule', async () => {
      const visits = visitRepo();
      const service = new VisitSchedulerService(
        visits,
        recipientRepo(null),
        clock,
        sequentialIds(),
      );

      await service.scheduleForSubscription({ careRecipientId: 'care-1', startDate: MONDAY_START });

      expect(visits.saved).toHaveLength(0);
    });
  });
});
