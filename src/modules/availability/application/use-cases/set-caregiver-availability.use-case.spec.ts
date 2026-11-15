import { ConflictDomainException, ValidationException } from '@shared/domain/domain-exception';
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

  it('assigns revision 1 on the first set and bumps it on each change', async () => {
    const day = { caregiverId: 'caregiver-1', date: new Date('2026-07-11T00:00:00.000Z') };
    const first = await useCase.execute({ ...day, slots: [{ startMinute: 480, endMinute: 540 }] });
    expect(first.revision).toBe(1);

    const second = await useCase.execute({ ...day, slots: [{ startMinute: 600, endMinute: 660 }] });
    expect(second.revision).toBe(2);
  });

  it('rejects a stale expectedRevision as a conflict', async () => {
    const day = { caregiverId: 'caregiver-1', date: new Date('2026-07-11T00:00:00.000Z') };
    const first = await useCase.execute({ ...day, slots: [{ startMinute: 480, endMinute: 540 }] });
    // Another device bumps the day to revision 2.
    await useCase.execute({ ...day, slots: [{ startMinute: 540, endMinute: 600 }] });

    await expect(
      useCase.execute({
        ...day,
        slots: [{ startMinute: 720, endMinute: 780 }],
        expectedRevision: first.revision,
      }),
    ).rejects.toBeInstanceOf(ConflictDomainException);
  });

  it('applies a matching expectedRevision and overwrites unconditionally when omitted', async () => {
    const day = { caregiverId: 'caregiver-1', date: new Date('2026-07-11T00:00:00.000Z') };
    const first = await useCase.execute({ ...day, slots: [{ startMinute: 480, endMinute: 540 }] });

    const matched = await useCase.execute({
      ...day,
      slots: [{ startMinute: 600, endMinute: 660 }],
      expectedRevision: first.revision,
    });
    expect(matched.revision).toBe(2);

    // No expectedRevision forces an overwrite regardless of the current revision.
    const forced = await useCase.execute({ ...day, slots: [{ startMinute: 840, endMinute: 900 }] });
    expect(forced.revision).toBe(3);
    expect(forced.slots).toEqual([{ startMinute: 840, endMinute: 900 }]);
  });
});
