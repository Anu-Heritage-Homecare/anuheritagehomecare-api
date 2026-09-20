import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { GetCaregiverOverviewUseCase } from '../application/use-cases/get-caregiver-overview.use-case';
import { ListCaregiversUseCase } from '../application/use-cases/list-caregivers.use-case';
import {
  CaregiverListResponseDto,
  CaregiverOverviewResponseDto,
} from './dto/caregiver-response.dto';
import { CaregiversQueryDto } from './dto/caregivers-query.dto';

/**
 * Admin Caregivers panel: the caregiver directory and the profile Overview. Requires
 * a valid admin token. Controllers stay thin.
 */
@ApiTags('admin-caregivers')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/caregivers', version: '1' })
export class AdminCaregiversController {
  constructor(
    private readonly listCaregivers: ListCaregiversUseCase,
    private readonly getOverview: GetCaregiverOverviewUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'The caregivers directory, optionally filtered by status' })
  @ApiOkResponse({ type: CaregiverListResponseDto })
  async list(@Query() query: CaregiversQueryDto): Promise<CaregiverListResponseDto> {
    const result = await this.listCaregivers.execute({
      status: query.status ?? null,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
    return CaregiverListResponseDto.fromResult(result);
  }

  @Get(':id/overview')
  @ApiOperation({ summary: 'The caregiver Overview tab' })
  @ApiOkResponse({ type: CaregiverOverviewResponseDto })
  async overview(@Param('id', ParseUUIDPipe) id: string): Promise<CaregiverOverviewResponseDto> {
    const result = await this.getOverview.execute(id);
    return CaregiverOverviewResponseDto.fromResult(result);
  }
}
