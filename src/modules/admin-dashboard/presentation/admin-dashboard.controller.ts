import {
  Body,
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
import { AssignCaregiverUseCase } from '../application/use-cases/assign-caregiver.use-case';
import { GetAdminDashboardUseCase } from '../application/use-cases/get-admin-dashboard.use-case';
import {
  AssignCaregiverRequestDto,
  AssignCaregiverResponseDto,
} from './dto/assign-caregiver-request.dto';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

/**
 * Admin operations dashboard: the one read that powers the home screen, plus the
 * assign caregiver action it offers on unassigned visits. Every route requires a
 * valid admin token.
 */
@ApiTags('admin-dashboard')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin', version: '1' })
export class AdminDashboardController {
  constructor(
    private readonly getDashboard: GetAdminDashboardUseCase,
    private readonly assignCaregiver: AssignCaregiverUseCase,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'The whole operations dashboard in one read' })
  @ApiOkResponse({ type: DashboardResponseDto })
  async dashboard(): Promise<DashboardResponseDto> {
    const result = await this.getDashboard.execute();
    return DashboardResponseDto.fromResult(result);
  }

  @Post('visits/:id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign or reassign a caregiver to a visit' })
  @ApiOkResponse({ type: AssignCaregiverResponseDto })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssignCaregiverRequestDto,
  ): Promise<AssignCaregiverResponseDto> {
    const result = await this.assignCaregiver.execute({
      visitId: id,
      caregiverId: body.caregiverId,
    });
    return {
      visitId: result.visitId,
      caregiverId: result.caregiverId,
      assignedAt: result.assignedAt.toISOString(),
    };
  }
}
