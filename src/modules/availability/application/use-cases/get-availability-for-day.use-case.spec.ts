import { CaregiverAvailability } from '../../domain/caregiver-availability.entity';
import { AvailabilitySlot } from '../../domain/value-objects/availability-slot.vo';
import {
  FIXED_NOW,
  InMemoryCaregiverAvailabilityRepository,
  fixedClock,
} from '../../test-support/doubles';
import { BookedSlot, BookedSlotsDirectory } from '../ports/booked-slots.directory';
import { GetAvailabilityForDayUseCase } from './get-availability-for-day.use-case';

function bookedDirectory(slots: BookedSlot[]): BookedSlotsDirectory {
  return { forCaregiverOnDay: () => Promise.resolve(slots) };
}

describe('GetAvailabilityForDayUseCase', () => {
  it('composes the declared available windows with the booked slots for the day', async () => {
    const repo = new InMemoryCaregiverAvailabilityRepository();
    await repo.save(
      CaregiverAvailability.create({
        id: 'a1',
        caregiverId: 'cg1',
        date: FIXED_NOW,
        // 08:00 to 11:00 available (480..660).
        slots: [AvailabilitySlot.create(480, 660)],
        now: FIXED_NOW,
      }),
    );
    const useCase = new GetAvailabilityForDayUseCase(
      repo,
      // A visit booked 14:00 to 15:00 (840..900).
      bookedDirectory([{ startMinute: 840, endMinute: 900 }]),
      fixedClock,
    );

    const result = await useCase.execute({ caregiverId: 'cg1', date: FIXED_NOW });

    expect(result.date).toBe('2026-07-11');
    expect(result.availableSlots).toEqual([{ startMinute: 480, endMinute: 660 }]);
    expect(result.bookedSlots).toEqual([{ startMinute: 840, endMinute: 900 }]);
  });

  it('returns empty available slots for a day with no record, still surfacing booked slots', async () => {
    const useCase = new GetAvailabilityForDayUseCase(
      new InMemoryCaregiverAvailabilityRepository(),
      bookedDirectory([{ startMinute: 540, endMinute: 600 }]),
      fixedClock,
    );

    const result = await useCase.execute({ caregiverId: 'cg1' });

    expect(result.availableSlots).toEqual([]);
    expect(result.bookedSlots).toEqual([{ startMinute: 540, endMinute: 600 }]);
  });
});
