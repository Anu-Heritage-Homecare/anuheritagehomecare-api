import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { ChangePasswordUseCase } from '../application/use-cases/change-password.use-case';
import { DisableTwoFactorUseCase } from '../application/use-cases/disable-two-factor.use-case';
import { EnableTwoFactorUseCase } from '../application/use-cases/enable-two-factor.use-case';
import { CreateProfilePhotoTicketUseCase } from '../application/use-cases/create-profile-photo-ticket.use-case';
import { GetMyProfileUseCase } from '../application/use-cases/get-my-profile.use-case';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { SetProfilePhotoUseCase } from '../application/use-cases/set-profile-photo.use-case';
import { UpdateMyProfileUseCase } from '../application/use-cases/update-my-profile.use-case';
import { SetupTwoFactorUseCase } from '../application/use-cases/setup-two-factor.use-case';
import { VerifyTwoFactorLoginUseCase } from '../application/use-cases/verify-two-factor-login.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case';
import { RegisterFamilyOwnerUseCase } from '../application/use-cases/register-family-owner.use-case';
import { RequestPasswordResetUseCase } from '../application/use-cases/request-password-reset.use-case';
import { ResendEmailVerificationUseCase } from '../application/use-cases/resend-email-verification.use-case';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case';
import { VerifyEmailUseCase } from '../application/use-cases/verify-email.use-case';
import { VerifyPasswordResetOtpUseCase } from '../application/use-cases/verify-password-reset-otp.use-case';
import { AuthTokensResponseDto } from './dto/auth-tokens-response.dto';
import { ChangePasswordRequestDto } from './dto/change-password-request.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token-request.dto';
import { RegisterFamilyOwnerRequestDto } from './dto/register-family-owner-request.dto';
import { RegistrationResponseDto } from './dto/registration-response.dto';
import { RequestPasswordResetRequestDto } from './dto/request-password-reset-request.dto';
import { ResendEmailVerificationRequestDto } from './dto/resend-email-verification-request.dto';
import { ResetPasswordRequestDto } from './dto/reset-password-request.dto';
import { ResetTokenResponseDto } from './dto/reset-token-response.dto';
import { UpdateProfileRequestDto } from './dto/update-profile-request.dto';
import { SetProfilePhotoRequestDto } from './dto/set-profile-photo-request.dto';
import { PhotoUploadTicketResponseDto } from './dto/photo-upload-ticket-response.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { VerifyEmailRequestDto } from './dto/verify-email-request.dto';
import { VerifyPasswordResetOtpRequestDto } from './dto/verify-password-reset-otp-request.dto';
import { DisableTwoFactorRequestDto } from './dto/disable-two-factor-request.dto';
import { EnableTwoFactorRequestDto } from './dto/enable-two-factor-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import {
  TwoFactorRecoveryCodesResponseDto,
  TwoFactorSetupResponseDto,
} from './dto/two-factor-response.dto';
import { VerifyTwoFactorLoginRequestDto } from './dto/verify-two-factor-login-request.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// Tight per client limits on sensitive endpoints, layered on top of the global
// throttler, to blunt credential stuffing and code guessing.
const SENSITIVE_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

/**
 * HTTP entry point for mobile authentication. Controllers stay thin: they
 * translate HTTP into application commands and back into response DTOs. All
 * business rules live in the use cases and the domain.
 */
