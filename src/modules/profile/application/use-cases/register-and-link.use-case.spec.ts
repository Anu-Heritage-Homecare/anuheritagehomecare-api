import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import {
  AccountAlreadyExistsException,
  ValidationException,
} from '@shared/domain/domain-exception';
import { CareAccessLevel } from '../../domain/care-access-level.enum';
import { CareCode, CareCodeStatus } from '../../domain/care-code.entity';
import { CareCodeRepository } from '../../domain/care-code.repository';
import { CareCircleMember } from '../../domain/care-circle-member.entity';
import { CareCircleRepository } from '../../domain/care-circle.repository';
import {
  MemberAccountRegistrar,
  MemberRegistrationDetails,
  MemberRegistrationOutcome,
} from '../ports/member-account-registrar.port';
import { ProfileUser, ProfileUserDirectory } from '../ports/profile-directories.port';
import { RedeemCareCodeUseCase, RegisterAndLinkUseCase } from './care-circle.use-cases';

const NOW = new Date('2026-09-05T00:00:00.000Z');
const clock: Clock = { now: () => NOW };
function ids(prefix: string): IdGenerator {
  let n = 0;
  return { generate: () => `${prefix}-${(n += 1)}` };
}

function user(over: Partial<ProfileUser> & { id: string }): ProfileUser {
  return {
    firstName: 'First',
    lastName: 'Last',
    email: `${over.id}@example.com`,
    userType: 'FAMILY_MEMBER',
    isFamilyOwner: false,
    photoKey: null,
    ...over,
  };
}

function userDirectory(users: ProfileUser[]): ProfileUserDirectory {
  const byId = new Map(users.map((u) => [u.id, u]));
  return {
    findById: (id) => Promise.resolve(byId.get(id) ?? null),
    findByIds: (idList) =>
      Promise.resolve(
        idList.map((id) => byId.get(id)).filter((u): u is ProfileUser => u !== undefined),
      ),
  };
}

class InMemoryCareCodeRepository implements CareCodeRepository {
  public store = new Map<string, CareCode>();
  save(code: CareCode): Promise<void> {
    this.store.set(code.id, code);
    return Promise.resolve();
  }
  findById(id: string): Promise<CareCode | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }
  findByCode(code: string): Promise<CareCode | null> {
    return Promise.resolve([...this.store.values()].find((c) => c.code === code) ?? null);
  }
  findActiveForOwner(ownerId: string): Promise<CareCode | null> {
    return Promise.resolve(
      [...this.store.values()].find(
        (c) => c.ownerId === ownerId && c.status === CareCodeStatus.Active,
      ) ?? null,
    );
  }
}

class InMemoryMemberRepository implements CareCircleRepository {
  public store = new Map<string, CareCircleMember>();
  listForOwner(ownerId: string): Promise<CareCircleMember[]> {
    return Promise.resolve([...this.store.values()].filter((m) => m.ownerId === ownerId));
  }
  findById(id: string): Promise<CareCircleMember | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }
  findMembership(ownerId: string, memberUserId: string): Promise<CareCircleMember | null> {
    return Promise.resolve(
      [...this.store.values()].find(
        (m) => m.ownerId === ownerId && m.memberUserId === memberUserId,
      ) ?? null,
    );
  }
  save(member: CareCircleMember): Promise<void> {
    this.store.set(member.id, member);
    return Promise.resolve();
  }
  delete(ownerId: string, id: string): Promise<void> {
    const m = this.store.get(id);
    if (m !== undefined && m.ownerId === ownerId) {
      this.store.delete(id);
    }
    return Promise.resolve();
  }
}

class FakeMemberRegistrar implements MemberAccountRegistrar {
  public calls: MemberRegistrationDetails[] = [];
  constructor(private readonly outcome: MemberRegistrationOutcome | Error) {}
  register(details: MemberRegistrationDetails): Promise<MemberRegistrationOutcome> {
    this.calls.push(details);
    return this.outcome instanceof Error
      ? Promise.reject(this.outcome)
      : Promise.resolve(this.outcome);
  }
}

