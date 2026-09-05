import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { PhotoStorage } from '@shared/application/ports/photo-storage.port';
import {
  ConflictDomainException,
  NotFoundDomainException,
  ValidationException,
} from '@shared/domain/domain-exception';
import { CareAccessLevel } from '../../domain/care-access-level.enum';
import { CareCircleInvitation, InvitationStatus } from '../../domain/care-circle-invitation.entity';
import { CareCircleInvitationRepository } from '../../domain/care-circle-invitation.repository';
import { CareCircleMember } from '../../domain/care-circle-member.entity';
import { CareCircleRepository } from '../../domain/care-circle.repository';
import { ProfileUser, ProfileUserDirectory } from '../ports/profile-directories.port';
import {
  AcceptCareCircleInvitationUseCase,
  GetCareCircleUseCase,
  InviteCareCircleMemberUseCase,
  RemoveCareCircleMemberUseCase,
  RevokeCareCircleInvitationUseCase,
} from './care-circle.use-cases';

const clock: Clock = { now: () => new Date('2026-09-05T00:00:00.000Z') };
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

class InMemoryInvitationRepository implements CareCircleInvitationRepository {
  public store = new Map<string, CareCircleInvitation>();
  save(invitation: CareCircleInvitation): Promise<void> {
    this.store.set(invitation.id, invitation);
    return Promise.resolve();
  }
  findById(id: string): Promise<CareCircleInvitation | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }
  findByToken(token: string): Promise<CareCircleInvitation | null> {
    return Promise.resolve([...this.store.values()].find((i) => i.token === token) ?? null);
  }
  listPendingForOwner(ownerId: string): Promise<CareCircleInvitation[]> {
    return Promise.resolve(
      [...this.store.values()].filter(
        (i) => i.ownerId === ownerId && i.status === InvitationStatus.Pending,
      ),
    );
  }
}

describe('care circle', () => {
  let members: InMemoryMemberRepository;
  let invitations: InMemoryInvitationRepository;

  beforeEach(() => {
    members = new InMemoryMemberRepository();
    invitations = new InMemoryInvitationRepository();
  });

  it('invites, accepts and then lists the owner plus the new member', async () => {
    const invite = new InviteCareCircleMemberUseCase(invitations, ids('inv'), clock);
    const invitation = await invite.execute({
      ownerId: 'owner-1',
      email: 'James.Anderson@Email.com',
      relationship: 'Brother',
      accessLevel: 'VIEW_ONLY',
    });
    expect(invitation.email).toBe('james.anderson@email.com');

    const token = invitations.store.get(invitation.id)!.token;
    await new AcceptCareCircleInvitationUseCase(invitations, members, ids('m'), clock).execute({
      userId: 'user-2',
      email: 'james.anderson@email.com',
      token,
    });

    const view = await new GetCareCircleUseCase(
      members,
      invitations,
      userDirectory([
        user({ id: 'owner-1', firstName: 'Joseph', lastName: 'Simon', isFamilyOwner: true }),
        user({ id: 'user-2', firstName: 'James', lastName: 'Anderson' }),
      ]),
      photos,
    ).execute({ ownerId: 'owner-1' });

    expect(view.members[0]).toMatchObject({
      name: 'Joseph Simon',
      isOwner: true,
      accessLevel: 'FULL',
    });
    expect(view.members[1]).toMatchObject({
      name: 'James Anderson',
      isOwner: false,
      accessLevel: 'VIEW_ONLY',
      relationship: 'Brother',
    });
    expect(view.pendingInvitations).toHaveLength(0);
  });

  it('rejects a second pending invitation for the same email', async () => {
    const invite = new InviteCareCircleMemberUseCase(invitations, ids('inv'), clock);
    await invite.execute({
      ownerId: 'owner-1',
      email: 'a@b.com',
      relationship: 'Son',
      accessLevel: 'FULL',
    });
    await expect(
      invite.execute({
        ownerId: 'owner-1',
        email: 'a@b.com',
        relationship: 'Son',
        accessLevel: 'FULL',
      }),
    ).rejects.toBeInstanceOf(ConflictDomainException);
  });

  it('refuses acceptance when the caller email does not match the invitation', async () => {
    const invitation = await new InviteCareCircleMemberUseCase(
      invitations,
      ids('inv'),
      clock,
    ).execute({ ownerId: 'owner-1', email: 'a@b.com', relationship: 'Son', accessLevel: 'FULL' });
    const token = invitations.store.get(invitation.id)!.token;

    await expect(
      new AcceptCareCircleInvitationUseCase(invitations, members, ids('m'), clock).execute({
        userId: 'user-9',
        email: 'someone-else@b.com',
        token,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('revokes a pending invitation and removes a member, owner scoped', async () => {
    const invitation = await new InviteCareCircleMemberUseCase(
      invitations,
      ids('inv'),
      clock,
    ).execute({ ownerId: 'owner-1', email: 'a@b.com', relationship: 'Son', accessLevel: 'FULL' });
    await new RevokeCareCircleInvitationUseCase(invitations).execute({
      ownerId: 'owner-1',
      invitationId: invitation.id,
    });
    expect(invitations.store.get(invitation.id)?.status).toBe('REVOKED');

    const member = CareCircleMember.create({
      id: 'mem-1',
      ownerId: 'owner-1',
      memberUserId: 'user-2',
      relationship: 'Brother',
      accessLevel: CareAccessLevel.ViewOnly,
      createdAt: clock.now(),
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
});
