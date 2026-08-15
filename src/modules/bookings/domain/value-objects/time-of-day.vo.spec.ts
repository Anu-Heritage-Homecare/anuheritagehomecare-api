import { ValidationException } from '@shared/domain/domain-exception';
import { TimeOfDay } from './time-of-day.vo';

describe('TimeOfDay', () => {
  it('parses an on the hour time', () => {
    const time = TimeOfDay.fromString('09:00');
    expect(time.minutes).toBe(540);
    expect(time.hour).toBe(9);
    expect(time.toString()).toBe('09:00');
  });

  it('rejects a time that is not on the hour', () => {
    expect(() => TimeOfDay.fromString('09:30')).toThrow(ValidationException);
  });

  it('rejects a malformed time', () => {
    expect(() => TimeOfDay.fromString('9am')).toThrow(ValidationException);
    expect(() => TimeOfDay.fromString('24:00')).toThrow(ValidationException);
  });
});
