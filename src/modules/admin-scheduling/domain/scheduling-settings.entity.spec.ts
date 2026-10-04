import { Weekday } from '@modules/care-recipients/domain/weekday.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { SchedulingSettings } from './scheduling-settings.entity';

const NOW = new Date('2026-07-24T10:00:00.000Z');

describe('SchedulingSettings', () => {
  it('creates sensible defaults with Sunday closed', () => {
    const settings = SchedulingSettings.createDefault(NOW);
    const sunday = settings.businessHoursFor(Weekday.Sunday);
    const monday = settings.businessHoursFor(Weekday.Monday);
    expect(sunday?.open).toBe(false);
    expect(monday?.open).toBe(true);
    expect(monday?.openMinute).toBe(7 * 60);
    expect(settings.travel.minBufferMinutes).toBe(30);
    expect(settings.rules.requireCertificationMatch).toBe(true);
  });

  it('applies a default duration or the fallback', () => {
    const settings = SchedulingSettings.createDefault(NOW);
    settings.update({ defaultDurations: { WOUND_CARE: 60, PHYSICAL_THERAPY: 90 } }, NOW);
    expect(settings.defaultDurationMinutes('WOUND_CARE', 120)).toBe(60);
    expect(settings.defaultDurationMinutes('MORNING_CARE', 120)).toBe(120);
  });

  it('rejects a closing time that is not after the opening time', () => {
    const settings = SchedulingSettings.createDefault(NOW);
    expect(() =>
      settings.update(
        {
          businessHours: [
            { weekday: Weekday.Monday, open: true, openMinute: 600, closeMinute: 600 },
          ],
        },
        NOW,
      ),
    ).toThrow(ValidationException);
  });

  it('rejects a non positive default duration', () => {
    const settings = SchedulingSettings.createDefault(NOW);
    expect(() => settings.update({ defaultDurations: { WOUND_CARE: 0 } }, NOW)).toThrow(
      ValidationException,
    );
  });
});
