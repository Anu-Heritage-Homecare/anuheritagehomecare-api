import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { CareAccessLevel } from '../../domain/care-access-level.enum';
import { CareCircleMemberStatus } from '../../domain/care-circle-member-status.enum';
import { CareCode, CareCodeStatus } from '../../domain/care-code.entity';
import { CareCodeRepository } from '../../domain/care-code.repository';
import { CareCircleMember } from '../../domain/care-circle-member.entity';
import { CareCircleRepository } from '../../domain/care-circle.repository';
import { ProfileUser, ProfileUserDirectory } from '../ports/profile-directories.port';
import {
  ApproveCareCircleMemberUseCase,
  GetCareCircleUseCase,
  GetCareCodeUseCase,
  ListPendingCareRequestsUseCase,
  RedeemCareCodeUseCase,
  RegenerateCareCodeUseCase,
  RejectCareCircleMemberUseCase,
  RemoveCareCircleMemberUseCase,
  SetCareCircleMemberAccessUseCase,
} from './care-circle.use-cases';

const NOW = new Date('2026-09-05T00:00:00.000Z');
const clock: Clock = { now: () => NOW };
function ids(prefix: string): IdGenerator {
  let n = 0;
  return { generate: () => `${prefix}-${(n += 1)}` };
}

const photos: PhotoStorage = {
  createUploadTicket: () => ({ uploadUrl: '', fields: {}, key: '' }),
  urlFor: (key) => (key.length === 0 ? '' : `https://cdn/${key}`),
  download: () => Promise.resolve(Buffer.from('')),
};

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

class InMemoryMemberRepository implements CareCircleRepository {
  public store = new Map<string, CareCircleMember>();
  listForOwner(ownerId: string): Promise<CareCircleMember[]> {
    return Promise.resolve(
      [...this.store.values()].filter((m) => m.ownerId === ownerId && m.isActive),
    );
  }
  listPendingForOwner(ownerId: string): Promise<CareCircleMember[]> {
    return Promise.resolve(
      [...this.store.values()].filter((m) => m.ownerId === ownerId && m.isPending),
    );
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
    const active = [...this.store.values()]
      .filter((c) => c.ownerId === ownerId && c.status === CareCodeStatus.Active)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Promise.resolve(active[0] ?? null);
  }
}

