import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { AdminPrincipal } from '@shared/presentation/admin-principal';
import { CurrentAdmin } from '@shared/presentation/current-admin.decorator';
import { ListOpenAlertsUseCase } from '../application/use-cases/list-open-alerts.use-case';
import { ResolveAlertUseCase } from '../application/use-cases/resolve-alert.use-case';
import { AlertListResponseDto, AlertResponseDto } from './dto/alert-response.dto';

/**
 * Admin operational alerts: the coordinator reads the open alerts and closes one
 * by resolving (actioned) or dismissing (no action needed). Every route requires a
 * valid admin token. Controllers stay thin, translating HTTP into use case calls.
 */
@ApiTags('admin-alerts')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/alerts', version: '1' })
export class AdminAlertsController {
  constructor(
    private readonly listOpen: ListOpenAlertsUseCase,
    private readonly closeAlert: ResolveAlertUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the open operational alerts, most severe first' })
  @ApiOkResponse({ type: AlertListResponseDto })
  async list(): Promise<AlertListResponseDto> {
    const results = await this.listOpen.execute();
    return AlertListResponseDto.fromResults(results);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve an alert (a coordinator actioned it)' })
  @ApiOkResponse({ type: AlertResponseDto })
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<AlertResponseDto> {
    const result = await this.closeAlert.execute({
      alertId: id,
      adminId: principal.adminUserId,
      closure: 'RESOLVE',
    });
    return AlertResponseDto.fromResult(result);
  }

  @Post(':id/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dismiss an alert (acknowledged, no action needed)' })
  @ApiOkResponse({ type: AlertResponseDto })
  async dismiss(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<AlertResponseDto> {
    const result = await this.closeAlert.execute({
      alertId: id,
      adminId: principal.adminUserId,
      closure: 'DISMISS',
    });
    return AlertResponseDto.fromResult(result);
  }
}
