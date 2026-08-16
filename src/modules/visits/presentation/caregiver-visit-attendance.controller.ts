import {
  Body,
  Controller,
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
import { ClockInRequestDto } from './dto/clock-in-request.dto';
import { VisitAttendanceResponseDto } from './dto/visit-attendance-response.dto';

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
  ) {}

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
  @ApiOperation({ summary: 'Clock out, completing a visit that is under way' })
  @ApiOkResponse({ type: VisitAttendanceResponseDto })
  async clockOutVisit(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VisitAttendanceResponseDto> {
    this.assertCaregiver(principal);
    const result = await this.clockOut.execute({
      caregiverId: principal.userId,
      visitId: id,
    });
    return VisitAttendanceResponseDto.fromResult(result);
  }

  private assertCaregiver(principal: AuthenticatedPrincipal): void {
    if (principal.userType !== String(UserType.Caregiver)) {
      throw new ForbiddenDomainException('Only caregivers can clock in and out of visits');
    }
  }
}
