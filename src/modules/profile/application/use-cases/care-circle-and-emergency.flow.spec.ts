import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { CareCircleMember } from '../../domain/care-circle-member.entity';
import { CareCircleRepository } from '../../domain/care-circle.repository';
import { EmergencyContact } from '../../domain/emergency-contact.entity';
import { EmergencyContactRepository } from '../../domain/emergency-contact.repository';
import {
  AddCareCircleMemberUseCase,
  ListCareCircleUseCase,
  RemoveCareCircleMemberUseCase,
} from './care-circle.use-cases';
import {
  GetEmergencyContactUseCase,
  SetEmergencyContactUseCase,
} from './emergency-contact.use-cases';

const clock: Clock = { now: () => new Date('2026-09-05T00:00:00.000Z') };
function ids(): IdGenerator {
  let n = 0;
  return { generate: () => `m-${(n += 1)}` };
}

class InMemoryEmergencyContactRepository implements EmergencyContactRepository {
  public store = new Map<string, EmergencyContact>();
  findByUser(userId: string): Promise<EmergencyContact | null> {
    return Promise.resolve(this.store.get(userId) ?? null);
  }
  save(contact: EmergencyContact): Promise<void> {
    this.store.set(contact.id, contact);
    return Promise.resolve();
  }
}

class InMemoryCareCircleRepository implements CareCircleRepository {
  public store = new Map<string, CareCircleMember>();
  listForOwner(ownerId: string): Promise<CareCircleMember[]> {
    return Promise.resolve([...this.store.values()].filter((m) => m.ownerId === ownerId));
  }
  findById(id: string): Promise<CareCircleMember | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }
  save(member: CareCircleMember): Promise<void> {
    this.store.set(member.id, member);
    return Promise.resolve();
  }
  delete(ownerId: string, id: string): Promise<void> {
    const member = this.store.get(id);
    if (member !== undefined && member.ownerId === ownerId) {
      this.store.delete(id);
    }
    return Promise.resolve();
  }
}

describe('emergency contact', () => {
  it('returns null until set, then reads back the saved contact', async () => {
    const repo = new InMemoryEmergencyContactRepository();
    expect(await new GetEmergencyContactUseCase(repo).execute({ userId: 'u1' })).toBeNull();

    await new SetEmergencyContactUseCase(repo, clock).execute({
      userId: 'u1',
      name: 'Grace',
      phone: '+2348012345678',
      relationship: 'Sister',
    });

    const result = await new GetEmergencyContactUseCase(repo).execute({ userId: 'u1' });
    expect(result).toEqual({ name: 'Grace', phone: '+2348012345678', relationship: 'Sister' });
  });

  it('rejects a blank name', async () => {
    await expect(
      new SetEmergencyContactUseCase(new InMemoryEmergencyContactRepository(), clock).execute({
        userId: 'u1',
        name: '  ',
        phone: '+2348012345678',
        relationship: 'Sister',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});

describe('care circle', () => {
  it('adds, lists and removes members, owner scoped', async () => {
    const repo = new InMemoryCareCircleRepository();
    const add = new AddCareCircleMemberUseCase(repo, ids(), clock);

    const john = await add.execute({ ownerId: 'u1', name: 'John', relationship: 'Son' });
    await add.execute({
      ownerId: 'u1',
      name: 'Mary',
      relationship: 'Daughter',
      email: 'mary@x.com',
    });

    const list = await new ListCareCircleUseCase(repo).execute({ ownerId: 'u1' });
    expect(list.map((m) => m.name)).toEqual(['John', 'Mary']);

    await new RemoveCareCircleMemberUseCase(repo).execute({ ownerId: 'u1', memberId: john.id });
    const after = await new ListCareCircleUseCase(repo).execute({ ownerId: 'u1' });
    expect(after.map((m) => m.name)).toEqual(['Mary']);
  });

  it('404s removing a member the owner does not own', async () => {
    const repo = new InMemoryCareCircleRepository();
    const member = await new AddCareCircleMemberUseCase(repo, ids(), clock).execute({
      ownerId: 'u2',
      name: 'John',
      relationship: 'Son',
    });

    await expect(
      new RemoveCareCircleMemberUseCase(repo).execute({ ownerId: 'u1', memberId: member.id }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
