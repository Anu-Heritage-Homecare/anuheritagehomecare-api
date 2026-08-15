import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { currencyForCountryCode } from '@shared/domain/currency.enum';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { CreateFlexibleBookingUseCase } from '../application/use-cases/create-flexible-booking.use-case';
import { GetAvailabilityUseCase } from '../application/use-cases/get-availability.use-case';
import { GetBookingUseCase } from '../application/use-cases/get-booking.use-case';
import { ListBookingsUseCase } from '../application/use-cases/list-bookings.use-case';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { AvailabilityResponseDto } from './dto/availability-response.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CreateBookingRequestDto } from './dto/create-booking-request.dto';

/**
 * HTTP entry point for Flexible (hourly) bookings. Every route is JWT protected
 * and scoped to the authenticated owner; pricing currency is derived from their
 * market, never from the request.
 */
@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'bookings', version: '1' })
export class BookingsController {
  constructor(
    private readonly getAvailability: GetAvailabilityUseCase,
    private readonly createBooking: CreateFlexibleBookingUseCase,
    private readonly getBooking: GetBookingUseCase,
    private readonly listBookings: ListBookingsUseCase,
  ) {}

  @Get('availability')
  @ApiOperation({ summary: 'List bookable time slots for a date' })
  @ApiOkResponse({ type: AvailabilityResponseDto })
  availability(@Query() query: AvailabilityQueryDto): AvailabilityResponseDto {
    const result = this.getAvailability.execute({ date: query.date });
    return AvailabilityResponseDto.fromResult(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a Flexible hourly booking (awaiting payment)' })
  @ApiCreatedResponse({ type: BookingResponseDto })
  async create(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: CreateBookingRequestDto,
  ): Promise<BookingResponseDto> {
    const result = await this.createBooking.execute({
      ownerId: principal.userId,
      currency: currencyForCountryCode(principal.country),
      careRecipientId: body.careRecipientId,
      hours: body.hours,
      serviceDate: body.serviceDate,
      startTime: body.startTime,
    });
    return BookingResponseDto.fromResult(result);
  }

  @Get()
  @ApiOperation({ summary: 'List the owner bookings' })
  @ApiOkResponse({ type: BookingResponseDto, isArray: true })
  async findAll(@CurrentUser() principal: AuthenticatedPrincipal): Promise<BookingResponseDto[]> {
    const results = await this.listBookings.execute({ ownerId: principal.userId });
    return results.map((result) => BookingResponseDto.fromResult(result));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch one booking' })
  @ApiOkResponse({ type: BookingResponseDto })
  async findOne(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<BookingResponseDto> {
    const result = await this.getBooking.execute({ ownerId: principal.userId, bookingId: id });
    return BookingResponseDto.fromResult(result);
  }
}
