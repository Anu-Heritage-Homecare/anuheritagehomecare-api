import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const MINUTES_IN_DAY = 24 * 60;
const MAX_DURATION_MINUTES = 12 * 60;

/** Request to submit an additional care request for a care recipient. */
export class SubmitCareRequestDto {
  @ApiProperty({ example: 'Overnight care', maxLength: 100, description: 'The type of care' })
  @IsString()
  @MaxLength(100)
  careType!: string;

  @ApiProperty({ example: '2026-09-01', description: 'The requested day (YYYY-MM-DD)' })
  @IsISO8601()
  requestedDate!: string;

  @ApiProperty({
    minimum: 0,
    maximum: MINUTES_IN_DAY - 1,
    example: 540,
    description: 'Start time as minutes from midnight (09:00 is 540)',
  })
  @IsInt()
  @Min(0)
  @Max(MINUTES_IN_DAY - 1)
  startMinute!: number;

  @ApiProperty({
    minimum: 1,
    maximum: MAX_DURATION_MINUTES,
    example: 180,
    description: 'Duration in minutes',
  })
  @IsInt()
  @Min(1)
  @Max(MAX_DURATION_MINUTES)
  durationMinutes!: number;

  @ApiPropertyOptional({ maxLength: 1000, description: 'More about the request' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string | null;
}
