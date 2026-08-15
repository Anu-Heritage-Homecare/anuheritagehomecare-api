import { fakeBookingConfig, fixedClock } from '../../test-support/doubles';
import { GetAvailabilityUseCase } from './get-availability.use-case';

describe('GetAvailabilityUseCase', () => {
  const useCase = new GetAvailabilityUseCase(fakeBookingConfig(8, 21), fixedClock);

  it('offers every hourly slot within business hours for a future date', () => {
    const result = useCase.execute({ date: '2026-07-28' });

    expect(result.slots).toHaveLength(14);
    expect(result.slots[0]).toEqual({ startTime: '08:00', available: true });
    expect(result.slots[result.slots.length - 1]).toEqual({ startTime: '21:00', available: true });
  });

  it('closes every slot on a past date', () => {
    const result = useCase.execute({ date: '2020-01-01' });

    expect(result.slots.every((slot) => !slot.available)).toBe(true);
  });
});
