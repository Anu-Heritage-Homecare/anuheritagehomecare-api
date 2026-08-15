import { ValidationException } from '@shared/domain/domain-exception';
import { CareFrequency } from '../care-frequency.enum';
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
});
