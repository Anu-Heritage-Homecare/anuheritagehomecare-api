import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { EMAIL_SENDER } from './application/ports/email-sender.port';
import { OTP_GENERATOR } from './application/ports/otp-generator.port';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { TOKEN_SERVICE } from './application/ports/token-service.port';
import { OtpService } from './application/services/otp.service';
import { TokenIssuerService } from './application/services/token-issuer.service';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { RegisterFamilyOwnerUseCase } from './application/use-cases/register-family-owner.use-case';
import { RequestPasswordResetUseCase } from './application/use-cases/request-password-reset.use-case';
import { ResendEmailVerificationUseCase } from './application/use-cases/resend-email-verification.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.use-case';
import { VerifyPasswordResetOtpUseCase } from './application/use-cases/verify-password-reset-otp.use-case';
import { REFRESH_TOKEN_REPOSITORY } from './domain/refresh-token.repository';
import { USER_REPOSITORY } from './domain/user.repository';
import { VERIFICATION_CODE_REPOSITORY } from './domain/verification-code.repository';
import { NodemailerEmailSender } from './infrastructure/email/nodemailer-email-sender';
import { RefreshTokenPrismaRepository } from './infrastructure/persistence/refresh-token-prisma.repository';
import { UserPrismaRepository } from './infrastructure/persistence/user-prisma.repository';
import { VerificationCodePrismaRepository } from './infrastructure/persistence/verification-code-prisma.repository';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';
import { CryptoOtpGenerator } from './infrastructure/security/crypto-otp-generator';
import { JwtAccessStrategy } from './infrastructure/security/jwt-access.strategy';
import { JwtTokenService } from './infrastructure/security/jwt-token-service';
import { AuthController } from './presentation/auth.controller';

/**
 * Identity bounded context composition root. Every domain port is bound to its
 * infrastructure adapter here via an injection token, so every other layer
 * depends only on the abstraction. Secrets are supplied per call by the token
 * service, so JwtModule needs no static configuration.
 */
@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    RegisterFamilyOwnerUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    VerifyEmailUseCase,
    ResendEmailVerificationUseCase,
    RequestPasswordResetUseCase,
    VerifyPasswordResetOtpUseCase,
    ResetPasswordUseCase,
    ChangePasswordUseCase,
    OtpService,
    TokenIssuerService,
    JwtAccessStrategy,
    { provide: USER_REPOSITORY, useClass: UserPrismaRepository },
    { provide: VERIFICATION_CODE_REPOSITORY, useClass: VerificationCodePrismaRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenPrismaRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    { provide: EMAIL_SENDER, useClass: NodemailerEmailSender },
    { provide: OTP_GENERATOR, useClass: CryptoOtpGenerator },
  ],
  // Exported so other contexts can read a user (for example the visits context
  // resolving a recipient's family owner as the emergency contact).
  exports: [USER_REPOSITORY],
})
export class IdentityModule {}
