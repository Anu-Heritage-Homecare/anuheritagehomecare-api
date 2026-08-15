import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsUUID, Matches, Max, Min } from 'class-validator';

/** Request contract to create a Flexible hourly booking. */
export class CreateBookingRequestDto {
  @ApiProperty({ format: 'uuid', description: 'The care recipient to book care for' })
  @IsUUID('4')
  careRecipientId!: string;

  @ApiProperty({ example: 6, minimum: 3, maximum: 24, description: 'Hours per booking' })
  @IsInt()
  @Min(3)
  @Max(24)
  hours!: number;

  @ApiProperty({ example: '2026-07-28', description: 'Service date as an ISO calendar date' })
  @IsDateString()
  serviceDate!: string;

  @ApiProperty({ example: '09:00', description: 'Start time on the hour in HH:mm 24 hour format' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:mm' })
  startTime!: string;
}
