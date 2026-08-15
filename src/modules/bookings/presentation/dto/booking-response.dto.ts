import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '@shared/domain/currency.enum';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { BookingResult } from '../../application/dto/booking.result';
import { BookingStatus } from '../../domain/booking-status.enum';

class BookingPriceDto {
  @ApiProperty({ enum: Currency, enumName: 'Currency' })
  currency!: Currency;

  @ApiProperty()
  hourlyRateMinor!: number;

  @ApiProperty()
  subtotalMinor!: number;

  @ApiProperty()
  serviceFeeMinor!: number;

  @ApiProperty()
  totalMinor!: number;
}

/** HTTP response contract for a booking, with the snapshotted price breakdown. */
export class BookingResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  careRecipientId!: string;

  @ApiProperty({ enum: CarePlanType, enumName: 'CarePlanType' })
  planType!: CarePlanType;

  @ApiProperty({ enum: BookingStatus, enumName: 'BookingStatus' })
  status!: BookingStatus;

  @ApiProperty()
  hours!: number;

  @ApiProperty({ example: '2026-07-28' })
  serviceDate!: string;

  @ApiProperty({ example: '09:00' })
  startTime!: string;

  @ApiProperty({ example: '15:00' })
  endTime!: string;

  @ApiProperty({ description: 'Whether the estimated end time falls on the next day' })
  endsNextDay!: boolean;

  @ApiProperty({ type: BookingPriceDto })
  price!: BookingPriceDto;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  static fromResult(result: BookingResult): BookingResponseDto {
    const dto = new BookingResponseDto();
    dto.id = result.id;
    dto.careRecipientId = result.careRecipientId;
    dto.planType = result.planType;
    dto.status = result.status;
    dto.hours = result.hours;
    dto.serviceDate = result.serviceDate;
    dto.startTime = result.startTime;
    dto.endTime = result.endTime;
    dto.endsNextDay = result.endsNextDay;
    dto.price = result.price;
    dto.createdAt = result.createdAt;
    dto.updatedAt = result.updatedAt;
    return dto;
  }
}
