import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { PHOTO_STORAGE, PhotoStorage } from '@shared/application/ports/photo-storage.port';
import {
  ConflictDomainException,
  NotFoundDomainException,
  ValidationException,
} from '@shared/domain/domain-exception';
import { CareAccessLevel, toCareAccessLevel } from '../../domain/care-access-level.enum';
import { CareCircleInvitation } from '../../domain/care-circle-invitation.entity';
import {
  CARE_CIRCLE_INVITATION_REPOSITORY,
  CareCircleInvitationRepository,
} from '../../domain/care-circle-invitation.repository';
import { CareCircleMember } from '../../domain/care-circle-member.entity';
import { CARE_CIRCLE_REPOSITORY, CareCircleRepository } from '../../domain/care-circle.repository';
import {
  PROFILE_USER_DIRECTORY,
  ProfileUser,
  ProfileUserDirectory,
} from '../ports/profile-directories.port';

export interface CareCircleMemberView {
  id: string;
  name: string;
  relationship: string;
  accessLevel: string;
  photoUrl: string | null;
  isOwner: boolean;
}

export interface CareCircleInvitationView {
  id: string;
  email: string;
  relationship: string;
  accessLevel: string;
  invitedAt: string;
}

export interface CareCircleView {
  members: CareCircleMemberView[];
  pendingInvitations: CareCircleInvitationView[];
}

export interface InviteMemberCommand {
  ownerId: string;
  email: string;
  relationship: string;
  accessLevel: string;
}

export interface AcceptInvitationCommand {
  userId: string;
  email: string;
  token: string;
}

/**
 * Use case: the owner's care circle. Composes the owner themself (always full
 * access), the accepted members (name and avatar from identity, relationship and
 * access level from the membership) and the pending invitations.
 */
@Injectable()
export class GetCareCircleUseCase {
  constructor(
    @Inject(CARE_CIRCLE_REPOSITORY) private readonly members: CareCircleRepository,
    @Inject(CARE_CIRCLE_INVITATION_REPOSITORY)
    private readonly invitations: CareCircleInvitationRepository,
    @Inject(PROFILE_USER_DIRECTORY) private readonly users: ProfileUserDirectory,
    @Inject(PHOTO_STORAGE) private readonly photos: PhotoStorage,
  ) {}

  async execute(query: { ownerId: string }): Promise<CareCircleView> {
    const [owner, members, pending] = await Promise.all([
      this.users.findById(query.ownerId),
      this.members.listForOwner(query.ownerId),
      this.invitations.listPendingForOwner(query.ownerId),
    ]);

    const memberUsers = await this.users.findByIds(members.map((m) => m.memberUserId));
    const usersById = new Map(memberUsers.map((user) => [user.id, user]));

    const memberViews: CareCircleMemberView[] = [];
    if (owner !== null) {
      memberViews.push({
        id: owner.id,
        name: `${owner.firstName} ${owner.lastName}`.trim(),
        relationship: 'Primary Family Member',
        accessLevel: CareAccessLevel.Full,
        photoUrl: this.photoUrl(owner.photoKey),
        isOwner: true,
      });
    }
    for (const member of members) {
      const user = usersById.get(member.memberUserId) ?? null;
      memberViews.push({
        id: member.id,
        name: user === null ? 'Unknown' : `${user.firstName} ${user.lastName}`.trim(),
        relationship: member.relationship,
        accessLevel: member.accessLevel,
        photoUrl: this.photoUrl(user?.photoKey ?? null),
        isOwner: false,
      });
    }

    return {
      members: memberViews,
      pendingInvitations: pending.map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        relationship: invitation.relationship,
        accessLevel: invitation.accessLevel,
        invitedAt: invitation.invitedAt.toISOString(),
      })),
    };
  }

  private photoUrl(photoKey: string | null): string | null {
    if (photoKey === null) {
      return null;
    }
    const url = this.photos.urlFor(photoKey);
    return url.length === 0 ? null : url;
  }
}

