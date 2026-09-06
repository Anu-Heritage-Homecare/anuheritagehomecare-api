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
import { DisableTwoFactorUseCase } from './application/use-cases/disable-two-factor.use-case';
import { EnableTwoFactorUseCase } from './application/use-cases/enable-two-factor.use-case';
import { CreateProfilePhotoTicketUseCase } from './application/use-cases/create-profile-photo-ticket.use-case';
import { DeleteAccountUseCase } from './application/use-cases/delete-account.use-case';
import { GetMyProfileUseCase } from './application/use-cases/get-my-profile.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { SetProfilePhotoUseCase } from './application/use-cases/set-profile-photo.use-case';
import { UpdateMyProfileUseCase } from './application/use-cases/update-my-profile.use-case';
import { SetupTwoFactorUseCase } from './application/use-cases/setup-two-factor.use-case';
import { VerifyTwoFactorLoginUseCase } from './application/use-cases/verify-two-factor-login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import {
  ListDevicesUseCase,
  LogoutAllDevicesUseCase,
  RevokeDeviceUseCase,
} from './application/use-cases/device-session.use-cases';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { RegisterFamilyOwnerUseCase } from './application/use-cases/register-family-owner.use-case';
import { RequestPasswordResetUseCase } from './application/use-cases/request-password-reset.use-case';
import { ResendEmailVerificationUseCase } from './application/use-cases/resend-email-verification.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.use-case';
import { VerifyPasswordResetOtpUseCase } from './application/use-cases/verify-password-reset-otp.use-case';
import { DEVICE_SESSION_REPOSITORY } from './domain/device-session.repository';
import { TWO_FACTOR_RECOVERY_CODE_REPOSITORY } from './domain/two-factor-recovery-code.repository';
import { USER_REPOSITORY } from './domain/user.repository';
import { VERIFICATION_CODE_REPOSITORY } from './domain/verification-code.repository';
import { SECRET_CIPHER } from './application/ports/secret-cipher.port';
import { TWO_FACTOR_AUTHENTICATOR } from './application/ports/two-factor-authenticator.port';
import { NodemailerEmailSender } from './infrastructure/email/nodemailer-email-sender';
import { DeviceSessionPrismaRepository } from './infrastructure/persistence/device-session-prisma.repository';
import { TwoFactorRecoveryCodePrismaRepository } from './infrastructure/persistence/two-factor-recovery-code-prisma.repository';
import { UserPrismaRepository } from './infrastructure/persistence/user-prisma.repository';
import { VerificationCodePrismaRepository } from './infrastructure/persistence/verification-code-prisma.repository';
import { AesGcmSecretCipher } from './infrastructure/security/aes-gcm-secret-cipher';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';
import { CryptoOtpGenerator } from './infrastructure/security/crypto-otp-generator';
import { JwtAccessStrategy } from './infrastructure/security/jwt-access.strategy';
import { JwtTokenService } from './infrastructure/security/jwt-token-service';
import { TotpAuthenticator } from './infrastructure/security/totp-authenticator';
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
    GetMyProfileUseCase,
    UpdateMyProfileUseCase,
    CreateProfilePhotoTicketUseCase,
    SetProfilePhotoUseCase,
    DeleteAccountUseCase,
    SetupTwoFactorUseCase,
    EnableTwoFactorUseCase,
    DisableTwoFactorUseCase,
    VerifyTwoFactorLoginUseCase,
    ListDevicesUseCase,
    RevokeDeviceUseCase,
    LogoutAllDevicesUseCase,
    OtpService,
    TokenIssuerService,
    JwtAccessStrategy,
    { provide: USER_REPOSITORY, useClass: UserPrismaRepository },
    { provide: VERIFICATION_CODE_REPOSITORY, useClass: VerificationCodePrismaRepository },
    { provide: DEVICE_SESSION_REPOSITORY, useClass: DeviceSessionPrismaRepository },
    {
      provide: TWO_FACTOR_RECOVERY_CODE_REPOSITORY,
      useClass: TwoFactorRecoveryCodePrismaRepository,
    },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    { provide: EMAIL_SENDER, useClass: NodemailerEmailSender },
    { provide: OTP_GENERATOR, useClass: CryptoOtpGenerator },
    { provide: TWO_FACTOR_AUTHENTICATOR, useClass: TotpAuthenticator },
    { provide: SECRET_CIPHER, useClass: AesGcmSecretCipher },
  ],
  // Exported so other contexts can read a user (for example the visits context
  // resolving a recipient's family owner as the emergency contact).
  exports: [USER_REPOSITORY],
})
export class IdentityModule {}
