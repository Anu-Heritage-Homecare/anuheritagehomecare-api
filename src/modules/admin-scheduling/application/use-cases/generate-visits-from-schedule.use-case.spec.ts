import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { CareRecipientStatus } from '@modules/care-recipients/domain/care-recipient-status.enum';
import { CareSchedule } from '@modules/care-recipients/domain/value-objects/care-schedule.vo';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { User } from '@modules/identity/domain/user.entity';
import { UserRepository } from '@modules/identity/domain/user.repository';
import { InMemoryVisitRepository, sequentialIds } from '@modules/visits/test-support/doubles';
import { ValidationException } from '@shared/domain/domain-exception';
import { GenerateVisitsFromScheduleUseCase } from './generate-visits-from-schedule.use-case';

const NOW = new Date('2026-07-24T10:00:00.000Z');
const clock = { now: () => NOW };

/** A weekly schedule: Monday and Wednesday, 9:00 AM, three hours. */
function weeklySchedule(): CareSchedule {
  return CareSchedule.create({
    frequency: 'WEEKLY',
    estimatedStartDate: new Date(Date.UTC(2026, 6, 1)),
    expectedDuration: '6 months',
    days: ['MONDAY', 'WEDNESDAY'],
    startMinute: 540,
    visitDurationMinutes: 180,
  });
}

function recipientRepo(recipient: Partial<CareRecipient> | null): CareRecipientRepository {
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(recipient === null ? null : (recipient as CareRecipient)),
    findByIds: () => Promise.resolve([]),
    listByOwner: () => Promise.resolve([]),
  };
}

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

function build(
  visits: InMemoryVisitRepository,
  recipient: Partial<CareRecipient> | null,
  userType: UserType | null,
): GenerateVisitsFromScheduleUseCase {
  return new GenerateVisitsFromScheduleUseCase(
    visits,
    recipientRepo(recipient),
    userRepo(userType),
    sequentialIds('visit'),
    clock,
  );
}

const activeRecipient = {
  id: 'recipient-1',
  status: CareRecipientStatus.Active,
  schedule: weeklySchedule(),
  primaryCaregiverId: 'caregiver-1',
};

describe('GenerateVisitsFromScheduleUseCase', () => {
  it('creates one visit per scheduled weekday in the range, for the assigned caregiver', async () => {
    const visits = new InMemoryVisitRepository();
    // 2026-07-27 is a Monday; the week runs Mon 27 .. Sun 2026-08-02.
    const result = await build(visits, activeRecipient, UserType.Caregiver).execute({
      careRecipientId: 'recipient-1',
      from: new Date(Date.UTC(2026, 6, 27)),
      to: new Date(Date.UTC(2026, 7, 2)),
      caregiverId: 'caregiver-1',
    });

    // Monday 27th and Wednesday 29th only.
    expect(result.created).toBe(2);
    expect(result.skipped).toBe(0);
    const stored = [...visits.store.values()];
    expect(stored).toHaveLength(2);
    expect(stored.every((v) => v.caregiverId === 'caregiver-1')).toBe(true);
    expect(stored.every((v) => v.window.startMinute === 540 && v.window.endMinute === 720)).toBe(
      true,
    );
    expect(stored.map((v) => v.scheduledDate.toISOString().slice(0, 10)).sort()).toEqual([
      '2026-07-27',
      '2026-07-29',
    ]);
  });

  it('falls back to the primary caregiver when none is supplied', async () => {
    const visits = new InMemoryVisitRepository();
    const result = await build(visits, activeRecipient, UserType.Caregiver).execute({
      careRecipientId: 'recipient-1',
      from: new Date(Date.UTC(2026, 6, 27)),
      to: new Date(Date.UTC(2026, 6, 27)),
      caregiverId: null,
    });
    expect(result.caregiverId).toBe('caregiver-1');
    expect([...visits.store.values()][0].caregiverId).toBe('caregiver-1');
  });

  it('is idempotent: a day that already has a visit is skipped', async () => {
    const visits = new InMemoryVisitRepository();
    const range = {
      careRecipientId: 'recipient-1',
      from: new Date(Date.UTC(2026, 6, 27)),
      to: new Date(Date.UTC(2026, 7, 2)),
      caregiverId: 'caregiver-1',
    };
    await build(visits, activeRecipient, UserType.Caregiver).execute(range);
    const second = await build(visits, activeRecipient, UserType.Caregiver).execute(range);
    expect(second.created).toBe(0);
    expect(second.skipped).toBe(2);
    expect(visits.store.size).toBe(2);
  });

  it('leaves visits unassigned when there is no caregiver at all', async () => {
    const visits = new InMemoryVisitRepository();
    const result = await build(
      visits,
      { ...activeRecipient, primaryCaregiverId: null },
      UserType.Caregiver,
    ).execute({
      careRecipientId: 'recipient-1',
      from: new Date(Date.UTC(2026, 6, 27)),
      to: new Date(Date.UTC(2026, 6, 27)),
      caregiverId: null,
    });
    expect(result.caregiverId).toBeNull();
    expect([...visits.store.values()][0].caregiverId).toBeNull();
  });

  it('rejects a recipient with no recurring care schedule', async () => {
    const visits = new InMemoryVisitRepository();
    await expect(
      build(visits, { ...activeRecipient, schedule: null }, UserType.Caregiver).execute({
        careRecipientId: 'recipient-1',
        from: new Date(Date.UTC(2026, 6, 27)),
        to: new Date(Date.UTC(2026, 6, 27)),
        caregiverId: 'caregiver-1',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rejects generating for a non active recipient', async () => {
    const visits = new InMemoryVisitRepository();
    await expect(
      build(
        visits,
        { ...activeRecipient, status: CareRecipientStatus.Draft },
        UserType.Caregiver,
      ).execute({
        careRecipientId: 'recipient-1',
        from: new Date(Date.UTC(2026, 6, 27)),
        to: new Date(Date.UTC(2026, 6, 27)),
        caregiverId: 'caregiver-1',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rejects a supplied user who is not a caregiver', async () => {
    const visits = new InMemoryVisitRepository();
    await expect(
      build(visits, activeRecipient, UserType.FamilyMember).execute({
        careRecipientId: 'recipient-1',
        from: new Date(Date.UTC(2026, 6, 27)),
        to: new Date(Date.UTC(2026, 6, 27)),
        caregiverId: 'not-a-caregiver',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
