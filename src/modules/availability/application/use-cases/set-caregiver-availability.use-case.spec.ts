import { ValidationException } from '@shared/domain/domain-exception';
import {
  InMemoryCaregiverAvailabilityRepository,
  fixedClock,
  sequentialIds,
} from '../../test-support/doubles';
import { SetCaregiverAvailabilityUseCase } from './set-caregiver-availability.use-case';

describe('SetCaregiverAvailabilityUseCase', () => {
  let repository: InMemoryCaregiverAvailabilityRepository;
  let useCase: SetCaregiverAvailabilityUseCase;

  beforeEach(() => {
    repository = new InMemoryCaregiverAvailabilityRepository();
    useCase = new SetCaregiverAvailabilityUseCase(repository, sequentialIds(), fixedClock);
  });

  it('sets availability for a day and returns the ordered slots', async () => {
    const result = await useCase.execute({
      caregiverId: 'caregiver-1',
      date: new Date('2026-07-11T00:00:00.000Z'),
      slots: [
        { startMinute: 14 * 60, endMinute: 15 * 60 }, // 02:00 pm
        { startMinute: 8 * 60, endMinute: 9 * 60 }, // 08:00 am
      ],
    });

    expect(result.date).toBe('2026-07-11');
    expect(result.slots).toEqual([
      { startMinute: 8 * 60, endMinute: 9 * 60 },
      { startMinute: 14 * 60, endMinute: 15 * 60 },
    ]);
  });

  it('replaces the existing availability for the same day (idempotent per day)', async () => {
    const command = {
      caregiverId: 'caregiver-1',
      date: new Date('2026-07-11T00:00:00.000Z'),
    };
    await useCase.execute({ ...command, slots: [{ startMinute: 8 * 60, endMinute: 9 * 60 }] });

    const result = await useCase.execute({
      ...command,
      slots: [{ startMinute: 18 * 60, endMinute: 19 * 60 }],
    });

    expect(result.slots).toEqual([{ startMinute: 18 * 60, endMinute: 19 * 60 }]);
    expect(repository.store.size).toBe(1);
  });

  it('rejects overlapping slots', async () => {
    await expect(
      useCase.execute({
        caregiverId: 'caregiver-1',
        date: new Date('2026-07-11T00:00:00.000Z'),
        slots: [
          { startMinute: 8 * 60, endMinute: 10 * 60 },
          { startMinute: 9 * 60, endMinute: 11 * 60 },
        ],
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('accepts clearing availability with an empty set', async () => {
    const result = await useCase.execute({
      caregiverId: 'caregiver-1',
      date: new Date('2026-07-11T00:00:00.000Z'),
      slots: [],
    });

    expect(result.slots).toEqual([]);
  });
});
