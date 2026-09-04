import { ValidationException } from '@shared/domain/domain-exception';
import { CareFrequency } from '../care-frequency.enum';
import { Weekday } from '../weekday.enum';
import { CareSchedule } from './care-schedule.vo';

describe('CareSchedule', () => {
  it('creates a valid schedule and normalises the frequency', () => {
    const schedule = CareSchedule.create({
      frequency: 'live_in_care',
      estimatedStartDate: new Date('2026-08-20'),
      expectedDuration: '  6 to 12 months  ',
    });

    expect(schedule.frequency).toBe(CareFrequency.LiveInCare);
    expect(schedule.expectedDuration).toBe('6 to 12 months');
  });

  it('rejects an unknown frequency', () => {
    expect(() =>
      CareSchedule.create({
        frequency: 'fortnightly',
        estimatedStartDate: new Date('2026-08-20'),
        expectedDuration: 'Ongoing',
      }),
    ).toThrow(ValidationException);
  });

  it('requires an expected duration', () => {
    expect(() =>
      CareSchedule.create({
        frequency: 'DAILY',
        estimatedStartDate: new Date('2026-08-20'),
        expectedDuration: '   ',
      }),
    ).toThrow(ValidationException);
  });

  it('normalises the recurring pattern: dedupes and orders the days', () => {
    const schedule = CareSchedule.create({
      frequency: 'WEEKLY',
      estimatedStartDate: new Date('2026-08-20'),
      expectedDuration: '3 months',
      days: ['friday', 'monday', 'wednesday', 'monday'],
      startMinute: 540,
      visitDurationMinutes: 180,
    });

    expect(schedule.days).toEqual([Weekday.Monday, Weekday.Wednesday, Weekday.Friday]);
    expect(schedule.startMinute).toBe(540);
    expect(schedule.visitDurationMinutes).toBe(180);
  });

  it('defaults the recurring pattern to empty when not provided', () => {
    const schedule = CareSchedule.create({
      frequency: 'DAILY',
      estimatedStartDate: new Date('2026-08-20'),
      expectedDuration: 'Ongoing',
    });

    expect(schedule.days).toEqual([]);
    expect(schedule.startMinute).toBeNull();
    expect(schedule.visitDurationMinutes).toBeNull();
  });

  it('rejects an invalid weekday, start time or visit duration', () => {
    const base = {
      frequency: 'WEEKLY',
      estimatedStartDate: new Date('2026-08-20'),
      expectedDuration: '3 months',
    };
    expect(() => CareSchedule.create({ ...base, days: ['someday'] })).toThrow(ValidationException);
    expect(() => CareSchedule.create({ ...base, startMinute: 1440 })).toThrow(ValidationException);
    expect(() => CareSchedule.create({ ...base, visitDurationMinutes: 0 })).toThrow(
      ValidationException,
    );
  });
});
