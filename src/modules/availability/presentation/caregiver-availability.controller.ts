import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ForbiddenDomainException } from '@shared/domain/domain-exception';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { GetAvailabilityForDayUseCase } from '../application/use-cases/get-availability-for-day.use-case';
import { GetCaregiverAvailabilityUseCase } from '../application/use-cases/get-caregiver-availability.use-case';
import { SetCaregiverAvailabilityUseCase } from '../application/use-cases/set-caregiver-availability.use-case';
import { AvailabilityDayQueryDto, AvailabilityQueryDto } from './dto/availability-query.dto';
import {
  AvailabilityDayResponseDto,
  AvailabilityListResponseDto,
  DayAvailabilityResponseDto,
} from './dto/availability-response.dto';
import { SetAvailabilityRequestDto } from './dto/set-availability-request.dto';

/**
 * Caregiver availability: the caregiver declares the time windows they are open
 * to work on each day, and reads them back for the week strip. Every route
 * requires a valid access token and is scoped to the authenticated caregiver, so
 * they only ever read or write their own availability. Controllers stay thin,
 * translating HTTP into use case calls and back to DTOs.
 */
@ApiTags('caregiver-availability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'caregiver/availability', version: '1' })
export class CaregiverAvailabilityController {
  constructor(
    private readonly getAvailability: GetCaregiverAvailabilityUseCase,
    private readonly getAvailabilityForDay: GetAvailabilityForDayUseCase,
    private readonly setAvailability: SetCaregiverAvailabilityUseCase,
  ) {}

  @Get('day')
  @ApiOperation({
    summary: 'The availability picker for one day: available windows plus booked slots',
  })
  @ApiOkResponse({ type: DayAvailabilityResponseDto })
  async day(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Query() query: AvailabilityDayQueryDto,
  ): Promise<DayAvailabilityResponseDto> {
    this.assertCaregiver(principal);

    const result = await this.getAvailabilityForDay.execute({
      caregiverId: principal.userId,
      date: query.date === undefined ? undefined : new Date(query.date),
    });
    return DayAvailabilityResponseDto.fromResult(result);
  }

  @Get()
  @ApiOperation({ summary: 'Fetch availability for a single day (default today) or a date range' })
  @ApiOkResponse({ type: AvailabilityListResponseDto })
  async fetch(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Query() query: AvailabilityQueryDto,
  ): Promise<AvailabilityListResponseDto> {
    this.assertCaregiver(principal);

    const from = query.date ?? query.from;
    const to = query.date ?? query.to;

    const result = await this.getAvailability.execute({
      caregiverId: principal.userId,
      from: from === undefined ? undefined : new Date(from),
      to: to === undefined ? undefined : new Date(to),
    });
    return AvailabilityListResponseDto.fromResults(result);
  }

  @Put()
  @ApiOperation({ summary: "Set (replace) the caregiver's availability for a single day" })
  @ApiOkResponse({ type: AvailabilityDayResponseDto })
  async set(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: SetAvailabilityRequestDto,
  ): Promise<AvailabilityDayResponseDto> {
    this.assertCaregiver(principal);

    const result = await this.setAvailability.execute({
      caregiverId: principal.userId,
      date: new Date(body.date),
      slots: body.slots.map((slot) => ({
        startMinute: slot.startMinute,
        endMinute: slot.endMinute,
      })),
    });
    return AvailabilityDayResponseDto.fromResult(result);
  }

  private assertCaregiver(principal: AuthenticatedPrincipal): void {
    // The principal carries the user type as a plain string claim, so compare
    // against the enum's value rather than the enum member.
    if (principal.userType !== String(UserType.Caregiver)) {
      throw new ForbiddenDomainException('Only caregivers can manage their availability');
    }
  }
}
