import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { ValidationException } from '@shared/domain/domain-exception';
import {
  ADMIN_PASSWORD_HASHER,
  PasswordHasher,
} from '@modules/admin-identity/application/ports/password-hasher.port';
import { Password } from '@modules/admin-identity/domain/value-objects/password.vo';
import { ACCESS_ROLE_REPOSITORY, AccessRoleRepository } from '../../domain/access-role.repository';
import { INVITATION_REPOSITORY, InvitationRepository } from '../../domain/invitation.repository';
import { ADMIN_USER_DIRECTORY, AdminUserDirectory } from '../ports/admin-user-directory.port';
import {
  INVITATION_TOKEN_SERVICE,
  InvitationTokenService,
} from '../ports/invitation-token.service';
import { authRoleFor } from './users.use-cases';

export interface AcceptInvitationCommand {
  token: string;
  password: string;
}

export interface AcceptInvitationResult {
  userId: string;
  email: string;
}

/**
 * Use case: an invitee accepts their invitation. Proving the one time token and
 * choosing a password provisions an active back office account with the invited
 * role and branch, then closes the invitation. Public (the invitee is not yet an
 * admin); it reveals nothing about which tokens exist beyond accept or reject.
 */
@Injectable()
export class AcceptInvitationUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY) private readonly invitations: InvitationRepository,
    @Inject(ACCESS_ROLE_REPOSITORY) private readonly roles: AccessRoleRepository,
    @Inject(ADMIN_USER_DIRECTORY) private readonly directory: AdminUserDirectory,
    @Inject(INVITATION_TOKEN_SERVICE) private readonly tokens: InvitationTokenService,
    @Inject(ADMIN_PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: AcceptInvitationCommand): Promise<AcceptInvitationResult> {
    const password = Password.create(command.password);
    const tokenHash = this.tokens.hash(command.token);
    const invitation = await this.invitations.findPendingByTokenHash(tokenHash);
    if (invitation === null) {
      throw new ValidationException('This invitation is invalid or has already been used');
    }

    const now = this.clock.now();
    // Closes the invitation; throws (and marks it expired) if it is past its expiry.
    invitation.accept(now);

    if (await this.directory.existsByEmail(invitation.email)) {
      throw new ValidationException('An account for this email already exists');
    }
    const role = await this.roles.findById(invitation.roleId);
    if (role === null) {
      throw new ValidationException('The invited role no longer exists');
    }

    const userId = this.ids.generate();
    const passwordHash = await this.hasher.hash(password.value);
    await this.directory.provisionFromInvitation({
      id: userId,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      email: invitation.email,
      phoneNumber: invitation.phoneNumber,
      department: invitation.department,
      passwordHash,
      roleId: invitation.roleId,
      branchId: invitation.branchId,
      authRole: authRoleFor(role.systemKey),
      mustChangePassword: false,
    });
    await this.invitations.save(invitation);

    return { userId, email: invitation.email };
  }
}