/** Use case: invite a person to the owner's care circle by email, at an access level. */
@Injectable()
export class InviteCareCircleMemberUseCase {
  constructor(
    @Inject(CARE_CIRCLE_INVITATION_REPOSITORY)
    private readonly invitations: CareCircleInvitationRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: InviteMemberCommand): Promise<CareCircleInvitationView> {
    const accessLevel = toCareAccessLevel(command.accessLevel);
    if (accessLevel === undefined) {
      throw new ValidationException('Access level must be LIMITED, VIEW_ONLY or FULL');
    }

    const email = command.email.trim().toLowerCase();
    const existing = await this.invitations.listPendingForOwner(command.ownerId);
    if (existing.some((invitation) => invitation.email === email)) {
      throw new ConflictDomainException('This email already has a pending invitation');
    }

    const invitation = CareCircleInvitation.invite({
      id: this.ids.generate(),
      ownerId: command.ownerId,
      email,
      relationship: command.relationship,
      accessLevel,
      token: this.ids.generate(),
      now: this.clock.now(),
    });
    await this.invitations.save(invitation);

    return {
      id: invitation.id,
      email: invitation.email,
      relationship: invitation.relationship,
      accessLevel: invitation.accessLevel,
      invitedAt: invitation.invitedAt.toISOString(),
    };
  }
}

/**
 * Use case: accept an invitation, linking the accepting user to the owner's circle
 * as a member. The caller's email must match the invitation, so a token alone
 * cannot be redeemed by someone else.
 */
@Injectable()
export class AcceptCareCircleInvitationUseCase {
  constructor(
    @Inject(CARE_CIRCLE_INVITATION_REPOSITORY)
    private readonly invitations: CareCircleInvitationRepository,
    @Inject(CARE_CIRCLE_REPOSITORY) private readonly members: CareCircleRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: AcceptInvitationCommand): Promise<void> {
    const invitation = await this.invitations.findByToken(command.token);
    if (invitation === null) {
      throw new NotFoundDomainException('Invitation not found');
    }
    if (invitation.email !== command.email.trim().toLowerCase()) {
      throw new ValidationException('This invitation was sent to a different email');
    }
    if (invitation.ownerId === command.userId) {
      throw new ValidationException('You cannot join your own care circle');
    }

    const existing = await this.members.findMembership(invitation.ownerId, command.userId);
    if (existing === null) {
      const member = CareCircleMember.create({
        id: this.ids.generate(),
        ownerId: invitation.ownerId,
        memberUserId: command.userId,
        relationship: invitation.relationship,
        accessLevel: invitation.accessLevel,
        createdAt: this.clock.now(),
      });
      await this.members.save(member);
    }

    invitation.accept(command.userId, this.clock.now());
    await this.invitations.save(invitation);
  }
}

/** Use case: remove a member from the owner's care circle. Owner scoped. */
@Injectable()
export class RemoveCareCircleMemberUseCase {
  constructor(@Inject(CARE_CIRCLE_REPOSITORY) private readonly members: CareCircleRepository) {}

  async execute(command: { ownerId: string; memberId: string }): Promise<void> {
    const member = await this.members.findById(command.memberId);
    if (member === null || member.ownerId !== command.ownerId) {
      throw new NotFoundDomainException('Care circle member not found');
    }
    await this.members.delete(command.ownerId, command.memberId);
  }
}

/** Use case: revoke a pending invitation. Owner scoped. */
@Injectable()
export class RevokeCareCircleInvitationUseCase {
  constructor(
    @Inject(CARE_CIRCLE_INVITATION_REPOSITORY)
    private readonly invitations: CareCircleInvitationRepository,
  ) {}

  async execute(command: { ownerId: string; invitationId: string }): Promise<void> {
    const invitation = await this.invitations.findById(command.invitationId);
    if (invitation === null || invitation.ownerId !== command.ownerId) {
      throw new NotFoundDomainException('Invitation not found');
    }
    invitation.revoke();
    await this.invitations.save(invitation);
  }
}

// Re-exported for the enforcement layer to reuse the member view type.
export type { ProfileUser };
