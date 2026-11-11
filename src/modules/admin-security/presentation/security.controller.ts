import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { AdminPrincipal } from '@shared/presentation/admin-principal';
import { CurrentAdmin } from '@shared/presentation/current-admin.decorator';
import { GetAuditLogsUseCase } from '../application/use-cases/get-audit-logs.use-case';
import { GetLoginHistoryUseCase } from '../application/use-cases/get-login-history.use-case';
import { GetSecurityScreenUseCase } from '../application/use-cases/get-security-screen.use-case';
import {
  ConfigureIntegrationUseCase,
  GetIntegrationUseCase,
  ListIntegrationsUseCase,
  SetIntegrationStatusUseCase,
  TestIntegrationConnectionUseCase,
} from '../application/use-cases/integrations.use-cases';
import {
  AuditActor,
  UpdateMfaUseCase,
  UpdatePasswordPolicyUseCase,
  UpdateSessionSettingsUseCase,
} from '../application/use-cases/update-security-settings.use-cases';
import {
  AuditLogsQueryDto,
  ConfigureIntegrationRequestDto,
  LoginHistoryQueryDto,
  SetIntegrationStatusRequestDto,
  UpdateMfaRequestDto,
  UpdatePasswordPolicyRequestDto,
  UpdateSessionSettingsRequestDto,
} from './dto/security-request.dto';
import {
  AuditLogsPageResponseDto,
  IntegrationResponseDto,
  LoginHistoryPageResponseDto,
  SecurityScreenResponseDto,
  TestConnectionResponseDto,
} from './dto/security-response.dto';

function actorOf(admin: AdminPrincipal): AuditActor {
  return { adminId: admin.adminUserId, name: admin.email };
}

/**
 * Settings > Security & Integrations. The Security tab (password policy, MFA,
 * session rules, recent logins), the Integrations tab and the Audit Logs tab.
 * Every route requires a valid admin token. Policy changes are recorded to the
 * audit trail; the policies are stored intent and are not yet enforced in the auth
 * flow.
 */
@ApiTags('admin-security')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/security', version: '1' })
export class SecurityController {
  constructor(
    private readonly getScreen: GetSecurityScreenUseCase,
    private readonly updatePasswordPolicy: UpdatePasswordPolicyUseCase,
    private readonly updateMfa: UpdateMfaUseCase,
    private readonly updateSession: UpdateSessionSettingsUseCase,
    private readonly getLoginHistory: GetLoginHistoryUseCase,
    private readonly listIntegrations: ListIntegrationsUseCase,
    private readonly getIntegration: GetIntegrationUseCase,
    private readonly setIntegrationStatus: SetIntegrationStatusUseCase,
    private readonly configureIntegration: ConfigureIntegrationUseCase,
    private readonly testIntegration: TestIntegrationConnectionUseCase,
    private readonly getAuditLogs: GetAuditLogsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'The Security tab: password policy, MFA, session, recent logins' })
  @ApiOkResponse({ type: SecurityScreenResponseDto })
  async security(): Promise<SecurityScreenResponseDto> {
    return SecurityScreenResponseDto.fromResult(await this.getScreen.execute());
  }

  @Patch('password-policy')
  @ApiOperation({ summary: 'Edit the password policy (the Edit Policy action)' })
  @ApiOkResponse({ type: SecurityScreenResponseDto })
  async passwordPolicy(
    @Body() body: UpdatePasswordPolicyRequestDto,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<SecurityScreenResponseDto> {
    return SecurityScreenResponseDto.fromResult(
      await this.updatePasswordPolicy.execute({ actor: actorOf(admin), ...body }),
    );
  }

  @Patch('mfa')
  @ApiOperation({ summary: 'Edit the MFA mandate (the Edit MFA action)' })
  @ApiOkResponse({ type: SecurityScreenResponseDto })
  async mfa(
    @Body() body: UpdateMfaRequestDto,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<SecurityScreenResponseDto> {
    return SecurityScreenResponseDto.fromResult(
      await this.updateMfa.execute({ actor: actorOf(admin), ...body }),
    );
  }

  @Patch('session')
  @ApiOperation({ summary: 'Edit the session rules (the Session Config action)' })
  @ApiOkResponse({ type: SecurityScreenResponseDto })
  async session(
    @Body() body: UpdateSessionSettingsRequestDto,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<SecurityScreenResponseDto> {
    return SecurityScreenResponseDto.fromResult(
      await this.updateSession.execute({ actor: actorOf(admin), ...body }),
    );
  }

  @Get('login-history')
  @ApiOperation({ summary: 'A page of the admin login history (the View All Logs action)' })
  @ApiOkResponse({ type: LoginHistoryPageResponseDto })
  async loginHistory(@Query() query: LoginHistoryQueryDto): Promise<LoginHistoryPageResponseDto> {
    return LoginHistoryPageResponseDto.fromResult(
      await this.getLoginHistory.execute({ page: query.page, pageSize: query.pageSize }),
    );
  }

  @Get('integrations')
  @ApiOperation({ summary: 'The Integrations tab' })
  @ApiOkResponse({ type: [IntegrationResponseDto] })
  async integrations(): Promise<IntegrationResponseDto[]> {
    const result = await this.listIntegrations.execute();
    return result.map((integration) => IntegrationResponseDto.fromResult(integration));
  }

  @Get('integrations/:id')
  @ApiOperation({ summary: 'One integration with its configuration (the Configure drawer)' })
  @ApiOkResponse({ type: IntegrationResponseDto })
  async integration(@Param('id', ParseUUIDPipe) id: string): Promise<IntegrationResponseDto> {
    return IntegrationResponseDto.fromResult(await this.getIntegration.execute(id));
  }

  @Patch('integrations/:id/status')
  @ApiOperation({ summary: 'Connect or disconnect an integration' })
  @ApiOkResponse({ type: [IntegrationResponseDto] })
  async setIntegration(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetIntegrationStatusRequestDto,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<IntegrationResponseDto[]> {
    const result = await this.setIntegrationStatus.execute({
      integrationId: id,
      status: body.status,
      actor: actorOf(admin),
    });
    return result.map((integration) => IntegrationResponseDto.fromResult(integration));
  }

  @Patch('integrations/:id/config')
  @ApiOperation({ summary: "Save an integration's configuration (the Save Configuration action)" })
  @ApiOkResponse({ type: IntegrationResponseDto })
  async configure(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ConfigureIntegrationRequestDto,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<IntegrationResponseDto> {
    const result = await this.configureIntegration.execute({
      integrationId: id,
      config: { ...body },
      actor: actorOf(admin),
    });
    return IntegrationResponseDto.fromResult(result);
  }

  @Post('integrations/:id/test')
  @HttpCode(200)
  @ApiOperation({ summary: 'Test an integration connection (the Test Connection action)' })
  @ApiOkResponse({ type: TestConnectionResponseDto })
  async testConnection(@Param('id', ParseUUIDPipe) id: string): Promise<TestConnectionResponseDto> {
    return TestConnectionResponseDto.fromResult(await this.testIntegration.execute(id));
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'The Audit Logs tab' })
  @ApiOkResponse({ type: AuditLogsPageResponseDto })
  async auditLogs(@Query() query: AuditLogsQueryDto): Promise<AuditLogsPageResponseDto> {
    return AuditLogsPageResponseDto.fromResult(
      await this.getAuditLogs.execute({
        page: query.page,
        pageSize: query.pageSize,
        category: query.category ?? null,
      }),
    );
  }
}
