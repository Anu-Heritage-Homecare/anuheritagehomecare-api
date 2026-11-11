import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  ADMIN_PASSWORD_HASHER,
  PasswordHasher,
} from '@modules/admin-identity/application/ports/password-hasher.port';
import { Password } from '@modules/admin-identity/domain/value-objects/password.vo';
import { Invitation } from '../../domain/invitation.entity';
import { InvitationStatus } from '../../domain/invitation-status.enum';
import { INVITATION_REPOSITORY, InvitationRepository } from '../../domain/invitation.repository';
import { ACCESS_ROLE_REPOSITORY, AccessRoleRepository } from '../../domain/access-role.repository';
import { ADMIN_USER_DIRECTORY, AdminUserDirectory } from '../ports/admin-user-directory.port';
import {
  INVITATION_TOKEN_SERVICE,
  InvitationTokenService,
} from '../ports/invitation-token.service';
import {
  InvitationResult,
  InvitationWithTokenResult,
  toInvitationResult,
} from '../dto/invitation.result';
import { authRoleFor } from './users.use-cases';

/** shortcut: fixed 7 day invitation validity; lift to config if the business needs it. */
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * A random temporary password that satisfies the admin password policy (a
 * lowercase, an uppercase and a digit are guaranteed by the fixed prefix, the
 * rest is 9 random bytes). It is returned once so it can be handed to the invitee
 * and must be changed on first login.
 */
function generateTemporaryPassword(): string {
  return `Aa1${randomBytes(9).toString('base64url')}`;
}

/** Use case: list invitations, optionally filtered by status. */
@Injectable()
export class ListInvitationsUseCase {
  constructor(@Inject(INVITATION_REPOSITORY) private readonly invitations: InvitationRepository) {}

  async execute(status: InvitationStatus | null): Promise<InvitationResult[]> {
    const invitations = await this.invitations.list(status);
    return invitations.map(toInvitationResult);
  }
}

export interface CreateInvitationCommand {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  department?: string | null;
  roleId: string;
  branchId?: string | null;
  invitedByAdminId: string;
}

/** Use case: invite a new back office user (the Invite User action). */
@Injectable()
export class CreateInvitationUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY) private readonly invitations: InvitationRepository,
    @Inject(ACCESS_ROLE_REPOSITORY) private readonly roles: AccessRoleRepository,
    @Inject(ADMIN_USER_DIRECTORY) private readonly directory: AdminUserDirectory,
    @Inject(INVITATION_TOKEN_SERVICE) private readonly tokens: InvitationTokenService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreateInvitationCommand): Promise<InvitationWithTokenResult> {
    const email = command.email.trim().toLowerCase();
    const role = await this.roles.findById(command.roleId);
    if (role === null) {
      throw new ValidationException('The selected role does not exist');
    }
    if (command.branchId) {
      const branchOk = await this.directory.branchExists(command.branchId);
      if (!branchOk) {
        throw new ValidationException('The selected branch does not exist');
      }
    }
    if (await this.directory.existsByEmail(email)) {
      throw new ValidationException('A user with this email already exists');
    }
    if (await this.invitations.existsPendingForEmail(email)) {
      throw new ValidationException('An invitation for this email is already pending');
    }

    const now = this.clock.now();
    const { token, tokenHash } = this.tokens.generate();
    const invitation = Invitation.create({
      id: this.ids.generate(),
      email,
      firstName: command.firstName,
      lastName: command.lastName,
      phoneNumber: command.phoneNumber ?? null,
      department: command.department ?? null,
      roleId: command.roleId,
      branchId: command.branchId ?? null,
      tokenHash,
      expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
      invitedByAdminId: command.invitedByAdminId,
      now,
    });
    await this.invitations.save(invitation);
    return { ...toInvitationResult(invitation), token };
  }
}

export interface ProvisionAdminUserCommand {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  department?: string | null;
  roleId: string;
  branchId?: string | null;
}

export interface ProvisionedAdminResult {
  userId: string;
  email: string;
  /** The temporary password, returned once; the account must change it on first login. */
  temporaryPassword: string;
}

/**
 * Use case: provision a back office account immediately with a generated temporary
 * password (the "send welcome email with credentials" path of the Invite User
 * drawer). The account is active but carries `mustChangePassword`, forcing a change
 * on first login. The temporary password is returned once so it can be delivered to
 * the invitee; actual email delivery is deferred (no dispatcher yet).
 */
@Injectable()
export class ProvisionAdminUserUseCase {
  constructor(
    @Inject(ACCESS_ROLE_REPOSITORY) private readonly roles: AccessRoleRepository,
    @Inject(ADMIN_USER_DIRECTORY) private readonly directory: AdminUserDirectory,
    @Inject(ADMIN_PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: ProvisionAdminUserCommand): Promise<ProvisionedAdminResult> {
    const email = command.email.trim().toLowerCase();
    const role = await this.roles.findById(command.roleId);
    if (role === null) {
      throw new ValidationException('The selected role does not exist');
    }
    if (command.branchId) {
      const branchOk = await this.directory.branchExists(command.branchId);
      if (!branchOk) {
        throw new ValidationException('The selected branch does not exist');
      }
    }
    if (await this.directory.existsByEmail(email)) {
      throw new ValidationException('A user with this email already exists');
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await this.hasher.hash(Password.create(temporaryPassword).value);
    const userId = this.ids.generate();
    await this.directory.provisionFromInvitation({
      id: userId,
      firstName: command.firstName.trim(),
      lastName: command.lastName.trim(),
      email,
      phoneNumber: command.phoneNumber?.trim() || null,
      department: command.department?.trim() || null,
      passwordHash,
      roleId: command.roleId,
      branchId: command.branchId ?? null,
      authRole: authRoleFor(role.systemKey),
      mustChangePassword: true,
    });
    return { userId, email, temporaryPassword };
  }
}

export interface ResendInvitationCommand {
  invitationId: string;
}

/** Use case: reissue a pending invitation's token and extend its expiry. */
@Injectable()
export class ResendInvitationUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY) private readonly invitations: InvitationRepository,
    @Inject(INVITATION_TOKEN_SERVICE) private readonly tokens: InvitationTokenService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ResendInvitationCommand): Promise<InvitationWithTokenResult> {
    const invitation = await this.invitations.findById(command.invitationId);
    if (invitation === null) {
      throw new NotFoundDomainException('Invitation not found');
    }
    const now = this.clock.now();
    const { token, tokenHash } = this.tokens.generate();
    invitation.reissue(tokenHash, new Date(now.getTime() + INVITATION_TTL_MS), now);
    await this.invitations.save(invitation);
    return { ...toInvitationResult(invitation), token };
  }
}

export interface RevokeInvitationCommand {
  invitationId: string;
}

/** Use case: revoke a pending invitation. */
@Injectable()
export class RevokeInvitationUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY) private readonly invitations: InvitationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: RevokeInvitationCommand): Promise<InvitationResult> {
    const invitation = await this.invitations.findById(command.invitationId);
    if (invitation === null) {
      throw new NotFoundDomainException('Invitation not found');
    }
    invitation.revoke(this.clock.now());
    await this.invitations.save(invitation);
    return toInvitationResult(invitation);
  }
}