describe('care circle: care codes', () => {
  let members: InMemoryMemberRepository;
  let codes: InMemoryCareCodeRepository;

  beforeEach(() => {
    members = new InMemoryMemberRepository();
    codes = new InMemoryCareCodeRepository();
  });

  it('mints a code, returns the same one on the next read, and dates its expiry 7 days out', async () => {
    const getCode = new GetCareCodeUseCase(codes, ids('code'), clock);

    const first = await getCode.execute({ ownerId: 'owner-1' });
    expect(first.code).toMatch(/^CARE-\d{4}-[A-Z2-9]{4}$/);
    expect(first.expiresAt).toBe('2026-09-12T00:00:00.000Z');

    const second = await getCode.execute({ ownerId: 'owner-1' });
    expect(second.code).toBe(first.code);
    expect(codes.store.size).toBe(1);
  });

  it('redeems a code as a bearer credential, raising a pending request (no access yet)', async () => {
    const code = (
      await new GetCareCodeUseCase(codes, ids('code'), clock).execute({
        ownerId: 'owner-1',
      })
    ).code;

    const users = userDirectory([
      user({ id: 'owner-1', firstName: 'Joseph', lastName: 'Simon', isFamilyOwner: true }),
    ]);
    const result = await new RedeemCareCodeUseCase(codes, members, users, ids('m'), clock).execute({
      userId: 'user-2',
      // Spacing and case should not matter.
      code: `  ${code.toLowerCase().replace(/-/g, ' - ')}  `,
    });

    expect(result).toEqual({ ownerName: 'Joseph Simon', alreadyMember: false, pending: true });
    const membership = await members.findMembership('owner-1', 'user-2');
    expect(membership?.status).toBe(CareCircleMemberStatus.Pending);
    expect(membership?.accessLevel).toBe(CareAccessLevel.Limited);
    expect(membership?.relationship).toBe('Family Member');

    // The pending member is not yet in the active circle.
    const circle = await new GetCareCircleUseCase(members, users, photos).execute({
      ownerId: 'owner-1',
    });
    expect(circle.members.every((m) => m.name !== 'First Last')).toBe(true);

    // Reusable: a second person can still redeem the same code.
    const again = await new RedeemCareCodeUseCase(codes, members, users, ids('n'), clock).execute({
      userId: 'user-3',
      code,
    });
    expect(again.alreadyMember).toBe(false);
    expect(members.store.size).toBe(2);
  });

  it('is idempotent when the caller is already a member', async () => {
    const code = (
      await new GetCareCodeUseCase(codes, ids('code'), clock).execute({
        ownerId: 'owner-1',
      })
    ).code;
    const users = userDirectory([user({ id: 'owner-1', firstName: 'Jo', lastName: 'Simon' })]);
    const redeem = new RedeemCareCodeUseCase(codes, members, users, ids('m'), clock);

    await redeem.execute({ userId: 'user-2', code });
    const second = await redeem.execute({ userId: 'user-2', code });
    expect(second.alreadyMember).toBe(true);
    expect(members.store.size).toBe(1);
  });

  it('rejects an unknown, expired or own code', async () => {
    const users = userDirectory([user({ id: 'owner-1' })]);
    const redeem = new RedeemCareCodeUseCase(codes, members, users, ids('m'), clock);

    await expect(
      redeem.execute({ userId: 'user-2', code: 'CARE-0000-ZZZZ' }),
    ).rejects.toBeInstanceOf(ValidationException);

    const code = (
      await new GetCareCodeUseCase(codes, ids('code'), clock).execute({
        ownerId: 'owner-1',
      })
    ).code;
    // The owner cannot join their own circle.
    await expect(redeem.execute({ userId: 'owner-1', code })).rejects.toBeInstanceOf(
      ValidationException,
    );

    // An expired code is not redeemable.
    const later: Clock = { now: () => new Date('2026-09-20T00:00:00.000Z') };
    await expect(
      new RedeemCareCodeUseCase(codes, members, users, ids('m'), later).execute({
        userId: 'user-2',
        code,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('regenerating retires the previous code so it can no longer be redeemed', async () => {
    const getCode = new GetCareCodeUseCase(codes, ids('code'), clock);
    const first = (await getCode.execute({ ownerId: 'owner-1' })).code;

    const regenerated = (
      await new RegenerateCareCodeUseCase(codes, ids('code2'), clock).execute({
        ownerId: 'owner-1',
      })
    ).code;
    expect(regenerated).not.toBe(first);

    const users = userDirectory([user({ id: 'owner-1' })]);
    await expect(
      new RedeemCareCodeUseCase(codes, members, users, ids('m'), clock).execute({
        userId: 'user-2',
        code: first,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('lets the owner set a member permissions and relationship, then lists them', async () => {
    const code = (
      await new GetCareCodeUseCase(codes, ids('code'), clock).execute({
        ownerId: 'owner-1',
      })
    ).code;
    const users = userDirectory([
      user({ id: 'owner-1', firstName: 'Joseph', lastName: 'Simon', isFamilyOwner: true }),
      user({ id: 'user-2', firstName: 'James', lastName: 'Anderson' }),
    ]);
    await new RedeemCareCodeUseCase(codes, members, users, ids('m'), clock).execute({
      userId: 'user-2',
      code,
    });
    const memberId = [...members.store.values()][0].id;

    // The owner approves the pending request so the member becomes active.
    await new ApproveCareCircleMemberUseCase(members).execute({ ownerId: 'owner-1', memberId });

    const setAccess = new SetCareCircleMemberAccessUseCase(members);
    await setAccess.execute({
      ownerId: 'owner-1',
      memberId,
      accessLevel: 'VIEW_ONLY',
      relationship: 'Brother',
    });
    // Owner scoping: a stranger cannot touch the membership.
    await expect(
      setAccess.execute({ ownerId: 'someone-else', memberId, accessLevel: 'FULL' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);

    const view = await new GetCareCircleUseCase(members, users, photos).execute({
      ownerId: 'owner-1',
    });
    expect(view.members[0]).toMatchObject({
      name: 'Joseph Simon',
      isOwner: true,
      accessLevel: 'FULL',
    });
    expect(view.members[1]).toMatchObject({
      name: 'James Anderson',
      accessLevel: 'VIEW_ONLY',
      relationship: 'Brother',
    });
  });

  it('removes a member, owner scoped', async () => {
    const member = CareCircleMember.create({
      id: 'mem-1',
      ownerId: 'owner-1',
      memberUserId: 'user-2',
      relationship: 'Brother',
      accessLevel: CareAccessLevel.ViewOnly,
      status: CareCircleMemberStatus.Active,
      createdAt: NOW,
    });
    await members.save(member);

    await expect(
      new RemoveCareCircleMemberUseCase(members).execute({ ownerId: 'other', memberId: 'mem-1' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
    await new RemoveCareCircleMemberUseCase(members).execute({
      ownerId: 'owner-1',
      memberId: 'mem-1',
    });
    expect(members.store.size).toBe(0);
  });

  it('lists pending requests, then approves one at a chosen access level', async () => {
    const code = (
      await new GetCareCodeUseCase(codes, ids('code'), clock).execute({ ownerId: 'owner-1' })
    ).code;
    const users = userDirectory([
      user({ id: 'owner-1', firstName: 'Joseph', lastName: 'Simon', isFamilyOwner: true }),
      user({ id: 'user-2', firstName: 'James', lastName: 'Anderson' }),
    ]);
    await new RedeemCareCodeUseCase(codes, members, users, ids('m'), clock).execute({
      userId: 'user-2',
      code,
      relationship: 'Son',
    });

    const pending = await new ListPendingCareRequestsUseCase(members, users, photos).execute({
      ownerId: 'owner-1',
    });
    expect(pending.requests).toHaveLength(1);
    expect(pending.requests[0]).toMatchObject({ name: 'James Anderson', relationship: 'Son' });
    const memberId = pending.requests[0].id;

    await new ApproveCareCircleMemberUseCase(members).execute({
      ownerId: 'owner-1',
      memberId,
      accessLevel: 'VIEW_ONLY',
    });

    // Now active: gone from pending, present in the circle at the granted level.
    const stillPending = await new ListPendingCareRequestsUseCase(members, users, photos).execute({
      ownerId: 'owner-1',
    });
    expect(stillPending.requests).toHaveLength(0);
    const circle = await new GetCareCircleUseCase(members, users, photos).execute({
      ownerId: 'owner-1',
    });
    expect(circle.members.find((m) => m.name === 'James Anderson')?.accessLevel).toBe('VIEW_ONLY');
  });

  it('rejects a pending request, removing it; cannot reject an active member', async () => {
    const code = (
      await new GetCareCodeUseCase(codes, ids('code'), clock).execute({ ownerId: 'owner-1' })
    ).code;
    const users = userDirectory([user({ id: 'owner-1' }), user({ id: 'user-2' })]);
    await new RedeemCareCodeUseCase(codes, members, users, ids('m'), clock).execute({
      userId: 'user-2',
      code,
    });
    const memberId = [...members.store.values()][0].id;

    // Owner scoping.
    await expect(
      new RejectCareCircleMemberUseCase(members).execute({ ownerId: 'other', memberId }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);

    await new RejectCareCircleMemberUseCase(members).execute({ ownerId: 'owner-1', memberId });
    expect(members.store.size).toBe(0);

    // An active member cannot be rejected (that is the separate remove action).
    const active = CareCircleMember.create({
      id: 'mem-active',
      ownerId: 'owner-1',
      memberUserId: 'user-9',
      relationship: 'Aunt',
      accessLevel: CareAccessLevel.Limited,
      status: CareCircleMemberStatus.Active,
      createdAt: NOW,
    });
    await members.save(active);
    await expect(
      new RejectCareCircleMemberUseCase(members).execute({
        ownerId: 'owner-1',
        memberId: 'mem-active',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('approving a non pending member is rejected', async () => {
    const active = CareCircleMember.create({
      id: 'mem-1',
      ownerId: 'owner-1',
      memberUserId: 'user-2',
      relationship: 'Son',
      accessLevel: CareAccessLevel.Limited,
      status: CareCircleMemberStatus.Active,
      createdAt: NOW,
    });
    await members.save(active);
    await expect(
      new ApproveCareCircleMemberUseCase(members).execute({
        ownerId: 'owner-1',
        memberId: 'mem-1',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
