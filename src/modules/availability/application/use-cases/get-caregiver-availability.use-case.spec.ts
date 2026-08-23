import { ValidationException } from '@shared/domain/domain-exception';
import { CaregiverAvailability } from '../../domain/caregiver-availability.entity';
import { AvailabilitySlot } from '../../domain/value-objects/availability-slot.vo';
import {
  FIXED_NOW,
  InMemoryCaregiverAvailabilityRepository,
  fixedClock,
} from '../../test-support/doubles';
import { GetCaregiverAvailabilityUseCase } from './get-caregiver-availability.use-case';

describe('GetCaregiverAvailabilityUseCase', () => {
  let repository: InMemoryCaregiverAvailabilityRepository;
  let useCase: GetCaregiverAvailabilityUseCase;

  beforeEach(() => {
    repository = new InMemoryCaregiverAvailabilityRepository();
    useCase = new GetCaregiverAvailabilityUseCase(repository, fixedClock);
  });

  async function seed(caregiverId: string, isoDate: string, startMinute: number): Promise<void> {
    await repository.save(
      CaregiverAvailability.create({
        id: `${caregiverId}-${isoDate}`,
        caregiverId,
        date: new Date(`${isoDate}T00:00:00.000Z`),
        slots: [AvailabilitySlot.create(startMinute, startMinute + 60)],
        now: FIXED_NOW,
      }),
    );
  }

  it('returns a single day when no range is given (defaults to today)', async () => {
    await seed('caregiver-1', '2026-07-11', 8 * 60);
    await seed('caregiver-1', '2026-07-12', 9 * 60);

    const result = await useCase.execute({ caregiverId: 'caregiver-1' });

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-07-11');
  });

  it('returns every day in an inclusive range, in date order', async () => {
    await seed('caregiver-1', '2026-07-11', 8 * 60);
    await seed('caregiver-1', '2026-07-13', 10 * 60);

    const result = await useCase.execute({
      caregiverId: 'caregiver-1',
      from: new Date('2026-07-11T00:00:00.000Z'),
      to: new Date('2026-07-13T00:00:00.000Z'),
    });

    expect(result.map((day) => day.date)).toEqual(['2026-07-11', '2026-07-13']);
  });

  it('never returns another caregiver availability', async () => {
    await seed('caregiver-2', '2026-07-11', 8 * 60);

    const result = await useCase.execute({ caregiverId: 'caregiver-1' });

    expect(result).toEqual([]);
  });

  it('rejects a range whose end precedes its start', async () => {
    await expect(
      useCase.execute({
        caregiverId: 'caregiver-1',
        from: new Date('2026-07-13T00:00:00.000Z'),
        to: new Date('2026-07-11T00:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