const DETAILS = {
  firstName: 'Grace',
  lastName: 'Simon',
  email: 'grace@example.com',
  phone: '+2348031234567',
  addressLine1: '12 Marina Road',
  city: 'Lagos',
  state: 'Lagos',
  postalCode: '101233',
  country: 'NG',
  password: 'S3curePass',
};

describe('RegisterAndLinkUseCase', () => {
  let codes: InMemoryCareCodeRepository;
  let members: InMemoryMemberRepository;
  const users = userDirectory([user({ id: 'owner-1', firstName: 'Joseph', lastName: 'Simon' })]);

  beforeEach(async () => {
    codes = new InMemoryCareCodeRepository();
    members = new InMemoryMemberRepository();
    await codes.save(
      CareCode.issue({ id: 'c1', ownerId: 'owner-1', code: 'CARE-7319-KLM2', now: NOW }),
    );
  });

  it('registers a member and joins the circle at limited access with the chosen relationship', async () => {
    const registrar = new FakeMemberRegistrar({ userId: 'u1', emailVerificationRequired: true });
    const useCase = new RegisterAndLinkUseCase(registrar, codes, members, users, ids('m'), clock);

    const result = await useCase.execute({
      code: '  care-7319-klm2  ',
      relationship: 'Daughter',
      ...DETAILS,
    });

    expect(result).toEqual({
      userId: 'u1',
      ownerName: 'Joseph Simon',
      emailVerificationRequired: true,
    });
    expect(registrar.calls).toHaveLength(1);
    expect(registrar.calls[0].email).toBe('grace@example.com');

    const saved = [...members.store.values()];
    expect(saved).toHaveLength(1);
    expect(saved[0].memberUserId).toBe('u1');
    expect(saved[0].ownerId).toBe('owner-1');
    expect(saved[0].relationship).toBe('Daughter');
    expect(saved[0].accessLevel).toBe(CareAccessLevel.Limited);
  });

  it('validates the code before creating an account, so a bad code never orphans a user', async () => {
    const registrar = new FakeMemberRegistrar({ userId: 'u1', emailVerificationRequired: true });
    const useCase = new RegisterAndLinkUseCase(registrar, codes, members, users, ids('m'), clock);

    await expect(
      useCase.execute({ code: 'CARE-0000-ZZZZ', relationship: 'Daughter', ...DETAILS }),
    ).rejects.toBeInstanceOf(ValidationException);

    expect(registrar.calls).toHaveLength(0);
    expect(members.store.size).toBe(0);
  });

  it('propagates ACCOUNT_EXISTS and leaves no membership when the email is taken', async () => {
    const registrar = new FakeMemberRegistrar(new AccountAlreadyExistsException());
    const useCase = new RegisterAndLinkUseCase(registrar, codes, members, users, ids('m'), clock);

    await expect(
      useCase.execute({ code: 'CARE-7319-KLM2', relationship: 'Daughter', ...DETAILS }),
    ).rejects.toBeInstanceOf(AccountAlreadyExistsException);

    expect(members.store.size).toBe(0);
  });
});

describe('RedeemCareCodeUseCase relationship', () => {
  let codes: InMemoryCareCodeRepository;
  let members: InMemoryMemberRepository;
  const users = userDirectory([user({ id: 'owner-1', firstName: 'Joseph', lastName: 'Simon' })]);

  beforeEach(async () => {
    codes = new InMemoryCareCodeRepository();
    members = new InMemoryMemberRepository();
    await codes.save(
      CareCode.issue({ id: 'c1', ownerId: 'owner-1', code: 'CARE-7319-KLM2', now: NOW }),
    );
  });

  it('uses the self chosen relationship when provided', async () => {
    const useCase = new RedeemCareCodeUseCase(codes, members, users, ids('m'), clock);
    await useCase.execute({ userId: 'joiner-1', code: 'CARE-7319-KLM2', relationship: 'Son' });
    expect([...members.store.values()][0].relationship).toBe('Son');
  });

  it('falls back to the default relationship when none is given', async () => {
    const useCase = new RedeemCareCodeUseCase(codes, members, users, ids('m'), clock);
    await useCase.execute({ userId: 'joiner-1', code: 'CARE-7319-KLM2' });
    expect([...members.store.values()][0].relationship).toBe('Family Member');
  });
});
