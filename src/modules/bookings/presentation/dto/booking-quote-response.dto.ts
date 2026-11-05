import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '@shared/domain/currency.enum';
import { BookingQuoteResult } from '../../application/dto/booking-quote.result';

/** HTTP response contract for a Flexible booking price quote (not persisted). */
export class BookingQuoteResponseDto {
  @ApiProperty()
  hours!: number;

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

  static fromResult(result: BookingQuoteResult): BookingQuoteResponseDto {
    const dto = new BookingQuoteResponseDto();
    dto.hours = result.hours;
    dto.currency = result.currency;
    dto.hourlyRateMinor = result.hourlyRateMinor;
    dto.subtotalMinor = result.subtotalMinor;
    dto.serviceFeeMinor = result.serviceFeeMinor;
    dto.totalMinor = result.totalMinor;
    return dto;
  }
}