@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly registerFamilyOwner: RegisterFamilyOwnerUseCase,
    private readonly login: LoginUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly logout: LogoutUseCase,
    private readonly verifyEmail: VerifyEmailUseCase,
    private readonly resendEmailVerification: ResendEmailVerificationUseCase,
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    private readonly verifyPasswordResetOtp: VerifyPasswordResetOtpUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
    private readonly changePassword: ChangePasswordUseCase,
    private readonly getMyProfile: GetMyProfileUseCase,
    private readonly updateMyProfile: UpdateMyProfileUseCase,
    private readonly createProfilePhotoTicket: CreateProfilePhotoTicketUseCase,
    private readonly setProfilePhoto: SetProfilePhotoUseCase,
    private readonly setupTwoFactor: SetupTwoFactorUseCase,
    private readonly enableTwoFactor: EnableTwoFactorUseCase,
    private readonly disableTwoFactor: DisableTwoFactorUseCase,
    private readonly verifyTwoFactorLogin: VerifyTwoFactorLoginUseCase,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the personal information of the authenticated user' })
  @ApiOkResponse({ type: UserProfileResponseDto })
  async myProfile(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<UserProfileResponseDto> {
    const result = await this.getMyProfile.execute({ userId: principal.userId });
    return UserProfileResponseDto.fromResult(result);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the personal information of the authenticated user' })
  @ApiOkResponse({ type: UserProfileResponseDto })
  async updateProfile(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: UpdateProfileRequestDto,
  ): Promise<UserProfileResponseDto> {
    const result = await this.updateMyProfile.execute({ userId: principal.userId, ...body });
    return UserProfileResponseDto.fromResult(result);
  }

  @Post('me/photo/upload-ticket')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a signed ticket to upload a new profile photo' })
  @ApiCreatedResponse({ type: PhotoUploadTicketResponseDto })
  uploadPhotoTicket(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): PhotoUploadTicketResponseDto {
    const ticket = this.createProfilePhotoTicket.execute({ userId: principal.userId });
    return PhotoUploadTicketResponseDto.fromTicket(ticket);
  }

  @Put('me/photo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set or clear the profile photo after an upload' })
  @ApiOkResponse({ type: UserProfileResponseDto })
  async setPhoto(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: SetProfilePhotoRequestDto,
  ): Promise<UserProfileResponseDto> {
    const result = await this.setProfilePhoto.execute({
      userId: principal.userId,
      photoKey: body.photoKey ?? null,
    });
    return UserProfileResponseDto.fromResult(result);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a family owner (mobile)' })
  @ApiCreatedResponse({ type: RegistrationResponseDto })
  async register(@Body() body: RegisterFamilyOwnerRequestDto): Promise<RegistrationResponseDto> {
    const result = await this.registerFamilyOwner.execute(body);
    return RegistrationResponseDto.fromResult(result);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({ summary: 'Log in with email and password (may require a second factor)' })
  @ApiOkResponse({ type: LoginResponseDto })
  async logIn(@Body() body: LoginRequestDto): Promise<LoginResponseDto> {
    const result = await this.login.execute(body);
    return LoginResponseDto.fromResult(result);
  }

  @Post('2fa/login')
  @HttpCode(HttpStatus.OK)
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({
    summary: 'Complete a login challenged for two factor with a code or recovery code',
  })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  async twoFactorLogin(
    @Body() body: VerifyTwoFactorLoginRequestDto,
  ): Promise<AuthTokensResponseDto> {
    const result = await this.verifyTwoFactorLogin.execute({
      challengeToken: body.challengeToken,
      code: body.code,
    });
    return AuthTokensResponseDto.fromResult(result);
  }

  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  async refresh(@Body() body: RefreshTokenRequestDto): Promise<AuthTokensResponseDto> {
    const result = await this.refreshToken.execute(body);
    return AuthTokensResponseDto.fromResult(result);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a refresh token' })
  @ApiOkResponse({ type: MessageResponseDto })
  async logOut(@Body() body: LogoutRequestDto): Promise<MessageResponseDto> {
    const result = await this.logout.execute(body);
    return MessageResponseDto.fromResult(result);
  }

  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({ summary: 'Verify an email address with the emailed code' })
  @ApiOkResponse({ type: MessageResponseDto })
  async verifyEmailAddress(@Body() body: VerifyEmailRequestDto): Promise<MessageResponseDto> {
    const result = await this.verifyEmail.execute(body);
    return MessageResponseDto.fromResult(result);
  }

  @Post('email/resend')
  @HttpCode(HttpStatus.OK)
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({ summary: 'Resend the email verification code' })
  @ApiOkResponse({ type: MessageResponseDto })
  async resendVerification(
    @Body() body: ResendEmailVerificationRequestDto,
  ): Promise<MessageResponseDto> {
    const result = await this.resendEmailVerification.execute(body);
    return MessageResponseDto.fromResult(result);
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({ summary: 'Request a password reset code' })
  @ApiOkResponse({ type: MessageResponseDto })
  async forgotPassword(@Body() body: RequestPasswordResetRequestDto): Promise<MessageResponseDto> {
    const result = await this.requestPasswordReset.execute(body);
    return MessageResponseDto.fromResult(result);
  }

  @Post('password/verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({ summary: 'Verify a password reset code and obtain a reset token' })
  @ApiOkResponse({ type: ResetTokenResponseDto })
  async verifyResetCode(
    @Body() body: VerifyPasswordResetOtpRequestDto,
  ): Promise<ResetTokenResponseDto> {
    const result = await this.verifyPasswordResetOtp.execute(body);
    return ResetTokenResponseDto.fromResult(result);
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({ summary: 'Set a new password using a reset token' })
  @ApiOkResponse({ type: MessageResponseDto })
  async resetUserPassword(@Body() body: ResetPasswordRequestDto): Promise<MessageResponseDto> {
    const result = await this.resetPassword.execute(body);
    return MessageResponseDto.fromResult(result);
  }

  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({
    summary: 'Change the password of the authenticated user (also the forced first login change)',
  })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  async changeUserPassword(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: ChangePasswordRequestDto,
  ): Promise<AuthTokensResponseDto> {
    const result = await this.changePassword.execute({
      userId: principal.userId,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });
    return AuthTokensResponseDto.fromResult(result);
  }

  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Begin two factor setup and return the secret and QR provisioning URI' })
  @ApiOkResponse({ type: TwoFactorSetupResponseDto })
  async beginTwoFactorSetup(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<TwoFactorSetupResponseDto> {
    const result = await this.setupTwoFactor.execute({ userId: principal.userId });
    return TwoFactorSetupResponseDto.fromResult(result);
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({ summary: 'Enable two factor by proving a code; returns one time recovery codes' })
  @ApiOkResponse({ type: TwoFactorRecoveryCodesResponseDto })
  async activateTwoFactor(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: EnableTwoFactorRequestDto,
  ): Promise<TwoFactorRecoveryCodesResponseDto> {
    const result = await this.enableTwoFactor.execute({
      userId: principal.userId,
      code: body.code,
    });
    return TwoFactorRecoveryCodesResponseDto.fromResult(result);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({ summary: 'Disable two factor authentication (requires the current password)' })
  @ApiOkResponse({ type: MessageResponseDto })
  async deactivateTwoFactor(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: DisableTwoFactorRequestDto,
  ): Promise<MessageResponseDto> {
    const result = await this.disableTwoFactor.execute({
      userId: principal.userId,
      password: body.password,
    });
    return MessageResponseDto.fromResult(result);
  }
}
