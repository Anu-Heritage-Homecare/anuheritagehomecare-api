import { UserType } from '@modules/identity/domain/user-type.enum';
import { User } from '@modules/identity/domain/user.entity';
import { UserRepository } from '@modules/identity/domain/user.repository';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { buildVisit, InMemoryVisitRepository } from '@modules/visits/test-support/doubles';
import { ValidationException } from '@shared/domain/domain-exception';
import { ReassignRecipientVisitsUseCase } from './reassign-recipient-visits.use-case';

const NOW = new Date('2026-07-24T10:00:00.000Z');
const clock = { now: () => NOW };
const R = 'recipient-1';

function userRepo(userType: UserType | null): UserRepository {
  const user = userType === null ? null : ({ userType } as User);
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(user),
    findByIds: () => Promise.resolve([]),
    findByEmail: () => Promise.resolve(null),
    existsByEmail: () => Promise.resolve(false),
    existsByPhone: () => Promise.resolve(false),
    countByType: () => Promise.resolve(0),
  };
}

/** Two future scheduled visits for caregiver A, plus noise that must be left alone. */
function seed(visits: InMemoryVisitRepository): Promise<void[]> {
  return Promise.all([
    visits.save(buildVisit({ id: 'f1', careRecipientId: R, caregiverId: 'A', date: '2026-08-01' })),
    visits.save(buildVisit({ id: 'f2', careRecipientId: R, caregiverId: 'A', date: '2026-08-05' })),
    // Past visit for A: outside the from-today window, never touched.
    visits.save(
      buildVisit({ id: 'past', careRecipientId: R, caregiverId: 'A', date: '2026-07-01' }),
    ),
    // Future visit for a different caregiver.
    visits.save(
      buildVisit({ id: 'other', careRecipientId: R, caregiverId: 'B', date: '2026-08-10' }),
    ),
    // Future but already completed: not scheduled, so not moved.
    visits.save(
      buildVisit({
        id: 'done',
        careRecipientId: R,
        caregiverId: 'A',
        date: '2026-08-12',
        status: VisitStatus.Completed,
      }),
    ),
  ]);
}

describe('ReassignRecipientVisitsUseCase', () => {
  it('moves only the future scheduled visits of the from caregiver to the new one', async () => {
    const visits = new InMemoryVisitRepository();
    await seed(visits);
    const result = await new ReassignRecipientVisitsUseCase(
      visits,
      userRepo(UserType.Caregiver),
      clock,
    ).execute({ careRecipientId: R, fromCaregiverId: 'A', toCaregiverId: 'B' });

    expect(result.updated).toBe(2);
    expect(visits.store.get('f1')!.caregiverId).toBe('B');
    expect(visits.store.get('f2')!.caregiverId).toBe('B');
    expect(visits.store.get('past')!.caregiverId).toBe('A');
    expect(visits.store.get('done')!.caregiverId).toBe('A');
  });

  it('unassigns the future scheduled visits when no caregiver is given', async () => {
    const visits = new InMemoryVisitRepository();
    await seed(visits);
    const result = await new ReassignRecipientVisitsUseCase(
      visits,
      userRepo(UserType.Caregiver),
      clock,
    ).execute({ careRecipientId: R, fromCaregiverId: 'A', toCaregiverId: null });

    expect(result.updated).toBe(2);
    expect(visits.store.get('f1')!.caregiverId).toBeNull();
    expect(visits.store.get('f2')!.caregiverId).toBeNull();
  });

  it('rejects moving to the same caregiver', async () => {
    const visits = new InMemoryVisitRepository();
    await expect(
      new ReassignRecipientVisitsUseCase(visits, userRepo(UserType.Caregiver), clock).execute({
        careRecipientId: R,
        fromCaregiverId: 'A',
        toCaregiverId: 'A',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rejects a target who is not a caregiver', async () => {
    const visits = new InMemoryVisitRepository();
    await expect(
      new ReassignRecipientVisitsUseCase(visits, userRepo(UserType.FamilyMember), clock).execute({
        careRecipientId: R,
        fromCaregiverId: 'A',
        toCaregiverId: 'B',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
