import { ForbiddenDomainException, NotFoundDomainException } from '@shared/domain/domain-exception';
import { CareAccessLevel } from '../../domain/care-access-level.enum';
import { CareCircleMember } from '../../domain/care-circle-member.entity';
import { CareCircleRepository } from '../../domain/care-circle.repository';
import { CareCircleAccessGuard } from './care-circle-access.guard';

function repo(member: CareCircleMember | null): CareCircleRepository {
  return {
    listForOwner: () => Promise.resolve([]),
    findById: () => Promise.resolve(null),
    findMembership: () => Promise.resolve(member),
    save: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  };
}

function member(level: CareAccessLevel): CareCircleMember {
  return CareCircleMember.create({
    id: 'm1',
    ownerId: 'owner-1',
    memberUserId: 'member-1',
    relationship: 'Brother',
    accessLevel: level,
    createdAt: new Date('2026-09-05T00:00:00.000Z'),
  });
}

describe('CareCircleAccessGuard', () => {
  it('gives the owner full access to their own data', async () => {
    const guard = new CareCircleAccessGuard(repo(null));
    expect(await guard.resolveLevel('owner-1', 'owner-1')).toBe(CareAccessLevel.Full);
    await expect(
      guard.assertAccess('owner-1', 'owner-1', CareAccessLevel.Full),
    ).resolves.toBeUndefined();
  });

  it('resolves a member to their granted level', async () => {
    const guard = new CareCircleAccessGuard(repo(member(CareAccessLevel.ViewOnly)));
    expect(await guard.resolveLevel('member-1', 'owner-1')).toBe(CareAccessLevel.ViewOnly);
    // View only satisfies a limited requirement...
    await expect(
      guard.assertAccess('member-1', 'owner-1', CareAccessLevel.Limited),
    ).resolves.toBeUndefined();
    // ...but not a full one.
    await expect(
      guard.assertAccess('member-1', 'owner-1', CareAccessLevel.Full),
    ).rejects.toBeInstanceOf(ForbiddenDomainException);
  });

  it('treats a non member as not found (hides existence)', async () => {
    const guard = new CareCircleAccessGuard(repo(null));
    expect(await guard.resolveLevel('stranger', 'owner-1')).toBeNull();
    await expect(
      guard.assertAccess('stranger', 'owner-1', CareAccessLevel.Limited),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
