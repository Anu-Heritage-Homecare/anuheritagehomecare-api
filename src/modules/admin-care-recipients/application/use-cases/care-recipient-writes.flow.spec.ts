import { CareRecipientPriority } from '@modules/care-recipients/domain/care-recipient-priority.enum';
import { CareRecipientStatus } from '@modules/care-recipients/domain/care-recipient-status.enum';
import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import {
  InMemoryCareRecipientRepository,
  buildProfile,
} from '@modules/care-recipients/test-support/doubles';
import { User } from '@modules/identity/domain/user.entity';
import { UserRepository } from '@modules/identity/domain/user.repository';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { AddCareRecipientUseCase } from './add-care-recipient.use-case';
import { ChangeCareRecipientStatusUseCase } from './change-care-recipient-status.use-case';
import { SetPrimaryCaregiverUseCase } from './set-primary-caregiver.use-case';

const NOW = new Date('2026-09-15T12:00:00.000Z');
const clock: Clock = { now: () => NOW };
const ids: IdGenerator = { generate: () => 'care-new' };

function userOfType(type: UserType): User {
  return { id: 'u', userType: type } as unknown as User;
}

function userRepo(byId: (id: string) => User | null): UserRepository {
  return {
    save: () => Promise.resolve(),
    findById: (id: string) => Promise.resolve(byId(id)),
    findByIds: () => Promise.resolve([]),
    findByEmail: () => Promise.resolve(null),
    existsByEmail: () => Promise.resolve(false),
    existsByPhone: () => Promise.resolve(false),
    countByType: () => Promise.resolve(0),
  };
}

function activeRecipient(repo: InMemoryCareRecipientRepository): Promise<CareRecipient> {
  const recipient = CareRecipient.provisionByAdmin({
    id: 'care-1',
    ownerId: 'owner-1',
    profile: buildProfile(),
    now: NOW,
  });
  return repo.save(recipient).then(() => recipient);
}

describe('care recipient admin writes', () => {
  it('places on hold, discharges and reactivates', async () => {
    const repo = new InMemoryCareRecipientRepository();
    await activeRecipient(repo);
    const useCase = new ChangeCareRecipientStatusUseCase(repo, clock);

    expect((await useCase.execute({ recipientId: 'care-1', action: 'HOLD' })).status).toBe(
      CareRecipientStatus.OnHold,
    );
    expect((await useCase.execute({ recipientId: 'care-1', action: 'DISCHARGE' })).status).toBe(
      CareRecipientStatus.Discharged,
    );
    expect((await useCase.execute({ recipientId: 'care-1', action: 'REACTIVATE' })).status).toBe(
      CareRecipientStatus.Active,
    );
  });

  it('rejects a status change on an unknown recipient', async () => {
    const repo = new InMemoryCareRecipientRepository();
    await expect(
      new ChangeCareRecipientStatusUseCase(repo, clock).execute({
        recipientId: 'nope',
        action: 'HOLD',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('assigns a caregiver, rejecting a non caregiver, and clears it', async () => {
    const repo = new InMemoryCareRecipientRepository();
    await activeRecipient(repo);
    const caregiverUsers = userRepo((id) =>
      id === 'cg-1' ? userOfType(UserType.Caregiver) : userOfType(UserType.FamilyMember),
    );
    const useCase = new SetPrimaryCaregiverUseCase(repo, caregiverUsers, clock);

    await useCase.execute({ recipientId: 'care-1', caregiverId: 'cg-1' });
    expect((await repo.findById('care-1'))?.primaryCaregiverId).toBe('cg-1');

    await expect(
      useCase.execute({ recipientId: 'care-1', caregiverId: 'not-a-caregiver' }),
    ).rejects.toBeInstanceOf(ValidationException);

    await useCase.execute({ recipientId: 'care-1', caregiverId: null });
    expect((await repo.findById('care-1'))?.primaryCaregiverId).toBeNull();
  });

  it('provisions a recipient for an existing family owner', async () => {
    const repo = new InMemoryCareRecipientRepository();
    const users = userRepo((id) => (id === 'owner-1' ? userOfType(UserType.FamilyMember) : null));
    const useCase = new AddCareRecipientUseCase(repo, users, clock, ids);

    const created = await useCase.execute({
      ownerId: 'owner-1',
      name: 'New Recipient',
      gender: 'FEMALE',
      dateOfBirth: new Date('1950-01-01'),
      city: 'Sunnyvale',
      state: 'CA',
      fullAddress: '1 Main St, Sunnyvale, CA',
      relationship: 'Mother',
      livingSituation: 'Lives alone',
      priority: CareRecipientPriority.High,
    });

    const stored = await repo.findById(created.id);
    expect(stored?.status).toBe(CareRecipientStatus.Active);
    expect(stored?.priority).toBe(CareRecipientPriority.High);
  });

  it('rejects provisioning for a non family owner', async () => {
    const repo = new InMemoryCareRecipientRepository();
    const users = userRepo(() => userOfType(UserType.Caregiver));
    await expect(
      new AddCareRecipientUseCase(repo, users, clock, ids).execute({
        ownerId: 'owner-1',
        name: 'X',
        gender: 'MALE',
        dateOfBirth: new Date('1950-01-01'),
        city: 'C',
        state: 'S',
        fullAddress: 'A',
        relationship: 'Father',
        livingSituation: 'Alone',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
