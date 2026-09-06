import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminLoginUseCase } from '../application/use-cases/admin-login.use-case';
import { AdminLogoutUseCase } from '../application/use-cases/admin-logout.use-case';
import { ChangeAdminPasswordUseCase } from '../application/use-cases/change-admin-password.use-case';
import { GetAdminProfileUseCase } from '../application/use-cases/get-admin-profile.use-case';
import { RefreshAdminTokenUseCase } from '../application/use-cases/refresh-admin-token.use-case';
import { AdminPrincipal } from '@shared/presentation/admin-principal';
import { CurrentAdmin } from '@shared/presentation/current-admin.decorator';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { DeviceContext } from '../application/dto/device-context';
import { RequestAdminDevice } from './request-device.decorator';
import { AdminAuthTokensResponseDto } from './dto/admin-auth-tokens-response.dto';
import { AdminLoginRequestDto } from './dto/admin-login-request.dto';
import { AdminProfileResponseDto } from './dto/admin-profile-response.dto';
import { ChangePasswordRequestDto } from './dto/change-password-request.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token-request.dto';

/**
 * Admin back office authentication. Entirely separate from the mobile app auth:
 * distinct tokens, guard and account table. Controllers stay thin, translating
 * HTTP into use case calls and back to DTOs.
 */
@ApiTags('admin-auth')
@Controller({ path: 'admin/auth', version: '1' })
export class AdminAuthController {
  constructor(
    private readonly login: AdminLoginUseCase,
    private readonly refresh: RefreshAdminTokenUseCase,
    private readonly logout: AdminLogoutUseCase,
    private readonly changePassword: ChangeAdminPasswordUseCase,
    private readonly getProfile: GetAdminProfileUseCase,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate an admin with email and password' })
  @ApiOkResponse({ type: AdminAuthTokensResponseDto })
  async signIn(
    @Body() body: AdminLoginRequestDto,
    @RequestAdminDevice() device: DeviceContext,
  ): Promise<AdminAuthTokensResponseDto> {
    const result = await this.login.execute({
      email: body.email,
      password: body.password,
      device,
    });
    return AdminAuthTokensResponseDto.fromResult(result);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a fresh admin token pair' })
  @ApiOkResponse({ type: AdminAuthTokensResponseDto })
  async refreshTokens(@Body() body: RefreshTokenRequestDto): Promise<AdminAuthTokensResponseDto> {
    const result = await this.refresh.execute({ refreshToken: body.refreshToken });
    return AdminAuthTokensResponseDto.fromResult(result);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out of the current device' })
  @ApiOkResponse({ type: MessageResponseDto })
  async signOut(@Body() body: RefreshTokenRequestDto): Promise<MessageResponseDto> {
    await this.logout.execute({ refreshToken: body.refreshToken });
    return MessageResponseDto.of('Signed out');
  }

  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the authenticated admin password' })
  @ApiOkResponse({ type: AdminAuthTokensResponseDto })
  async changeMyPassword(
    @CurrentAdmin() principal: AdminPrincipal,
    @Body() body: ChangePasswordRequestDto,
    @RequestAdminDevice() device: DeviceContext,
  ): Promise<AdminAuthTokensResponseDto> {
    const result = await this.changePassword.execute({
      adminUserId: principal.adminUserId,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      device,
    });
    return AdminAuthTokensResponseDto.fromResult(result);
  }

  @Get('me')
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "The authenticated admin's own account information" })
  @ApiOkResponse({ type: AdminProfileResponseDto })
  async me(@CurrentAdmin() principal: AdminPrincipal): Promise<AdminProfileResponseDto> {
    const result = await this.getProfile.execute(principal.adminUserId);
    return AdminProfileResponseDto.fromResult(result);
  }
}
