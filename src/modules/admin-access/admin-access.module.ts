import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ADMIN_PASSWORD_HASHER } from '@modules/admin-identity/application/ports/password-hasher.port';
import { AdminBcryptPasswordHasher } from '@modules/admin-identity/infrastructure/security/admin-bcrypt-password-hasher';
import { ACCESS_ROLE_REPOSITORY } from './domain/access-role.repository';
import { INVITATION_REPOSITORY } from './domain/invitation.repository';
import { ADMIN_USER_DIRECTORY } from './application/ports/admin-user-directory.port';
import { INVITATION_TOKEN_SERVICE } from './application/ports/invitation-token.service';
import { AcceptInvitationUseCase } from './application/use-cases/accept-invitation.use-case';
import { GetPermissionsMatrixUseCase } from './application/use-cases/get-permissions-matrix.use-case';
import {
  CreateInvitationUseCase,
  ListInvitationsUseCase,
  ProvisionAdminUserUseCase,
  ResendInvitationUseCase,
  RevokeInvitationUseCase,
} from './application/use-cases/invitations.use-cases';
import {
  CreateRoleUseCase,
  DeleteRoleUseCase,
  ListRolesUseCase,
  SetRolePermissionsUseCase,
  UpdateRoleUseCase,
} from './application/use-cases/roles.use-cases';
import {
  DeleteAdminUserUseCase,
  ListAdminUsersUseCase,
  UpdateAdminUserUseCase,
} from './application/use-cases/users.use-cases';
import { AccessRolePrismaRepository } from './infrastructure/persistence/access-role.prisma.repository';
import { AdminUserDirectoryPrisma } from './infrastructure/persistence/admin-user-directory.prisma';
import { InvitationPrismaRepository } from './infrastructure/persistence/invitation.prisma.repository';
import { CryptoInvitationTokenService } from './infrastructure/security/invitation-token.crypto';
import { AdminAccessController } from './presentation/admin-access.controller';
import { InvitationAcceptController } from './presentation/invitation-accept.controller';

/**
 * Admin Access bounded context composition root. Powers Settings > Users &
 * Permissions: admin accounts, configurable roles, the permission catalog and
 * matrix, and invitations. It reuses the admin-identity password hasher so an
 * invited account's credential is hashed exactly as a provisioned one.
 */
@Module({
  imports: [PassportModule],
  controllers: [AdminAccessController, InvitationAcceptController],
  providers: [
    ListAdminUsersUseCase,
    UpdateAdminUserUseCase,
    DeleteAdminUserUseCase,
    ListRolesUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    SetRolePermissionsUseCase,
    DeleteRoleUseCase,
    GetPermissionsMatrixUseCase,
    ListInvitationsUseCase,
    CreateInvitationUseCase,
    ProvisionAdminUserUseCase,
    ResendInvitationUseCase,
    RevokeInvitationUseCase,
    AcceptInvitationUseCase,
    { provide: ACCESS_ROLE_REPOSITORY, useClass: AccessRolePrismaRepository },
    { provide: INVITATION_REPOSITORY, useClass: InvitationPrismaRepository },
    { provide: ADMIN_USER_DIRECTORY, useClass: AdminUserDirectoryPrisma },
    { provide: INVITATION_TOKEN_SERVICE, useClass: CryptoInvitationTokenService },
    { provide: ADMIN_PASSWORD_HASHER, useClass: AdminBcryptPasswordHasher },
  ],
})
export class AdminAccessModule {}
