import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ForbiddenDomainException } from '@shared/domain/domain-exception';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { GetCaregiverScheduleUseCase } from '../application/use-cases/get-caregiver-schedule.use-case';
import { GetVisitDetailUseCase } from '../application/use-cases/get-visit-detail.use-case';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import { ScheduleResponseDto } from './dto/schedule-response.dto';
import { VisitDetailResponseDto } from './dto/visit-detail-response.dto';

/**
 * Caregiver facing schedule. Every route requires a valid access token and is
 * scoped to the authenticated caregiver: they only ever see their own visits.
 * Controllers stay thin, translating HTTP into use case calls and back to DTOs.
 */
@ApiTags('caregiver-schedule')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'caregiver', version: '1' })
export class CaregiverScheduleController {
  constructor(
    private readonly getSchedule: GetCaregiverScheduleUseCase,
    private readonly getVisitDetail: GetVisitDetailUseCase,
  ) {}

  @Get('schedule')
  @ApiOperation({ summary: "A caregiver's visits for a day (default today) or a date range" })
  @ApiOkResponse({ type: ScheduleResponseDto })
  async schedule(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Query() query: ScheduleQueryDto,
  ): Promise<ScheduleResponseDto> {
    this.assertCaregiver(principal);

    const from = query.date ?? query.from;
    const to = query.date ?? query.to;

    const result = await this.getSchedule.execute({
      caregiverId: principal.userId,
      from: from === undefined ? undefined : new Date(from),
      to: to === undefined ? undefined : new Date(to),
      status: query.status,
    });
    return ScheduleResponseDto.fromResult(result);
  }

  @Get('visits/:id')
  @ApiOperation({ summary: "The full appointment detail for one of the caregiver's visits" })
  @ApiOkResponse({ type: VisitDetailResponseDto })
  async detail(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VisitDetailResponseDto> {
    this.assertCaregiver(principal);

    const result = await this.getVisitDetail.execute({
      caregiverId: principal.userId,
      visitId: id,
    });
    return VisitDetailResponseDto.fromResult(result);
  }

  private assertCaregiver(principal: AuthenticatedPrincipal): void {
    // The principal carries the user type as a plain string claim, so compare
    // against the enum's value rather than the enum member.
    if (principal.userType !== String(UserType.Caregiver)) {
      throw new ForbiddenDomainException('Only caregivers can view the work schedule');
    }
  }
}
