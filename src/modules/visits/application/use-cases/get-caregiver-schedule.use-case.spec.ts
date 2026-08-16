import { ValidationException } from '@shared/domain/domain-exception';
import { VisitStatus } from '../../domain/visit-status.enum';
import {
  FakeCareRecipientDirectory,
  InMemoryVisitRepository,
  buildSnapshot,
  buildVisit,
  fixedClock,
} from '../../test-support/doubles';
import { GetCaregiverScheduleUseCase } from './get-caregiver-schedule.use-case';

describe('GetCaregiverScheduleUseCase', () => {
  let visits: InMemoryVisitRepository;
  let recipients: FakeCareRecipientDirectory;
  let useCase: GetCaregiverScheduleUseCase;

  beforeEach(() => {
    visits = new InMemoryVisitRepository();
    recipients = new FakeCareRecipientDirectory();
    recipients.add(buildSnapshot());
    useCase = new GetCaregiverScheduleUseCase(visits, recipients, fixedClock);
  });

  it('defaults to today and returns the caregiver visits as cards', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));

    const result = await useCase.execute({ caregiverId: 'caregiver-1' });

    expect(result.from).toBe('2026-07-12');
    expect(result.to).toBe('2026-07-12');
    expect(result.visits).toHaveLength(1);
    expect(result.visits[0]).toMatchObject({
      id: 'v1',
      status: VisitStatus.InProgress,
      startMinute: 540,
      endMinute: 600,
    });
    expect(result.visits[0].recipient).toMatchObject({
      name: 'Eleanor Ross',
      age: 82,
      address: '123 Maple Street, Sunnyvale, CA 94086',
    });
  });

  it('orders the day chronologically', async () => {
    await visits.save(buildVisit({ id: 'late', startMinute: 14 * 60, endMinute: 15 * 60 }));
    await visits.save(buildVisit({ id: 'early', startMinute: 8 * 60, endMinute: 9 * 60 }));

    const result = await useCase.execute({ caregiverId: 'caregiver-1' });

    expect(result.visits.map((v) => v.id)).toEqual(['early', 'late']);
  });

  it('excludes visits belonging to another caregiver', async () => {
    await visits.save(buildVisit({ id: 'mine', caregiverId: 'caregiver-1' }));
    await visits.save(buildVisit({ id: 'theirs', caregiverId: 'caregiver-2' }));

    const result = await useCase.execute({ caregiverId: 'caregiver-1' });

    expect(result.visits.map((v) => v.id)).toEqual(['mine']);
  });

  it('filters by status when asked', async () => {
    await visits.save(buildVisit({ id: 'done', status: VisitStatus.Completed }));
    await visits.save(buildVisit({ id: 'open', status: VisitStatus.Scheduled }));

    const result = await useCase.execute({
      caregiverId: 'caregiver-1',
      status: VisitStatus.Completed,
    });

    expect(result.visits.map((v) => v.id)).toEqual(['done']);
  });

  it('reads an explicit date range', async () => {
    await visits.save(buildVisit({ id: 'inside', date: '2026-07-15' }));
    await visits.save(buildVisit({ id: 'outside', date: '2026-07-25' }));

    const result = await useCase.execute({
      caregiverId: 'caregiver-1',
      from: new Date('2026-07-13T00:00:00.000Z'),
      to: new Date('2026-07-19T00:00:00.000Z'),
    });

    expect(result.from).toBe('2026-07-13');
    expect(result.to).toBe('2026-07-19');
    expect(result.visits.map((v) => v.id)).toEqual(['inside']);
  });

  it('drops a visit whose recipient cannot be found', async () => {
    await visits.save(buildVisit({ id: 'orphan', careRecipientId: 'missing' }));

    const result = await useCase.execute({ caregiverId: 'caregiver-1' });

    expect(result.visits).toHaveLength(0);
  });

  it('rejects a range whose end precedes its start', async () => {
    await expect(
      useCase.execute({
        caregiverId: 'caregiver-1',
        from: new Date('2026-07-19T00:00:00.000Z'),
        to: new Date('2026-07-13T00:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
