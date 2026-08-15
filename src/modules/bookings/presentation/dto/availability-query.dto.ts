import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

/** Query contract for listing bookable slots on a date. */
export class AvailabilityQueryDto {
  @ApiProperty({ example: '2026-07-28', description: 'The date to list slots for' })
  @IsDateString()
  date!: string;
}
