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
import { ForbiddenDomainException } from '@shared/domain/domain-exception';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { ClockInVisitUseCase } from '../application/use-cases/clock-in-visit.use-case';
import { ClockOutVisitUseCase } from '../application/use-cases/clock-out-visit.use-case';
import { EndBreakUseCase } from '../application/use-cases/end-break.use-case';
import { GetVisitReviewUseCase } from '../application/use-cases/get-visit-review.use-case';
import { StartBreakUseCase } from '../application/use-cases/start-break.use-case';
import { ClockInRequestDto } from './dto/clock-in-request.dto';
import { VisitAttendanceResponseDto } from './dto/visit-attendance-response.dto';
import { VisitBreakResponseDto } from './dto/visit-break-response.dto';
import { VisitCompletionResponseDto } from './dto/visit-completion-response.dto';
import { VisitReviewResponseDto } from './dto/visit-review-response.dto';

/**
 * Caregiver visit attendance: the geofenced clock in on arrival and the clock
 * out on completion. Both require a valid access token and are scoped to the
 * authenticated caregiver, so they can only act on their own visits.
 */
@ApiTags('caregiver-schedule')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'caregiver/visits', version: '1' })
export class CaregiverVisitAttendanceController {
  constructor(
    private readonly clockIn: ClockInVisitUseCase,
    private readonly clockOut: ClockOutVisitUseCase,
    private readonly startBreak: StartBreakUseCase,
    private readonly endBreak: EndBreakUseCase,
    private readonly review: GetVisitReviewUseCase,
  ) {}

  @Get(':id/review')
  @ApiOperation({
    summary: 'Review the visit record before completing (checklist of what is filled in)',
  })
  @ApiOkResponse({ type: VisitReviewResponseDto })
  async reviewVisit(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VisitReviewResponseDto> {
    this.assertCaregiver(principal);
    const result = await this.review.execute({ caregiverId: principal.userId, visitId: id });
    return VisitReviewResponseDto.fromResult(result);
  }

  @Post(':id/clock-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clock in on arrival, validated against the recipient geofence' })
  @ApiOkResponse({ type: VisitAttendanceResponseDto })
  async clockInVisit(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ClockInRequestDto,
  ): Promise<VisitAttendanceResponseDto> {
    this.assertCaregiver(principal);
    const result = await this.clockIn.execute({
      caregiverId: principal.userId,
      visitId: id,
      latitude: body.latitude,
      longitude: body.longitude,
    });
    return VisitAttendanceResponseDto.fromResult(result);
  }

  @Post(':id/clock-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit and complete the visit (clock out); returns the time breakdown',
  })
  @ApiOkResponse({ type: VisitCompletionResponseDto })
  async clockOutVisit(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VisitCompletionResponseDto> {
    this.assertCaregiver(principal);
    const result = await this.clockOut.execute({
      caregiverId: principal.userId,
      visitId: id,
    });
    return VisitCompletionResponseDto.fromResult(result);
  }

  @Post(':id/break/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a break, pausing the visit (moves it to ON_BREAK)' })
  @ApiOkResponse({ type: VisitBreakResponseDto })
  async startVisitBreak(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VisitBreakResponseDto> {
    this.assertCaregiver(principal);
    const result = await this.startBreak.execute({ caregiverId: principal.userId, visitId: id });
    return VisitBreakResponseDto.fromResult(result);
  }

  @Post(':id/break/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End the current break, resuming the visit' })
  @ApiOkResponse({ type: VisitBreakResponseDto })
  async endVisitBreak(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VisitBreakResponseDto> {
    this.assertCaregiver(principal);
    const result = await this.endBreak.execute({ caregiverId: principal.userId, visitId: id });
    return VisitBreakResponseDto.fromResult(result);
  }

  private assertCaregiver(principal: AuthenticatedPrincipal): void {
    if (principal.userType !== String(UserType.Caregiver)) {
      throw new ForbiddenDomainException('Only caregivers can clock in and out of visits');
    }
  }
}
