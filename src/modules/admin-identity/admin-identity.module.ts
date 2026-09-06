import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ADMIN_PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { ADMIN_TOKEN_SERVICE } from './application/ports/token-service.port';
import { AdminTokenIssuerService } from './application/services/admin-token-issuer.service';
import { AdminLoginUseCase } from './application/use-cases/admin-login.use-case';
import { AdminLogoutUseCase } from './application/use-cases/admin-logout.use-case';
import { ChangeAdminPasswordUseCase } from './application/use-cases/change-admin-password.use-case';
import { GetAdminProfileUseCase } from './application/use-cases/get-admin-profile.use-case';
import { RefreshAdminTokenUseCase } from './application/use-cases/refresh-admin-token.use-case';
import { ADMIN_SESSION_REPOSITORY } from './domain/admin-session.repository';
import { ADMIN_USER_REPOSITORY } from './domain/admin-user.repository';
import { AdminSessionPrismaRepository } from './infrastructure/persistence/admin-session-prisma.repository';
import { AdminUserPrismaRepository } from './infrastructure/persistence/admin-user-prisma.repository';
import { AdminBcryptPasswordHasher } from './infrastructure/security/admin-bcrypt-password-hasher';
import { AdminJwtAccessStrategy } from './infrastructure/security/admin-jwt-access.strategy';
import { AdminJwtTokenService } from './infrastructure/security/admin-jwt-token.service';
import { AdminAuthController } from './presentation/admin-auth.controller';

/**
 * Admin identity bounded context composition root. Every domain port is bound to
 * its infrastructure adapter here via an injection token. The token service is
 * entirely separate from the mobile identity context, so admin and mobile
 * credentials and sessions never mix. The admin user repository is exported so
 * later admin contexts can read admin accounts (for example resolving an alert
 * coordinator).
 */
@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AdminAuthController],
  providers: [
    AdminLoginUseCase,
    RefreshAdminTokenUseCase,
    AdminLogoutUseCase,
    ChangeAdminPasswordUseCase,
    GetAdminProfileUseCase,
    AdminTokenIssuerService,
    AdminJwtAccessStrategy,
    { provide: ADMIN_USER_REPOSITORY, useClass: AdminUserPrismaRepository },
    { provide: ADMIN_SESSION_REPOSITORY, useClass: AdminSessionPrismaRepository },
    { provide: ADMIN_PASSWORD_HASHER, useClass: AdminBcryptPasswordHasher },
    { provide: ADMIN_TOKEN_SERVICE, useClass: AdminJwtTokenService },
  ],
  exports: [ADMIN_USER_REPOSITORY],
})
export class AdminIdentityModule {}
